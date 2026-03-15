# Road Trip Operating System

Interactive local-first planning app for a revised 9-day Luxembourg -> Sofia road trip built around the selected Munich -> Bohinj -> Ljubljana stop -> Novi Sad -> Belgrade corridor. The product is designed around daily execution first: where you sleep, how hard tomorrow is, what legal or toll prep is next, which bookings are still soft, and what could still lead to fines or parking friction.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui primitives
- Zustand with localStorage persistence
- React Leaflet + OpenStreetMap tiles for route view
- lucide-react icons

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## App structure

- `src/components/road-trip/road-trip-app.tsx`: main application shell and primary views
- `src/components/road-trip/route-map.tsx`: interactive route map
- `src/data/trip-seed.ts`: central trip seed data for itinerary, compliance, bookings, budget, readiness, and notes
- `src/store/trip-store.ts`: persisted client state and update actions
- `src/lib/trip-utils.ts`: formatting, selectors, and derived calculations
- `src/types/trip.ts`: shared trip types

## How to update the trip

- Edit `src/data/trip-seed.ts` to change route stops, day plans, compliance guidance, booking seeds, budget items, readiness checks, or idea notes.
- If you want a fresh copy of the defaults after making local edits in the UI, use the in-app `Reset trip` action.
- Route variants live in the same seed file under `routeVariants`. The default is the Bohinj / Novi Sad corridor, and the Bled option is kept only as an archived comparison.

## Notes

- All edits persist locally in the browser via localStorage.
- The map uses OpenStreetMap tiles at runtime; the rest of the planner remains usable even if map tiles do not load.
- The app ships with realistic seed data for the revised Luxembourg -> Sofia route described in the brief.
