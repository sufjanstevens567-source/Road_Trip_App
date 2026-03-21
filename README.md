# Road Trip Operating System

A desktop-first, local-first road trip planning and companion app. Designed first for a specific journey — Luxembourg to Sofia — but built to be repeatable for any multi-day road trip.

The app has two modes: **Planning Mode** for building and refining the trip at your desk, and **Trip Mode** for a focused, glanceable companion on the road.

---

## What it does

### Planning Mode (desktop-first)

A five-view planning desk accessible from a persistent left sidebar:

- **Route** — Manage your stop list, reorder stops, add new stops via city search (Nominatim/OpenStreetMap geocoding), and view the full route on an interactive map. Compliance score, total distance, total drive time, and per-day pacing are shown in the right panel.
- **Itinerary** — Day-by-day view with drive stats, pacing warnings, overnight stop, and inline stay details. Collapsible day cards with compliance warnings surfaced per day.
- **Stays & Budget** — Manage accommodation bookings (property, check-in/out, confirmation, parking notes, cost) alongside a full trip budget breakdown by category.
- **Prep** — Country-by-country compliance rules (vignettes, green cards, first aid kits, etc.) and a vehicle readiness checklist, feeding into an overall trip readiness score.
- **Notes** — Quick-capture notes scoped to the full trip, a specific day, or a specific stop.

### Trip Mode (mobile-first)

A three-tab companion view for use on the road:

- **Today** — Today's drive stats, overnight stop details, the next day's move, and any outstanding warnings.
- **Stays** — All accommodation at a glance with booking status and check-in details.
- **Trip** — Overall progress, map overview, and countries on the route.

### Trip lifecycle

Trips move through five states: `draft → planning → ready → active → completed`. The sidebar surfaces contextual actions at each stage — "Mark as Ready" when readiness reaches 80%, "Start Trip" to activate and switch to Trip Mode, "Finish trip" to close out a completed journey.

### Trip library

The home screen shows all trips as cards. New trips are created via a 4-step wizard: origin and destination (with geocoding), dates and max daily drive hours, optional waypoints, and trip details. The wizard auto-distributes legs across days based on your drive hour limit and optionally seeds country compliance rules for the countries on your route.

---

## Data model

Every entity is persisted locally via Zustand + `localStorage`. The core types are:

- **Trip** — name, origin, destination, dates, travelers, vehicle, currency, max drive hours/day, status
- **Stop** — name, country, coordinates, type (`origin / waypoint / destination`), `isAlternative` flag for route variants
- **Leg** — connects two stops, stores estimated distance, drive hours, countries crossed, toll and risk notes
- **Day** — date, day number, array of leg IDs, overnight stop, type, notes
- **Stay** — accommodation per stop: property, check-in/out, booking URL, confirmation, parking, cost (planned and actual)
- **CountryRule** — per-country compliance items (vignettes, green cards, equipment) with status tracking
- **ChecklistItem** — scoped to `trip`, `day:{id}`, or `stop:{id}`; categories include documents, vehicle, booking, health, finance
- **Note** — free-form notes optionally tied to a day or stop
- **BudgetLine** — categorised trip expenses; accommodation is sourced from Stay costs (no duplication)

---

## Country compliance database

Seeded rules for 15 European countries: Luxembourg, Germany, Austria, Switzerland, France, Belgium, Netherlands, Italy, Slovenia, Croatia, Hungary, Czech Republic, Serbia, Bulgaria, Poland. Each rule set covers motorway vignettes, green cards, warning triangles, first aid kits, breathalyser requirements, and country-specific items.

---

## Seed trip

The app ships with a Luxembourg → Sofia seed trip to demonstrate the full feature set:

- 8 stops: Luxembourg, Munich, Bohinj (alternative), Lake Bled (alternative), Ljubljana, Novi Sad, Belgrade, Sofia
- 6 legs across 9 days
- 5 stays, country rules for 5 countries, budget lines, notes, and checklist items
- Alternative stops are flagged with `isAlternative: true` rather than a hardcoded route variant system

---

## Stack

- **Next.js 16** App Router
- **React 19** + TypeScript
- **Tailwind CSS v4**
- **shadcn/ui** component primitives
- **Zustand** with `localStorage` persistence (schema version 3, auto-migration)
- **React Leaflet** + OpenStreetMap tiles (SSR-safe, loaded dynamically)
- **Nominatim** OpenStreetMap geocoding API (no API key required)
- **lucide-react** icons

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The seed trip loads automatically on first visit.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Root page — renders AppShell
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── app-shell.tsx         # Top-level router: library / planning / trip mode
│   ├── trip-library.tsx      # Home screen — trip cards + new trip button
│   ├── planning/
│   │   ├── planning-shell.tsx      # Desktop shell with sidebar + 5 views
│   │   ├── route-view.tsx          # Stop list, map, route details
│   │   ├── simple-route-map.tsx    # React Leaflet map component
│   │   ├── itinerary-view.tsx      # Day cards with pacing + stays
│   │   ├── stays-budget-view.tsx   # Accommodation + budget
│   │   ├── prep-view.tsx           # Country rules + vehicle checklist
│   │   └── notes-view.tsx          # Note capture and browser
│   ├── trip-mode/
│   │   ├── trip-mode-shell.tsx     # Mobile shell with bottom tabs
│   │   ├── today-screen.tsx        # Today's drive + overnight
│   │   ├── stays-tab.tsx           # Stays list
│   │   └── overview-tab.tsx        # Progress + map
│   ├── wizard/
│   │   └── trip-wizard.tsx         # 4-step new trip creation wizard
│   ├── shared/
│   │   └── ui-helpers.tsx          # StatusPill, ReadinessBar, EmptyState, SectionLead
│   └── ui/                         # shadcn/ui primitives
├── data/
│   ├── trip-seed.ts          # Luxembourg → Sofia seed trip
│   └── country-rules-db.ts   # 15-country compliance rule database
├── lib/
│   └── trip-utils.ts         # Selectors, drive stat calculations, readiness scoring
├── store/
│   └── trip-store.ts         # Zustand store with persist + migration
└── types/
    └── trip.ts               # All shared TypeScript types
```

---

## How to update the seed trip

Edit `src/data/trip-seed.ts` to change stops, legs, days, stays, country rules, budget lines, or notes. The store auto-migrates on load — if the schema version changes, the seed is reapplied.

---

## Design principles

- **Calm before density** — surface the right layer first, reveal detail deliberately.
- **Planning tool first, companion second** — expansive and editable at the desk; focused and glanceable on the road.
- **Local-first** — no backend, no auth, no sync. Everything lives in the browser.
- **Repeatable** — built for one trip, designed to work for any trip.

---

## Non-goals for the current phase

- Multi-user collaboration or cloud sync
- Live booking or navigation API integrations
- Turn-by-turn directions (the app links out to Google Maps)
- Native mobile app
