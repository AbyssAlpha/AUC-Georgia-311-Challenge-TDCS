// Real maps for pins. Free to run: Leaflet with OpenStreetMap tiles, no API key.
// Addresses for a pin come from OpenStreetMap's Nominatim service (max 1 lookup per second).
// Leaflet only loads the first time a map is shown, so the rest of the app stays small.
import React, { useEffect, useRef, useState } from 'react';

export const MABLETON = { lat: 33.8187, lng: -84.5824 };
const AREA = { s: 33.76, n: 33.88, w: -84.67, e: -84.5 };
export const nearMableton = (p) => p.lat > AREA.s && p.lat < AREA.n && p.lng > AREA.w && p.lng < AREA.e;
export const fmtCoords = (p) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

export function googleMapsUrl(c) {
  const q = c.coords ? `${c.coords.lat},${c.coords.lng}` : `${c.location}, Mableton, GA 30126`;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

let leaflet;
const loadLeaflet = () => (leaflet ||= Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  .then(([m]) => m.default || m)
  .catch((e) => { leaflet = null; throw e; }));

let lastLookup = 0;
export async function lookupAddress(p, signal) {
  const wait = lastLookup + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  if (signal?.aborted) return null;
  lastLookup = Date.now();
  const ac = new AbortController();
  signal?.addEventListener('abort', () => ac.abort());
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=${p.lat}&lon=${p.lng}`, { signal: ac.signal });
    if (!res.ok) return null;
    const a = (await res.json()).address || {};
    if (!a.road) return null;
    return 'Near ' + (a.house_number ? a.house_number + ' ' : '') + a.road;
  } catch { return null; } finally { clearTimeout(timer); }
}

// Staff alerts for areas crews should stay clear of. Posted by staff, never by AI, never shown to residents.
export const ALERT_TYPES = {
  gas: { label: 'Gas leak', color: '#A3261C' },
  fire: { label: 'Active fire', color: '#C2410C' },
  police: { label: 'Police activity', color: '#1F4E7A' },
  hazard: { label: 'Unsafe area', color: '#7A4E0E' },
};
export const STATUS_COLORS = { New: '#1F4E7A', 'In progress': '#B7791F', Resolved: '#2F7D5B' };
export const liveAlerts = (alerts = [], now = Date.now()) => alerts.filter((a) => a.until > now);

const toRad = (d) => (d * Math.PI) / 180;
export function metersApart(a, b) {
  const x = toRad(b.lng - a.lng) * Math.cos(toRad((a.lat + b.lat) / 2));
  const y = toRad(b.lat - a.lat);
  return Math.sqrt(x * x + y * y) * 6371000;
}
export const alertsNear = (coords, alerts) => (coords ? alerts.filter((a) => metersApart(coords, a.coords) <= a.radius) : []);

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  Object.assign(n, attrs);
  kids.forEach((k) => n.append(k));
  return n;
}

// Every report with a pin, colored by status, plus staff alert circles. placing: show a center pin for a new alert.
// Residents only ever see a pin rounded to about one block (3 decimals is roughly 100 m), never the exact spot.
export const blockCoords = (p) => ({ lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 });

export function CityMap({ reports, alerts, onOpen, placing, onCenter, height = 460 }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const L = useRef(null);
  const fns = useRef({});
  fns.current = { onOpen, onCenter };
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((Lf) => {
      if (dead || !box.current) return;
      L.current = Lf;
      const m = Lf.map(box.current, { center: [MABLETON.lat, MABLETON.lng], zoom: 13 });
      m.attributionControl.setPrefix(false);
      Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
      m.on('moveend', () => { const c = m.getCenter(); fns.current.onCenter?.({ lat: c.lat, lng: c.lng }); });
      layer.current = Lf.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    }).catch(() => !dead && setFailed(true));
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []);

  const fitted = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const Lf = L.current;
    if (!fitted.current && reports.length) {
      fitted.current = true;
      map.current.fitBounds(Lf.latLngBounds(reports.map((c) => [c.coords.lat, c.coords.lng])), { padding: [40, 40], maxZoom: 15 });
    }
    layer.current.clearLayers();
    alerts.forEach((a) => {
      const t = ALERT_TYPES[a.type] || ALERT_TYPES.hazard;
      Lf.circle([a.coords.lat, a.coords.lng], { radius: a.radius, color: t.color, weight: 2, fillColor: t.color, fillOpacity: 0.18, dashArray: '6 4' })
        .bindPopup(el('div', { className: 'map-pop' }, el('b', { textContent: t.label }), el('span', { textContent: a.note }), el('small', { textContent: `Posted by ${a.by}${a.sample ? ' · sample' : ''}` })))
        .addTo(layer.current);
    });
    reports.forEach((c) => {
      const color = STATUS_COLORS[c.status] || STATUS_COLORS.New;
      const pop = c.pop || { title: c.subject, line: `${c.status} · ${c.location}`, small: c.id };
      const kids = [el('b', { textContent: pop.title }), el('span', { textContent: pop.line }), el('small', { textContent: pop.small })];
      if (fns.current.onOpen) {
        const btn = el('button', { className: 'btn sm', textContent: 'Open report', type: 'button' });
        btn.addEventListener('click', () => fns.current.onOpen?.(c.id));
        kids.push(btn);
      }
      Lf.marker([c.coords.lat, c.coords.lng], {
        title: `${pop.title}, ${c.status}`,
        icon: Lf.divIcon({ className: 'dot-mark', html: `<span style="background:${color}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
      }).bindPopup(el('div', { className: 'map-pop' }, ...kids))
        .addTo(layer.current);
    });
  }, [ready, reports, alerts]);

  if (failed) return <div className="map-art map-off" style={{ height }}><span>Map needs a connection</span></div>;
  return (
    <div className="map-wrap" style={{ height, borderRadius: 12, border: '1px solid var(--line)' }}>
      <div ref={box} className="map-box" role="application" aria-label={(alerts.length ? 'City map of reports and alerts.' : 'City map of reports.') + ' Use the arrow keys to move and Tab to reach each pin.'} />
      {placing && <div className="pin-mark center" aria-hidden="true" />}
    </div>
  );
}

// pin: where the marker sits. picker: the map moves under a fixed center pin and reports where it stopped.
export function MapView({ pin, picker, onMove, goTo, height = 160, label, zoom = 16 }) {
  const box = useRef(null);
  const map = useRef(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !box.current) return;
      const start = pin || MABLETON;
      const m = L.map(box.current, {
        center: [start.lat, start.lng], zoom, attributionControl: true, zoomControl: !!picker,
        dragging: !!picker, touchZoom: !!picker, scrollWheelZoom: !!picker, doubleClickZoom: !!picker, boxZoom: false, keyboard: !!picker,
      });
      m.attributionControl.setPrefix(false);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
      if (picker) {
        const report = () => { const c = m.getCenter(); moveRef.current?.({ lat: c.lat, lng: c.lng }); };
        m.on('moveend', report);
        m.on('click', (e) => m.panTo(e.latlng));
        report();
      } else if (pin) {
        L.marker([pin.lat, pin.lng], { icon: L.divIcon({ className: 'pin-mark', iconSize: [18, 18], iconAnchor: [9, 24] }), keyboard: false, interactive: false }).addTo(m);
      }
      map.current = m;
    }).catch(() => !dead && setFailed(true));
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => { if (goTo && map.current) map.current.setView([goTo.lat, goTo.lng], 17); }, [goTo]);

  if (failed) return <div className="map-art map-off" style={{ height }}><span>Map needs a connection</span></div>;
  return (
    <div className="map-wrap" style={{ height }}>
      <div ref={box} className="map-box" role={picker ? 'application' : 'img'} aria-label={label || (pin ? 'Map pin at ' + fmtCoords(pin) : 'Map')} />
      {picker && <div className="pin-mark center" aria-hidden="true" />}
    </div>
  );
}
