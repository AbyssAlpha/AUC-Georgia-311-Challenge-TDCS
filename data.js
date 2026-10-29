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
export const PIN = 'Near 5500 Mableton Pkwy';

const t = (who, text, date) => ({ from: 'staff', who, text, date });
const ev = (text, date) => ({ event: true, text, date });

export const SEED = [
  {
    id: 'MBL-2026-04815', name: 'Luis Ortega', email: 'l.ortega@email.com', phone: '(678) 555-0187', subject: 'Clogged storm drain',
    summary: 'Drain is covered in leaves and water pools across the road after rain.', location: 'Hurt Rd at Nickajack Rd', date: 'Oct 29', time: '8:12 AM',
    status: 'New', depts: ['pw'], photo: true, source: 'gemini',
    body: "Hello Public Works,\n\nThe storm drain on the corner is completely covered in leaves. After yesterday's rain the water pooled across both lanes.\n\nThank you,\nLuis Ortega",
    thread: [ev('Sent to Public Works', 'Oct 29')],
  },
  {
    id: 'MBL-2026-04809', name: 'Keisha Brown', email: 'keishab@email.com', phone: '(404) 555-0119', subject: 'Faded crosswalk by the elementary school',
    summary: 'Crosswalk paint is almost gone; kids cross here every morning.', location: 'Church St at Clay Rd', date: 'Oct 28', time: '4:55 PM',
    status: 'New', depts: ['pw'], photo: false, source: 'gemini',
    body: "Hello Public Works,\n\nThe crosswalk paint near the elementary school is almost gone. Kids cross here every morning and drivers don't seem to see it.\n\nThank you,\nKeisha Brown",
    thread: [ev('Sent to Public Works', 'Oct 28')],
  },
  {
    id: 'MBL-2026-04801', name: 'Andre Collins', email: 'acollins@email.com', phone: '(770) 555-0174', subject: 'Mattresses dumped behind the shopping center',
    summary: 'Three mattresses and bags of trash left by the back lot.', location: 'Behind 5300 Floyd Rd', date: 'Oct 28', time: '10:03 AM',
    status: 'New', depts: ['ce'], photo: true, source: 'gemini',
    body: 'Hello Code Enforcement,\n\nSomeone left three mattresses and several bags of trash behind the shopping center. It has been there since the weekend.\n\nThank you,\nAndre Collins',
    thread: [ev('Sent to Code Enforcement', 'Oct 28')],
  },
  {
    id: 'MBL-2026-04796', name: 'Tom Reilly', email: 'treilly@email.com', phone: '(770) 555-0163', subject: 'Stop sign knocked down',
    summary: 'Sign is lying in the grass after a storm.', location: 'Clay Rd at Bankhead Ave', date: 'Oct 27', time: '7:30 AM',
    status: 'In progress', depts: ['pw'], photo: true, source: 'keywords',
    body: 'Hello Public Works,\n\nThe stop sign at this corner was knocked down in the storm and is lying in the grass.\n\nThank you,\nTom Reilly',
    thread: [ev('Sent to Public Works', 'Oct 27'), t('Marcus Bell', 'Thanks, Tom. A crew has put up a temporary sign and the permanent one goes back up this week.', 'Oct 27'), ev('Status changed to In progress', 'Oct 27')],
  },
  {
    id: 'MBL-2026-04702', name: ME.name, email: ME.email, phone: ME.phone, subject: 'Streetlight out on Veterans Memorial Hwy',
    summary: 'Light at the bus stop has been out for two weeks.', location: 'Veterans Memorial Hwy at Old Powder Springs Rd', date: 'Oct 21', time: '6:02 PM',
    status: 'In progress', depts: ['pw'], photo: false, source: 'gemini', unread: true,
    body: "Hello Public Works,\n\nI'd like to report a problem. The streetlight at the bus stop on Veterans Memorial Hwy near Old Powder Springs Rd has been out for about two weeks. It's very dark there at night.\n\nThank you,\nDana Whitfield",
    thread: [
      ev('Sent to Public Works', 'Oct 21'),
      t('Marcus Bell', "Thanks for reporting this. This light is maintained by Georgia Power, so we've logged a repair request with them. We'll update you when a date is set.", 'Oct 22'),
      ev('Status changed to In progress', 'Oct 22'),
      t('Marcus Bell', 'Georgia Power has scheduled the repair for the week of November 2.', 'Oct 27'),
    ],
  },
  {
    id: 'MBL-2026-04688', name: 'Priya Nair', email: 'priya.nair@email.com', phone: '(470) 555-0108', subject: 'Cracked sidewalk',
    summary: 'Raised slab is a tripping hazard near the bus shelter.', location: '2900 Pisgah Rd', date: 'Oct 19', time: '11:20 AM',
    status: 'In progress', depts: ['pw'], photo: true, source: 'gemini',
    body: "Hello Public Works,\n\nA sidewalk slab has lifted about two inches near the bus shelter. I've seen two people trip on it.\n\nThank you,\nPriya Nair",
    thread: [ev('Sent to Public Works', 'Oct 19'), ev('Status changed to In progress', 'Oct 20')],
  },
  {
    id: 'MBL-2026-04650', name: 'Gerald Simms', email: 'gsimms@email.com', phone: '(678) 555-0131', subject: 'Pothole on Mableton Pkwy',
    summary: 'Deep pothole in the left turn lane.', location: 'Mableton Pkwy at Floyd Rd', date: 'Oct 14', time: '2:45 PM',
    status: 'Resolved', depts: ['pw'], photo: false, source: 'keywords',
    body: "Hello Public Works,\n\nThere's a deep pothole in the left turn lane.\n\nThank you,\nGerald Simms",
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
