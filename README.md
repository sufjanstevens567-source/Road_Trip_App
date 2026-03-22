# Road Trip Operating System

A desktop-first, local-first road trip planning and travel companion app for long multi-day drives across Europe.

The project started with a Luxembourg to Sofia trip and now serves as a reusable planning desk for route design, day-by-day pacing, stays, travel prep, notes, and AI-assisted trip refinement.

## Product goals

- Make a complex road trip feel calm, legible, and editable from one place.
- Keep the route spatial and visual instead of burying it in lists.
- Separate trip structure, day planning, stays, prep, and notes so each screen has a clear job.
- Support both planning at a desk and a simpler on-the-road companion mode.
- Let the user package the trip for an external AI tool without oversharing unwanted context.

## Current product shape

The app has two working modes.

### Planning Mode

Planning Mode is the primary desktop workspace. It includes:

- **Route**: map-first route planning with a left rail for stop order, route overview, stop detail, and stop insertion.
- **Itinerary**: day-by-day chapters with drive timing, rest days, warnings, checklist context, and compact stay summaries.
- **Stays & Costs**: scan-first accommodation cards plus budget tracking and editable budget lines.
- **Trip Prep**: country requirements, travel-prep tracking, and readiness signals.
- **Notes**: quick capture, pinned notes, tags, and trip memory.

### Trip Mode

Trip Mode is the lighter companion view for the road. It focuses on:

- **Today**: a status-aware daily companion with next-leg navigation, tonight's stay details, border-crossing reminders, large-tap checklist actions, pinned notes, and tomorrow's preview.
- **Stays**: property-first accommodation cards with arrival actions such as navigate, booking access, address handoff, and confirmation-code copy.
- **Progress**: segmented trip progress, distance done vs remaining, route-state map markers, and a stop timeline showing visited, current, and upcoming stops.

Trip Mode also now supports:

- navigation deep-links to the next stop and tonight's stay
- manual day advancement when real travel dates drift from the plan
- per-leg completion tracking for multi-leg driving days
- contextual border-crossing awareness using the trip's country-requirement data

## AI help workflow

The app now includes a built-in **Get AI Help** flow in Planning Mode.

This feature is designed for everyday users rather than power users. Instead of asking the user to build a prompt manually, the app lets them:

- choose up to 3 help goals
- add an optional plain-language request
- choose which optional trip sections to share
- decide whether sensitive booking details and personal notes should be included

The app then generates:

- a ready-to-paste AI markdown brief
- a structured JSON trip-context export

### AI help goals

Users can ask AI to help with:

- improving the route
- checking the pacing
- finding better stays
- reviewing the budget
- checking travel prep
- reviewing the whole trip

### Selective export behavior

The AI export is intentionally selective.

- **Always included**: Route and Itinerary
- **Optional**: Stays, Budget, Travel prep, Notes
- **Sensitive details**: booking links, confirmation codes, freeform notes, and other private planning context

The export layer now respects those choices not only at the top level, but also inside nested route and itinerary context. If the user turns off `Stays`, stay status and booking warnings are not leaked indirectly through always-included sections. If the user turns off `Notes`, freeform notes are kept out of route and itinerary exports as well.

## Design principles

- **Calm before density**: show the right layer first and reveal detail deliberately.
- **Map-first route understanding**: the route should read spatially before it reads administratively.
- **Clear screen ownership**:
  - Route owns geography and structure
  - Itinerary owns day-by-day planning
  - Stays & Costs owns reservations and spend
  - Trip Prep owns requirements
  - Notes owns freeform context
- **Local-first**: no backend, no auth, no sync.
- **Travel language over product language**: the copy is designed to feel clear, human, and traveler-centered.

## Audience

This app is for a solo traveler or small group planning a real road trip with multiple stops, multiple overnights, and real operational constraints such as:

- long drive days
- changing overnights
- parking requirements
- country-by-country driving rules
- budget tradeoffs
- notes and reminders that need to stay tied to the trip

It is not designed as a generic team travel SaaS or a booking marketplace.

## Constraints and non-goals

Current intentional constraints:

- desktop-first planning experience
- browser-local persistence via Zustand and `localStorage`
- no account system
- no cloud sync
- no collaboration
- no direct booking integration
- no turn-by-turn navigation
- no native mobile app

The app links out to external tools where that is more useful than rebuilding them, such as Google Maps / Apple Maps for navigation handoff.

## Core data model

The app persists trip data locally. Core entities include:

- **Trip**: name, status, dates, travelers, vehicle, currency, drive-hour target
- **Stop**: ordered route stop with name, country, coordinates, type, and optional-route flags
- **Leg**: drive segment between two stops with timing, distance, and route notes
- **Day**: a dated itinerary day made of one or more legs
- **Stay**: overnight accommodation linked to a stop
- **CountryRule**: travel-requirement records for each country
- **ChecklistItem**: scoped tasks tied to trip, day, or stop
- **Note**: freeform trip notes with optional tags and scoping
- **BudgetLine**: non-accommodation budget items

## Seed trip

The seeded trip demonstrates the full system with a Luxembourg to Sofia route including:

- 8 route stops
- 9 trip days
- overnight stays
- country requirements across multiple countries
- notes, checklist items, and budget lines

It is meant to be realistic enough to exercise the planning flows, not just to populate the UI.

## Tech stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui**
- **Zustand**
- **React Leaflet** with OpenStreetMap tiles
- **Nominatim** for geocoding
- **lucide-react**

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production-style local preview:

```bash
./node_modules/.bin/next build
./node_modules/.bin/next start
```

## Project structure

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    app-shell.tsx
    trip-library.tsx
    planning/
      planning-shell.tsx
      route-view.tsx
      itinerary-view.tsx
      stays-budget-view.tsx
      prep-view.tsx
      notes-view.tsx
      ai-help-sheet.tsx
    trip-mode/
      trip-mode-shell.tsx
      today-screen.tsx
      stays-tab.tsx
      overview-tab.tsx
    wizard/
      trip-wizard.tsx
    shared/
      ui-helpers.tsx
    ui/
      ...
  data/
    trip-seed.ts
    country-rules-db.ts
  lib/
    trip-utils.ts
    ai-export.ts
  store/
    trip-store.ts
  types/
    trip.ts
```

## Notes for future development

Good future directions include:

- deeper mobile refinement and real-device QA
- richer AI export/download flows
- more nuanced travel-risk modeling
- improved trip comparison and route alternatives
- deployment and cloud sync only if they support the core planning experience instead of diluting it
