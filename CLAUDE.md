# Civi

Civi is a CivIQ product. CivIQ connects residents with their elected officials; Civi connects them with their city services. This repo is the Civi pilot for the City of Mableton, Georgia, built by Cameron Cannon's team (Team 3) for the Georgia 311 Challenge, **Tiny Desk, Civic Style** track.

## Challenge rules (do not break these)

- **Free to run.** Only free tiers: Vercel Hobby and the Gemini API free tier from Google AI Studio. No paid services, no credit cards. Do not add Firebase Functions (needs the paid Blaze plan) or any paid database.
- **Public data only.** No private city data. All residents, addresses and complaints in `src/shared/data.js` are made up.
- **Human in the loop.** AI may sort reports and draft replies, but nothing reaches a resident until a staff member reviews it and clicks Send. Never add auto sending.
- **API key best practices.** `GEMINI_API_KEY` lives only in Vercel environment variables and is read only by `/api` server functions. Never put it in `src/`, never commit `.env` files.
- Judging criteria: civic impact, working prototype, equity and accessibility, responsible data use, feasibility and cost, communication.

## Design system

- Logo: the "Chat C" mark in `src/shared/Logo.jsx` (C shaped speech bubble, gold dot is Civi listening). Use `<Logo />` and `<Wordmark />`, never redraw it.
- Colors match CivIQ: navy `#0A0E1A`, electric blue `#1D6FE8` (all actions and buttons), cream `#F6F3EC` page background. Civi's own accent is gold `#F2C46D`, used only for things Civi or AI did ("Sorted by Civi", drafts, the context banner) and for new items.
- Fonts match CivIQ: Playfair Display for h1 and h2, DM Sans for everything else.
- Staff portal uses a navy sidebar so it feels official; the resident app stays light and friendly.
- Resident chat is a rich chat plus guided steps: Civi header with a 4 step progress bar (issue, place, photo, review), a gold context banner once sorted, a map confirmation card, inline photos, and big answer cards for location and photo. Location options are my address, drop a pin, use where I am now (browser geolocation), and type an address.
- Label AI work as Civi but keep Gemini visible for transparency, like "Sorted by Civi · Gemini".

## Stack

- Layout: `src/resident/` (resident app), `src/staff/` (staff portal and `Moderation.jsx`), `src/community/` (Community tab), `src/shared/` (ai, data, store, map, reactions, install button used by both). `extras/` holds teammate files the app does not use.
- Vite + React 18, plain CSS (`src/styles.css`, design tokens on `:root`). No router library; hash routes `#/`, `#/resident`, `#/staff` in `src/App.jsx`.
- Vercel serverless functions in `/api` (Node, ESM). Files starting with `_` are helpers, not routes.
- Gemini via REST (`api/_gemini.js`), model from `GEMINI_MODEL` or `gemini-flash-latest`, JSON output with a response schema.
- Demo data in browser localStorage (`src/shared/store.js`, key `civi.mableton.v3`), synced across tabs so the resident app and staff portal update each other.
- Installable web app: `public/manifest.webmanifest`, `public/sw.js` (never caches `/api`), icons in `public/icons/`, install button in `src/shared/install.jsx`.
- Maps in `src/shared/map.jsx`: Leaflet + OpenStreetMap tiles (no key) and Nominatim reverse lookup (keep it to 1 request per second, only on pin moves). Leaflet is loaded lazily. Do not switch to Google Maps JS (needs a billing account); link out to Google Maps instead.

## Key behavior to preserve

- `src/shared/ai.js` `triage()`: emergency regex runs on the device **before** any AI call; if `/api/triage` fails, times out (7s), or returns something invalid, fall back to `keywordTriage()` in `src/shared/data.js`. The UI always labels whether Gemini or keywords did the sorting.
- `draftStaffReply()` falls back to a template when AI is unavailable. Drafts appear in a dashed "AI draft" box; staff click "Use and edit" then "Send reply".
- `/api` routes cap input length and rate limit per IP (20 per minute).
- Out of scope issues (water, schools, property tax, GDOT) point to the outside agency and send nothing.
- Staff alerts (areas of concern) are posted by staff only, expire, and are never shown to residents or created by AI. Emergencies are never collected; the 911 screen comes first.
- Community feed: a city report is shown only if the resident ticked share (`share.asked`) AND staff turned on `shared`. Show only `publicTitle`, `publicBlock` (no house numbers), department, status, date. Never name, email, phone or address. `canShare()` blocks Code Enforcement reports. The resident Community Map is view only, shows the same shared reports with pins rounded by `blockCoords()` (about one block), and never shows staff alerts.
- Reaction sets are fixed: metoo, stillbroken, civic (2 or 3 of the 5 CIVIC labels). Thank the crew is added automatically when Resolved. `/api/suggest-reactions` and `suggestReactions()` (6s timeout) must validate against the fixed lists; fallback is `keywordReactions()`. Label source as "Suggested by Civi" (Gemini) or "Suggested by keyword rules".
- Resident posts: residents report posts and comments; staff keep or take down with a reason. 3 reports from different people hide a post until staff review. AI never moderates.

## Commands

```bash
npm install
npm run dev      # app only; AI falls back to keywords
npm run build    # must pass before pushing
vercel dev       # app + /api, needs GEMINI_API_KEY in .env.local
```

Deploy: push to `main` on GitHub; Vercel redeploys automatically. The live repo is `AbyssAlpha/AUC-Georgia-311-Challenge-TDCS` (Cameron). The team repo is `TNT-A/AUC-Georgia-311-Challenge-TDCS`; this repo is not a GitHub fork of it, so teammate changes are copied over by hand.

## Writing style for all user facing copy and docs

- No em dashes or en dashes anywhere. Use commas, periods, or parentheses.
- Plain, warm, short sentences. Sentence case for buttons and headings.
- Always call the people who use the app "residents". Never "citizens", "users", "neighbors", or "constituents" in user facing copy. Civi serves everyone who lives in Mableton, regardless of citizenship.
- Accessibility matters (equity is a judging criterion): real labels on inputs, visible focus, 16px+ inputs on mobile, no horizontal scroll at 390px wide.

## Status

- Done: resident chat flow, review and send, complaint threads, departments page, staff inbox per department with search, filters, Gemini drafted replies, resolve, reopen, reassign, installable app with offline shell, real map pins, staff city map with status pins and staff alerts, Community tab (shared city reports with reaction sets, a view only map of them and Thank the crew, resident posts with categories, custom categories, tags, comments, reporting), AI suggested reactions with keyword fallback, staff share toggle and community moderation.
- Placeholders: sign in and residency verification are simulated. Photos show on the device but are not uploaded or saved with the report.
- Roadmap after Demo Day: wrap the Vite build with Capacitor for the App Store and Google Play (reuses these React screens as is; Expo would mean rewriting them in React Native). Android builds in Android Studio on Windows; iOS needs a Mac with Xcode. Apple rejects plain website wrappers, so add native features first: push notifications for staff replies and real camera photos. Also move storage to a real database and add real auth.
- Other deliverables (not in this repo): two page project brief, demo video, path to adoption plan. The README has a starter adoption plan.
