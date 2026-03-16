# Road Trip Operating System

Road Trip Operating System is a desktop-first, local-first travel planning app for a specific multi-day European drive: Luxembourg to Sofia via Munich, Bohinj, Ljubljana, Novi Sad, and Belgrade. It is not trying to be a generic booking platform. It is a private trip desk for shaping, checking, and executing one road trip with more confidence and better taste.

The current product direction is closer to a luxury travel companion than a dashboard. The app is designed to make the route feel coherent, calm, and trustworthy by surfacing the current chapter of the journey, tomorrow's move, the stays that still need locking, the prep work that could still produce friction, and the notes that make the route feel more human.

## Product aims

- Turn a complex road trip into a calm, readable desktop planning experience.
- Help one traveler or one planning team keep the route coherent from first draft to departure.
- Reduce the operational stress around parking, border/legal prep, route pacing, and booking confidence.
- Preserve the emotional side of the trip so the app feels like a designed journey rather than a task board.

## Objectives

- Make the current chapter, next move, and top blockers obvious within seconds.
- Treat itinerary days as narrative chapters, not just rows of data.
- Keep stays, route logic, and trip prep in sync through one seed-driven source of truth.
- Support local editing without requiring an account, backend, or external service integration.
- Keep the route flexible while still giving the traveler a feeling of increasing readiness and control.

## Intended audience

This app is currently designed for:

- A traveler planning and executing a single long-distance road trip.
- Someone who cares about travel rhythm, route coherence, and practical confidence.
- A user who wants a more premium and intentional planning experience than a generic notes app or spreadsheet.
- Desktop users first. The current design direction prioritizes desktop readability and planning comfort over mobile-native execution.

## Product constraints

These constraints are intentional and should be treated as part of the product definition:

- The app is local-first and browser-persistent only. There is no backend, sync, auth, or collaboration layer yet.
- The seeded content is built around one specific trip and one primary selected corridor. It is not a generalized travel-planning SaaS.
- The product is desktop-first for now. Mobile adaptation is deferred to a later phase and should not drive current design decisions.
- Booking, navigation, maps, and compliance are planning aids, not live integrations with third-party providers.
- Map tiles load from external providers at runtime, but the rest of the planner should still be useful without them.

## Experience principles

The current desktop redesign is built around these principles:

- Calm before density: surface the right layer first, reveal detail deliberately.
- One primary question per screen: Today, Journey, Route, Stays, Trip Prep, Notes.
- More companion, less dashboard: the app should feel authored, not generic.
- Trust is the luxury layer: parking, readiness, route logic, and blockers should feel controlled.
- Place matters: destinations should feel like chapters in a route, not abstract records.

## Current feature set

- `Today` desk with current chapter, tomorrow, route philosophy, and top blockers.
- `Journey` view for day-by-day route chapters with editable planning details.
- `Route` view with map context and selected leg storytelling.
- `Stays` workspace for booking confidence and trip budget edits.
- `Trip Prep` workspace for legal/compliance and vehicle readiness.
- `Notes` workspace for pinned travel intelligence and quick capture.
- Route variant support with the Bohinj corridor as the selected route and the Bled option retained as an archived comparison.
- Local persistence via Zustand + `localStorage`.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui primitives
- Zustand with localStorage persistence
- React Leaflet + map tiles for route view
- lucide-react icons

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For a production-style local preview:

```bash
npm run build
npm run start
```

## Project structure

- `src/components/road-trip/road-trip-app.tsx`: main application shell and the desktop-first product views
- `src/components/road-trip/route-map.tsx`: interactive route map and route highlighting
- `src/data/trip-seed.ts`: route seed, itinerary, compliance, bookings, budget, readiness, and notes
- `src/store/trip-store.ts`: persisted client state, migrations, and update actions
- `src/lib/trip-utils.ts`: formatting, selectors, and derived travel calculations
- `src/types/trip.ts`: shared trip and view-model types

## How to update the trip

- Edit `src/data/trip-seed.ts` to change stops, day plans, compliance logic, bookings, budget seeds, readiness checks, or notes.
- Use the in-app `Reset trip` action to restore the seed if local browser edits drift too far.
- Route variants live in the same seed file under `routeVariants`. The Bohinj / Novi Sad corridor is the current product truth; the Bled route remains an archived comparison.

## Non-goals for the current phase

- Multi-user collaboration
- Cloud sync
- Live booking APIs
- Turn-by-turn navigation
- Mobile-first redesign
- Generalized trip planning for arbitrary routes
