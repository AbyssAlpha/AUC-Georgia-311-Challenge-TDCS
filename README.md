# Mableton 311

A civic complaint app for the City of Mableton, Georgia. Built for the Georgia 311 Challenge, **Tiny Desk, Civic Style** track.

**Live demo:** _add your Vercel link here_

Mableton runs with a small staff of about 60 people. Every report that lands in the wrong inbox, or arrives missing a location, costs staff time. This app makes reports arrive already sorted and complete, and helps staff reply faster without taking people out of the loop.

| Resident app | Staff portal |
|---|---|
| ![Resident review screen](docs/resident-review.png) | ![Staff detail with AI draft](docs/staff-detail.png) |

## How it works

**Residents (mobile app, `/#/resident`)**

1. Describe the problem in plain words in a chat.
2. Gemini sorts it to the right department (Public Works, Code Enforcement, Parks & Recreation, Planning & Zoning, or City Clerk).
3. Add a location (home address, map pin, or typed address) and an optional photo.
4. Review the complaint the app wrote for them, change anything, and send it.
5. Track status and reply to staff in the same thread.

If the issue belongs to another agency (Cobb County Water, Cobb schools, property taxes, GDOT), the app says so and links there instead of sending it. If the message sounds like an emergency ("I smell gas"), the app stops and shows a Call 911 button.

**Staff (desktop portal, `/#/staff`)**

- One inbox per department, with filters and search.
- Open a report, click **Draft with Gemini**, then edit and send the reply. The resident sees it in the app.
- Mark resolved, reopen, or reassign to another department.

## Responsible AI

- **A human approves every message.** Gemini only sorts reports and drafts replies. Nothing reaches a resident until a staff member reviews it and clicks Send.
- **Emergencies never wait on AI.** Emergency words are checked on the phone itself before any AI call.
- **Always works.** If Gemini is not set up, slow, or over its free quota, the app falls back to keyword rules. Every screen shows whether Gemini or the keyword rules did the sorting.
- **The API key is never public.** It lives in a Vercel environment variable and is only used by the server functions in `/api`. It is not in the browser code or in this repo.
- **Public data only.** Department info and outside agencies come from public sources. Residents, addresses and complaints in the demo are made up.
- **Abuse limits.** Input length is capped, and each visitor is rate limited so the free quota can't be drained.

## Free to run

| Piece | Service | Cost |
|---|---|---|
| Hosting and server functions | Vercel Hobby | Free, no credit card |
| AI | Gemini API free tier (Google AI Studio key) | Free, no credit card |
| Data | Stored in the browser for the demo | Free |

## Deploy your own copy

1. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com).
2. Put this folder on GitHub (GitHub Desktop: **File > Add local repository**, then **Publish repository**, unchecking "Keep this code private").
3. Go to [vercel.com/new](https://vercel.com/new), import the repo, and keep the default settings (Vercel detects Vite).
4. Before clicking Deploy, open **Environment Variables** and add `GEMINI_API_KEY` with your key.
5. Click **Deploy**. Every push to `main` redeploys automatically.

## Run it locally

```bash
npm install
npm run dev          # app only, AI uses the keyword fallback
# or, with the AI routes:
npm i -g vercel
cp .env.example .env.local   # then paste your key
vercel dev
```

## Project layout

```
api/            Server functions (hold the Gemini key)
  triage.js       Sorts a report to a department, outside agency, or 911
  draft-reply.js  Drafts a staff reply for review
  _gemini.js      Shared Gemini call, input limits, rate limit
src/
  Resident.jsx    Resident mobile app
  Staff.jsx       Staff desktop portal
  ai.js           Calls /api and falls back to keyword rules
  data.js         Departments, outside agencies, keyword rules, sample data
  store.js        Demo data kept in the browser, synced across tabs
```

## Path to adoption

- **Pilot:** one department (Public Works) for 60 days, with staff using the portal next to their current inbox.
- **Before launch:** confirm the department list and outside agencies with the city, choose a residency check, and move storage from the browser to a city managed database.
- **Measure:** time to first reply, reports reassigned, and reports missing a location.

## Prototype limits

- Sign in and address verification are placeholders until the city picks a method.
- Demo data is stored in each browser. Use **Reset demo data** on the home page to start fresh.
- Photos and map pins are simulated.
