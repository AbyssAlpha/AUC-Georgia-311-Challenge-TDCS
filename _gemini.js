// Server only. Files starting with "_" are not exposed as routes on Vercel.
// The key comes from an environment variable and is never sent to the browser.

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Small per instance rate limit so one visitor cannot burn the free quota.
const hits = new Map();
export function rateLimited(req, max = 20, windowMs = 60_000) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}

export function guard(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return false; }
  if (!process.env.GEMINI_API_KEY) { res.status(503).json({ error: 'AI not configured' }); return false; }
  if (rateLimited(req)) { res.status(429).json({ error: 'Too many requests' }); return false; }
  return true;
}

export async function gemini({ system, user, schema, temperature = 0.2 }) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
    }),
  });
  if (!r.ok) throw new Error('Gemini HTTP ' + r.status);
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
  return JSON.parse(text);
}

export const clip = (s, n) => String(s || '').slice(0, n);
