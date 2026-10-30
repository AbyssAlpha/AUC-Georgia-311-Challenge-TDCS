// City departments, outside agencies and keyword rules.
// Department list, staff names and street addresses are placeholders to confirm with the city.

export const DEPTS = [
  { id: 'pw', name: 'Public Works', staff: 'Marcus Bell', desc: 'Streets, potholes, sidewalks, traffic signs, streetlights and storm drains.', ex: 'pothole, broken sidewalk, clogged storm drain' },
  { id: 'ce', name: 'Code Enforcement', staff: 'Angela Price', desc: 'Upkeep of private property and violations of city code.', ex: 'overgrown lot, junk vehicle, illegal dumping' },
  { id: 'pr', name: 'Parks & Recreation', staff: 'Jordan Hayes', desc: 'City parks, playgrounds, trails, sports fields and programs.', ex: 'broken playground equipment, trail damage' },
  { id: 'pz', name: 'Planning & Zoning', staff: 'Renee Carter', desc: 'Land use, building permits and zoning rules.', ex: 'construction without a permit, business run from a home' },
  { id: 'cc', name: 'City Clerk', staff: 'Simone Lewis', desc: 'Public records, city council meetings and official notices.', ex: 'records request, council meeting question' },
];

export const OUTSIDE = [
  { id: 'water', re: /(water (bill|main|meter|pressure|service|line|leak)|sewer|no water)/i, short: 'Water & sewer', agency: 'Cobb County Water System', what: 'Water and sewer service in Mableton is handled by the Cobb County Water System.', url: 'https://www.cobbcounty.org/water' },
  { id: 'schools', re: /\b(school|schools|school bus)\b/i, short: 'Public schools', agency: 'Cobb County School District', what: 'Public schools and school buses are run by the Cobb County School District.', url: 'https://www.cobbk12.org' },
  { id: 'tax', re: /(property tax|tax bill|tax assess)/i, short: 'Property taxes', agency: 'Cobb County Tax Commissioner', what: 'Property taxes are handled by the Cobb County Tax Commissioner.', url: 'https://www.cobbtax.org' },
  { id: 'gdot', re: /(i-?285|i-?20\b|interstate)/i, short: 'Interstates & state highways', agency: 'Georgia Dept. of Transportation', what: 'Interstates and state highways are maintained by the Georgia Department of Transportation.', url: 'https://www.dot.ga.gov' },
];

// Emergencies are always caught on the device first, before any AI call.
export const EMERG = /(fire(?! hydrant)|smoke|smell(s|ing)? (of )?gas|gas (leak|smell)|break(ing)?[ -]?in|robb|shoot|\bgun|stab|crash|injur|bleed|unconscious|assault|in progress)/i;

const RULES = [
  ['pr', /\b(park|parks|playground|trail|swing|bench|ball ?field)\b/i],
  ['ce', /(grass|overgrown|weeds|junk|abandoned|dump|trash|litter|tires|mattress|vacant|yard)/i],
  ['pz', /(permit|zoning|construction)/i],
  ['cc', /(record|council|meeting|notice|agenda)/i],
  ['pw', /(pothole|road|street|sidewalk|light|sign|drain|flood|curb|crosswalk|traffic|lane)/i],
];

const LABELS = [
  [/pothole/i, 'Pothole'], [/light/i, 'Streetlight out'], [/sidewalk/i, 'Damaged sidewalk'], [/drain/i, 'Clogged storm drain'],
  [/flood/i, 'Street flooding'], [/sign/i, 'Damaged street sign'], [/crosswalk/i, 'Faded crosswalk'], [/(overgrown|grass|weeds)/i, 'Overgrown lot'],
  [/(abandoned|junk)/i, 'Abandoned vehicle'], [/(dump|trash|litter|tires|mattress)/i, 'Illegal dumping'], [/\b(playground|swing)\b/i, 'Playground repair'],
  [/\bpark\b/i, 'Park maintenance'], [/(permit|construction)/i, 'Possible unpermitted construction'], [/(record|council|meeting)/i, 'City Clerk request'],
];

export const deptName = (id) => (DEPTS.find((d) => d.id === id) || { name: 'City of Mableton' }).name;
export const deptNames = (ids) => ids.map(deptName);
export const joinList = (a) => (a.length < 2 ? a[0] || '' : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

// Offline sorter. Used when Gemini is not configured, slow, or over its free quota.
export function keywordTriage(text) {
  if (EMERG.test(text)) return { type: 'emergency', source: 'keywords' };
  const o = OUTSIDE.find((x) => x.re.test(text));
  if (o) return { type: 'oos', agency: o.id, source: 'keywords' };
  let depts = RULES.filter((r) => r[1].test(text)).map((r) => r[0]).slice(0, 2);
  if (!depts.length) depts = ['pw'];
  const l = LABELS.find((x) => x[0].test(text));
  const summary = text.trim().slice(0, 110);
  return { type: 'ok', depts, label: l ? l[1] : 'Issue report', summary, source: 'keywords' };
}

export const ME = { name: 'Dana Whitfield', email: 'dana.whitfield@email.com', phone: '(470) 555-0142', home: '4410 Floyd Rd' };

const t = (who, text, date) => ({ from: 'staff', who, text, date });
const ev = (text, date) => ({ event: true, text, date });

export const SEED = [
  {
    id: 'MBL-2026-04815', name: 'Luis Ortega', email: 'l.ortega@email.com', phone: '(678) 555-0187', subject: 'Clogged storm drain',
    summary: 'Drain is covered in leaves and water pools across the road after rain.', location: 'Hurt Rd', coords: { lat: 33.86421, lng: -84.58444 }, date: 'Oct 29', time: '8:12 AM',
    status: 'New', depts: ['pw'], photo: true, source: 'gemini',
    body: "Hello Public Works,\n\nThe storm drain on the corner is completely covered in leaves. After yesterday's rain the water pooled across both lanes.\n\nThank you,\nLuis Ortega",
    share: { asked: true, set: 'stillbroken', civic: [], source: 'gemini' }, shared: true, reactions: { still: 4, fixed: 0 },
    thread: [ev('Sent to Public Works', 'Oct 29')],
  },
  {
    id: 'MBL-2026-04809', name: 'Keisha Brown', email: 'keishab@email.com', phone: '(404) 555-0119', subject: 'Faded crosswalk by the elementary school',
    summary: 'Crosswalk paint is almost gone; kids cross here every morning.', location: 'Church St at Clay Rd', coords: { lat: 33.82633, lng: -84.58185 }, date: 'Oct 28', time: '4:55 PM',
    status: 'New', depts: ['pw'], photo: false, source: 'gemini',
    body: "Hello Public Works,\n\nThe crosswalk paint near the elementary school is almost gone. Kids cross here every morning and drivers don't seem to see it.\n\nThank you,\nKeisha Brown",
    share: { asked: true, set: 'civic', civic: ['unsafe', 'kids', 'traffic'], source: 'gemini' }, shared: true, reactions: { unsafe: 9, kids: 12, traffic: 3 },
    thread: [ev('Sent to Public Works', 'Oct 28')],
  },
  {
    id: 'MBL-2026-04801', name: 'Andre Collins', email: 'acollins@email.com', phone: '(770) 555-0174', subject: 'Mattresses dumped behind the shopping center',
    summary: 'Three mattresses and bags of trash left by the back lot.', location: 'Behind 5300 Old Floyd Rd', coords: { lat: 33.82533, lng: -84.57718 }, date: 'Oct 28', time: '10:03 AM',
    status: 'New', depts: ['ce'], photo: true, source: 'gemini',
    body: 'Hello Code Enforcement,\n\nSomeone left three mattresses and several bags of trash behind the shopping center. It has been there since the weekend.\n\nThank you,\nAndre Collins',
    thread: [ev('Sent to Code Enforcement', 'Oct 28')],
  },
  {
    id: 'MBL-2026-04796', name: 'Tom Reilly', email: 'treilly@email.com', phone: '(770) 555-0163', subject: 'Stop sign knocked down',
    summary: 'Sign is lying in the grass after a storm.', location: 'Clay Rd at Bankhead Ave', date: 'Oct 27', time: '7:30 AM',
    status: 'In progress', depts: ['pw'], photo: true, source: 'keywords',
    body: 'Hello Public Works,\n\nThe stop sign at this corner was knocked down in the storm and is lying in the grass.\n\nThank you,\nTom Reilly',
    share: { asked: true, set: 'civic', civic: ['unsafe', 'traffic'], source: 'keywords' }, shared: true, reactions: { unsafe: 5, traffic: 2 },
    thread: [ev('Sent to Public Works', 'Oct 27'), t('Marcus Bell', 'Thanks, Tom. A crew has put up a temporary sign and the permanent one goes back up this week.', 'Oct 27'), ev('Status changed to In progress', 'Oct 27')],
  },
  {
    id: 'MBL-2026-04702', name: ME.name, email: ME.email, phone: ME.phone, subject: 'Streetlight out on Veterans Memorial Hwy',
    summary: 'Light at the bus stop has been out for two weeks.', location: 'Veterans Memorial Hwy at Old Powder Springs Rd', coords: { lat: 33.81624, lng: -84.59171 }, date: 'Oct 21', time: '6:02 PM',
    status: 'In progress', depts: ['pw'], photo: false, source: 'gemini', unread: true,
    body: "Hello Public Works,\n\nI'd like to report a problem. The streetlight at the bus stop on Veterans Memorial Hwy near Old Powder Springs Rd has been out for about two weeks. It's very dark there at night.\n\nThank you,\nDana Whitfield",
    share: { asked: true, set: 'stillbroken', civic: [], source: 'gemini' }, shared: true, reactions: { still: 7, fixed: 1 },
    thread: [
      ev('Sent to Public Works', 'Oct 21'),
      t('Marcus Bell', "Thanks for reporting this. This light is maintained by Georgia Power, so we've logged a repair request with them. We'll update you when a date is set.", 'Oct 22'),
      ev('Status changed to In progress', 'Oct 22'),
      t('Marcus Bell', 'Georgia Power has scheduled the repair for the week of November 2.', 'Oct 27'),
    ],
  },
  {
    id: 'MBL-2026-04688', name: 'Priya Nair', email: 'priya.nair@email.com', phone: '(470) 555-0108', subject: 'Cracked sidewalk',
    summary: 'Raised slab is a tripping hazard near the bus shelter.', location: 'Pisgah Rd', coords: { lat: 33.80911, lng: -84.57779 }, date: 'Oct 19', time: '11:20 AM',
    status: 'In progress', depts: ['pw'], photo: true, source: 'gemini',
    body: "Hello Public Works,\n\nA sidewalk slab has lifted about two inches near the bus shelter. I've seen two people trip on it.\n\nThank you,\nPriya Nair",
    thread: [ev('Sent to Public Works', 'Oct 19'), ev('Status changed to In progress', 'Oct 20')],
  },
  {
    id: 'MBL-2026-04650', name: 'Gerald Simms', email: 'gsimms@email.com', phone: '(678) 555-0131', subject: 'Pothole on Mableton Pkwy',
    summary: 'Deep pothole in the left turn lane.', location: 'Mableton Pkwy', coords: { lat: 33.81785, lng: -84.57593 }, date: 'Oct 14', time: '2:45 PM',
    status: 'Resolved', depts: ['pw'], photo: false, source: 'keywords',
    body: "Hello Public Works,\n\nThere's a deep pothole in the left turn lane.\n\nThank you,\nGerald Simms",
    share: { asked: true, set: 'metoo', civic: [], source: 'gemini' }, shared: true, reactions: { seen: 14, thanks: 6 },
    thread: [ev('Sent to Public Works', 'Oct 14'), t('Marcus Bell', 'This was patched this morning. Thanks for letting us know.', 'Oct 16'), ev('Marked resolved by Marcus Bell', 'Oct 16')],
  },
  {
    id: 'MBL-2026-04533', name: ME.name, email: ME.email, phone: ME.phone, subject: 'Overgrown lot on Daniell Dr',
    summary: 'Vacant lot with tall grass and trash on the sidewalk.', location: 'Next to 1180 Daniell Dr', date: 'Oct 9', time: '3:15 PM',
    status: 'Resolved', depts: ['ce'], photo: true, source: 'keywords',
    body: "Hello Code Enforcement,\n\nI'd like to report a problem. The vacant lot next to 1180 Daniell Dr has grass over three feet high and trash piling up along the sidewalk.\n\nThank you,\nDana Whitfield",
    thread: [
      ev('Sent to Code Enforcement', 'Oct 9'),
      t('Angela Price', 'An officer inspected the lot today and issued a notice to the owner, who has 10 days to clean it up.', 'Oct 10'),
      t('Angela Price', 'The owner has mowed the lot and removed the trash. Closing this out. Thank you for helping keep Mableton clean.', 'Oct 22'),
      ev('Marked resolved by Angela Price', 'Oct 22'),
    ],
  },
];

// Sample staff alerts so the city map has something to show. Made up, marked as samples, and they expire.
export const seedAlerts = (now) => [
  { id: 'AL-1', type: 'gas', note: 'Atlanta Gas Light crew on site. Keep crews out until the all clear.', coords: { lat: 33.8238, lng: -84.5789 }, radius: 300, by: 'Marcus Bell', posted: now, until: now + 6 * 3600e3, sample: true },
  { id: 'AL-2', type: 'police', note: 'Police activity near the bus stop. Hold non urgent visits.', coords: { lat: 33.8168, lng: -84.5905 }, radius: 250, by: 'Angela Price', posted: now, until: now + 3 * 3600e3, sample: true },
];

// Neighbors feed. Categories residents pick from, plus "Other" for their own.
export const POST_CATS = [
  { id: 'missing-person', label: 'Missing person', color: '#A3261C' },
  { id: 'lost-pet', label: 'Lost pet', color: '#B45309' },
  { id: 'found-pet', label: 'Found pet', color: '#2F7D5B' },
  { id: 'suspicious', label: 'Suspicious activity', color: '#6B3FA0' },
  { id: 'crime', label: 'Crime and safety', color: '#9F1239' },
  { id: 'lost-found', label: 'Lost and found items', color: '#1F4E7A' },
  { id: 'traffic', label: 'Roads and traffic', color: '#7A4E0E' },
  { id: 'power', label: 'Power and utilities', color: '#0E7490' },
  { id: 'weather', label: 'Weather and storms', color: '#475569' },
  { id: 'events', label: 'Events', color: '#1E5C4A' },
  { id: 'recs', label: 'Recommendations', color: '#4D7C0F' },
  { id: 'free', label: 'Free and for sale', color: '#A16207' },
  { id: 'help', label: 'Help and volunteering', color: '#BE185D' },
  { id: 'general', label: 'General', color: '#3B4440' },
];
export const OTHER_CAT = { id: 'other', label: 'Other', color: '#4F5854' };
export const REPORT_REASONS = ['Harassment or hate', 'Profiling or discrimination', 'False or misleading', 'Shares private information', 'Threats or violence', 'Spam or scam', 'Something else'];
export const HIDE_AT = 3; // reports from different neighbors before a post is hidden until staff review it

const c = (id, by, text, date, extra = {}) => ({ id, by, text, date, reports: [], status: 'live', ...extra });
const r = (by, reason, date, note = '') => ({ by, reason, note, date });

export const SEED_POSTS = [
  {
    id: 'P-1009', by: 'Keisha B.', email: 'keishab@email.com', area: 'Church St area', cat: 'lost-pet', date: 'Oct 29', time: '7:40 PM',
    text: 'Our dog Biscuit slipped out of the yard this evening. Small tan terrier mix, red collar with tags. Very friendly but scared of cars. Please call or message if you see him!',
    tags: ['biscuit', 'dog', 'churchst'], reports: [], status: 'live',
    comments: [c('C-1', 'Luis O.', 'Saw a small tan dog near the elementary school about 20 minutes ago, heading toward Clay Rd.', 'Oct 29'), c('C-2', 'Keisha B.', 'Thank you so much! Heading there now.', 'Oct 29')],
  },
  {
    id: 'P-1008', by: 'Tom R.', email: 'treilly@email.com', area: 'Clay Rd', cat: 'traffic', date: 'Oct 29', time: '7:05 AM',
    text: 'Heads up, a tree is down across one lane on Clay Rd after the storm. Drive slow, especially at night.',
    tags: ['storm', 'clayrd'], reports: [], status: 'live', comments: [c('C-3', 'Priya N.', 'Reported it to the city through Civi too.', 'Oct 29')],
  },
  {
    id: 'P-1007', by: 'Priya N.', email: 'priya.nair@email.com', area: 'Pisgah Rd', cat: 'lost-found', date: 'Oct 28', time: '5:30 PM',
    text: 'Found a set of car keys with a blue lanyard at the bus shelter. Describe the keychain to claim them.',
    tags: ['keys', 'found'], reports: [], status: 'live', comments: [],
  },
  {
    id: 'P-1006', by: 'Gerald S.', email: 'gsimms@email.com', area: 'Mableton Pkwy', cat: 'suspicious', date: 'Oct 28', time: '11:15 PM',
    text: 'Someone walking down our street checking car door handles around 11pm. Gray hoodie, carrying a backpack. Lock your cars and check your cameras.',
    tags: ['lockyourcar'], reports: [], status: 'live', comments: [c('C-4', 'Andre C.', 'Thanks. I filed a report with Cobb County Police too.', 'Oct 29')],
  },
  {
    id: 'P-1005', by: 'Andre C.', email: 'acollins@email.com', area: 'Floyd Rd', cat: 'other', custom: 'Garden club', date: 'Oct 27', time: '2:10 PM',
    text: 'Starting a community garden club! First meetup Saturday at 10am at the library. Bring seeds to swap.',
    tags: ['garden', 'meetup'], reports: [], status: 'live', comments: [],
  },
  {
    id: 'P-1004', by: 'Sam K.', email: 'samk@email.com', area: 'Veterans Memorial Hwy', cat: 'free', date: 'Oct 27', time: '9:00 AM',
    text: 'GUARANTEED $500 a day working from home!!! DM me your bank info to get started today.',
    tags: ['money'], status: 'live',
    reports: [r('l.ortega@email.com', 'Spam or scam', 'Oct 27', 'Asking people for bank info.'), r('keishab@email.com', 'Spam or scam', 'Oct 27')],
    comments: [c('C-5', 'Luis O.', 'This is a scam, do not send anything.', 'Oct 27'), c('C-6', 'Sam K.', 'Mind your business, idiot.', 'Oct 27', { reports: [r('l.ortega@email.com', 'Harassment or hate', 'Oct 27')] })],
  },
];

// Community reactions on shared city reports. One set per post, picked by the resident.
export const REACTIONS = {
  seen: { label: "I've seen this too", icon: 'eye' },
  still: { label: 'Still there', icon: 'alert' },
  fixed: { label: 'Looks fixed', icon: 'check' },
  unsafe: { label: 'Unsafe', icon: 'shield' },
  kids: { label: 'Kids use this', icon: 'child' },
  sidewalk: { label: 'Blocks the sidewalk', icon: 'walk' },
  business: { label: 'Hurts local businesses', icon: 'store' },
  traffic: { label: 'Slows traffic', icon: 'car' },
  thanks: { label: 'Thank the crew', icon: 'heart' },
};
export const CIVIC = ['unsafe', 'kids', 'sidewalk', 'business', 'traffic'];
export const CIVIC_LABELS = CIVIC.map((k) => REACTIONS[k].label);
export const REACTION_SETS = {
  metoo: { name: "I've seen this too", desc: 'Shows staff how many people a problem affects.', buttons: ['seen'] },
  stillbroken: { name: 'Still there or fixed', desc: 'For problems that come back or drag on.', buttons: ['still', 'fixed'] },
  civic: { name: 'Why it matters', desc: 'For safety and access problems. Pick up to 3.', buttons: null },
};
export const setButtons = (set, civic) => (set === 'civic' ? (civic || []).filter((k) => CIVIC.includes(k)).slice(0, 3) : REACTION_SETS[set]?.buttons || ['seen']);
export const postButtons = (c) => [...setButtons(c.share?.set, c.share?.civic), ...(c.status === 'Resolved' ? ['thanks'] : [])];
export const reactionCount = (c, k) => (c.reactions?.[k] || 0) + (c.taps?.[k]?.length || 0);

// Code Enforcement reports are about a specific private property, so they are never shared.
export const canShare = (c) => !c.depts.includes('ce');

// What the feed may show. Never a name, email, phone, or house number.
const stripNumbers = (s) => s.replace(/\b\d{1,6}[A-Za-z]?\s+(?=[A-Za-z])/g, '').replace(/\s{2,}/g, ' ').trim();
export function publicBlock(location = '') {
  if (/-?\d+\.\d+\s*,\s*-?\d+\.\d+/.test(location)) return 'Mableton';
  return stripNumbers(location.replace(/^(near|behind|next to|by)\s+/i, '')) || 'Mableton';
}
export const publicTitle = (subject = '') => stripNumbers(subject);

// Offline reaction suggestion. Used when Gemini is not configured, slow, or over quota.
const SAFETY = /(crosswalk|school|sidewalk|unsafe|dark|kids?|children)/i;
const RECURRING = /(again|still|drain|flood|every time|light)/i;
export function keywordReactions({ issue = '', label = '' }) {
  const t = issue + ' ' + label;
  if (SAFETY.test(t)) {
    const civic = ['unsafe'];
    if (/(school|kids?|children)/i.test(t)) civic.push('kids');
    if (/(sidewalk|crosswalk)/i.test(t)) civic.push('sidewalk');
    if (civic.length < 2) civic.push('traffic');
    return { set: 'civic', civic: civic.slice(0, 3), reason: 'This is a safety issue, so neighbors can show why it matters and who it affects.', source: 'keywords' };
  }
  if (RECURRING.test(t)) return { set: 'stillbroken', civic: [], reason: 'Problems like this can come back, so neighbors can say if it is still there or looks fixed.', source: 'keywords' };
  return { set: 'metoo', civic: [], reason: 'Neighbors can confirm they have seen this too, which shows the city how many people it affects.', source: 'keywords' };
}
