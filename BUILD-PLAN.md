# Build Plan — Road Trip Planner Rebuild
*Sequential steps for revising the app to match the Product Outline*

---

## How to read this plan

Each step has a clear **goal**, a list of **what gets built**, a **definition of done**, and the **dependencies** that must exist before it starts. Steps are ordered so that each one produces something testable before the next begins. No step builds UI on top of a data model that will change in a later step.

The existing app is not thrown away. The Next.js setup, Tailwind configuration, shadcn/ui component library, React Leaflet integration, and Zustand persistence pattern are all retained. What changes is the type system, the state model, the views, and the navigation structure.

---

## Phase A — Foundation

*Before any UI is touched, the data model and state layer must be rebuilt. Every subsequent step depends on this being stable and correct. Rushing past this phase to get to visible results is the single most common mistake in product rebuilds.*

---

### Step 1 — Rewrite the type system

**Goal:** Replace the current `src/types/trip.ts` with a clean, generalized type system that matches every entity in the Product Outline data model. No UI code changes in this step.

**What gets built:**
- `Trip` type with the five-state lifecycle (`draft | planning | ready | active | completed`) and `maxDriveHoursPerDay` field
- `Stop` type with `isAlternative` flag and user-defined tags (replacing hardcoded `StopKind`)
- `Leg` type as a first-class entity (no longer derived — stores `countriesCrossed`, `tollNotes`, `riskNotes`, editable `driveHours` and `distanceKm`)
- `Day` type simplified to: date, dayNumber, array of Leg IDs, overnightStopId, type, notes (single field — no more 26 properties)
- `Stay` type with `bookingUrl`, `address`, `parkingNotes` as a proper multi-line field, and `costPlanned`/`costActual` as the accommodation budget source of truth
- `ChecklistItem` type as a universal entity with `scope` (`trip | day | stop`), user-defined `category` tags, `dueBy`, and `source` (`manual | country-rule`)
- `CountryRule` type with `seeded` boolean, structured road rule fields (vignette, emission zones, etc.), and a linked array of ChecklistItem IDs
- `BudgetLine` type with accommodation category removed (accommodation flows from Stays)
- `Note` type updated to include optional `dayId` alongside `stopId`
- `Attachment` type: `type` (`url | image | document`), `label`, `url`, linked entity reference
- `TripState` type covering all entities above plus UI state (activeView, mode, selectedDayId, etc.)
- `AppMode` type: `planning | trip`
- Remove `RouteVariantId` as a hardcoded union. Remove `NoteCategory` as a hardcoded union. Remove `StopKind` as a hardcoded union.

**Definition of done:** TypeScript compiles with no errors. All types are exported from `src/types/trip.ts`. No component files have been touched yet (they will have type errors — that is expected and will be resolved in later steps).

**Depends on:** Nothing. This is the starting point.

---

### Step 2 — Build the country rules seed database

**Goal:** Create a curated database of country rules for the countries relevant to European road trips. This is the built-in dataset that the Prep view and the creation flow draw from.

**What gets built:**
- A new file: `src/data/country-rules-db.ts`
- Seeded entries for the countries on the current trip: Luxembourg, Germany (with Munich low-emission zone detail), Slovenia (vignette), Serbia (tolls, documents), Bulgaria (vignette)
- Additionally seed: Austria, France, Italy, Croatia, Hungary, Czech Republic, Poland, Netherlands, Belgium, Switzerland — enough to cover common European road trip corridors
- Each entry follows the `CountryRule` type exactly: documents required, vignette (boolean + purchase URL), emission zone notes, speed limits, toll notes, border notes, common mistakes, and a default set of ChecklistItems
- A lookup function: `getCountryRuleByName(name: string): CountryRule | null` — returns the seeded rule if it exists, null if not
- A list function: `listSeededCountries(): string[]` — used in the creation flow to offer country rule suggestions

**Definition of done:** All seeded countries return a valid `CountryRule` object from the lookup function. TypeScript compiles. No UI code touched.

**Depends on:** Step 1 (types must be stable before seeded data is written against them).

---

### Step 3 — Rebuild the Zustand store and seed data

**Goal:** Replace the current `src/store/trip-store.ts` and `src/data/trip-seed.ts` with a new store and seed that match the revised type system. The existing Luxembourg → Sofia trip should be re-expressible in the new model as a smoke test.

**What gets built:**

*Store (`src/store/trip-store.ts`):*
- All state is now scoped under a `trips` array (multiple trips, one active at a time) with an `activeTripId` pointer
- A `currentTrip` selector that returns the active trip or null
- Actions for every entity: `createTrip`, `updateTrip`, `deleteTrip`, `duplicateTrip`
- `addStop`, `removeStop`, `reorderStops` (with automatic leg recalculation on reorder)
- `addLeg`, `updateLeg` (legs are now editable, not just derived)
- `addDay`, `updateDay`, `splitDay`, `mergeDay` (day restructuring actions from the outline)
- `createStay`, `updateStay` (auto-created when a Stop of type `overnight` is added)
- `addChecklistItem`, `toggleChecklistItem`, `updateChecklistItem`
- `addCountryRule`, `updateCountryRuleItem` (for marking compliance items done)
- `addBudgetLine`, `updateBudgetLine`
- `addNote`, `updateNote`, `toggleNotePin`
- `addAttachment`, `removeAttachment`
- `setTripStatus` (manages lifecycle transitions)
- `setAppMode` (planning | trip)
- Persistence via Zustand persist middleware — same localStorage pattern as current app
- Migration function that reads the current `road-trip-os-state` key and converts it to the new schema, preserving all user edits (checklist done states, booking notes, etc.)

*Seed data (`src/data/trip-seed.ts`):*
- Rewrite the Luxembourg → Sofia trip as a valid `Trip` object using the new types
- All 8 stops, all legs with proper `countriesCrossed` values, all 9 days with correct Leg references
- All stays with `bookingUrl` as empty string (not yet booked)
- Checklist items attached to the correct day or stop scope
- Country rules drawn from the new seed database (Step 2) rather than hardcoded inline
- Budget lines for fuel, tolls, food, parking, activities (accommodation removed from budget lines — derived from stays)
- Notes linked to stops and days appropriately
- Trip status: `planning`

*Utility functions (`src/lib/trip-utils.ts`):*
- `getDayDriveStats(day, legs)` — replaces the scattered drive time calculations
- `getTripReadiness(trip)` — aggregate readiness score from booking completion, compliance completion, vehicle completion
- `getBookingCompletion(stays)`, `getComplianceCompletion(countryRules)`, `getVehicleCompletion(checklists)`
- `getPacingWarnings(days, legs, maxHours)` — returns days that exceed the configured drive limit
- `getCountriesOnRoute(legs)` — returns unique list of countries crossed
- `getDayWarnings(day, legs, countryRules, checklists)` — the warning surfacing mechanism: for a given day, finds legs, finds countries crossed on those legs, finds open compliance checklist items for those countries
- `formatDriveHours`, `formatDistance`, `formatCurrency` — retained from current implementation

**Definition of done:** The app runs without crashing. The Luxembourg → Sofia trip loads from the new seed. All existing TypeScript errors from Step 1 are resolved. The store persists and rehydrates correctly. The existing UI may look broken — that is expected and will be resolved in subsequent steps.

**Depends on:** Steps 1 and 2.

---

## Phase B — Planning Mode

*With the foundation stable, Planning Mode views are built one at a time, each against the live store. The order mirrors importance: Route first (home screen), then Itinerary, then Stays & Budget, then Prep, then Notes.*

---

### Step 4 — Trip library and creation wizard

**Goal:** Build the app's entry point — the screen a user sees before any trip is open — and the creation flow that builds a new trip from origin → destination → stops → days.

**What gets built:**

*Trip library screen (`src/app/page.tsx` or a new route):*
- Shows all trips as cards with: name, route summary, status badge, date range
- "New trip" button opens the creation wizard
- Completed trips open in read-only mode
- Empty state: single "Plan your first road trip" card with a brief description and "Start planning" CTA
- Trip duplication: a context menu on each trip card with "Duplicate as new trip" — copies structure, clears specifics

*Creation wizard (`src/components/trip-wizard/`):*
- Step 1: Trip name (auto-generated as "Origin → Destination"), origin search, destination search. Map shows direct route line immediately.
- Step 2: Date picker for start and end dates. Available days count shown. Gentle warning if dates are tight for the drive.
- Step 3: Add stops. Search field + map. Each stop is added to the route, legs auto-calculate. User sets each stop as waypoint or overnight. Map updates in real time.
- Step 4: Pacing configuration. Max drive hours slider (default 7h). Auto-distributed itinerary preview. User can drag days to adjust before confirming.
- Step 5: Confirmation screen. Shows the full trip summary. "Create trip" saves to store and opens Planning Mode at the Route view. Country rule suggestions are offered here ("Your route passes through Germany, Slovenia, Serbia, Bulgaria — add road rules?")

*Leg calculation:*
- For now, drive time and distance are calculated using a simple straight-line distance heuristic with a road factor multiplier (distance × 1.35 / average speed). This is honest and editable — no external API required. The Leg's `driveHours` and `distanceKm` fields are pre-populated but always editable.

**Definition of done:** A new Luxembourg → Sofia trip can be created entirely through the wizard with no seed file involvement. The resulting trip matches the structure of the seeded trip. The trip library shows both trips. Duplication works.

**Depends on:** Step 3.

---

### Step 5 — Route view

**Goal:** Build the home screen of Planning Mode — the three-panel map view that answers "what's my trip and does the shape make sense?"

**What gets built:**

*Layout:*
- Three-column desktop layout: left panel (stop list), center (map), right panel (route summary / stop detail)
- Left and right panels are fixed width; map fills the remaining space
- Responsive: on smaller screens, left panel collapses to a drawer, right panel stacks below the map

*Left panel — Stop list:*
- Ordered list of stops. Drag handle on each row for reordering. Reordering triggers leg recalculation and a visual map update.
- Each row: stop name, country flag, type badge, stay status badge (if overnight)
- Alternative stops visually distinct (muted, "Alt" badge)
- "Add stop" button opens an inline search field. Selecting a result adds the stop at the end of the list and inserts it into the map route.
- Remove stop (×) with a confirmation dialog if a Stay exists for that stop

*Center — Map:*
- React Leaflet map, retained from current implementation
- Route drawn as a polyline connecting stops in order
- Alternative stops shown as a branching path in a different color
- Clicking a stop marker selects it, switching the right panel to Stop Detail mode
- Clicking anywhere else on the map deselects and returns the right panel to Route Summary mode
- Clicking a leg line shows a tooltip with drive time, distance, and countries crossed

*Right panel — Route Summary (default):*
- **Overall readiness signal** at the top: three compact stat chips — "Stays: X open", "Compliance: Y to action", "Vehicle: Z to check". Each chip links to the relevant Planning Mode view.
- Total trip stats: distance, drive time, days, countries
- Per-leg table: From → To | Distance | Time | Countries — each country name links to its Country Rule in the Prep view
- Pacing warnings: legs or days exceeding `maxDriveHoursPerDay` highlighted in amber/red

*Right panel — Stop Detail (when a stop is selected):*
- Stop name, type selector (waypoint / overnight), tag editor
- Stay status if overnight (links to the stop's Stay in the Stays view)
- Country Rule for this stop's country (summary + link to Prep)
- Checklist items scoped to this stop
- Notes linked to this stop (read-only previews with a link to the Notes view)
- Close button returns to Route Summary

**Definition of done:** The full Luxembourg → Sofia route is visible on the map. Stops can be reordered, added, and removed. The right panel switches correctly between Route Summary and Stop Detail. Readiness chips show accurate counts. Pacing warnings appear for days over the limit.

**Depends on:** Step 3 (store + seed).

---

### Step 6 — Itinerary view

**Goal:** Build the day-by-day timeline view that answers "what does each day look like and is the pacing right?"

**What gets built:**

*Pacing summary bar:*
- A horizontal strip above the day list showing all days as proportional segments, colored by drive intensity (green = easy, amber = moderate, red = heavy). Glanceable at a page glance.

*Day cards (collapsed):*
- Day number, date, route label, drive time + distance (or "Rest day"), overnight stop name, stay status badge, checklist completion ratio, amber dot if warnings exist

*Day cards (expanded):*
- Everything in collapsed view, plus:
- Legs covered: each leg shown as a row with its stats. If multiple legs, shown in sequence.
- **Warnings panel:** uses `getDayWarnings()` from Step 3. Auto-surfaces open compliance items relevant to today's countries. Each warning links to its item in the Prep view. No warnings panel rendered if there are no open items.
- Stay card (inline): property name (editable), check-in window, parking notes (editable, multi-line), confirmation code (editable), booking URL (editable), actual cost (editable)
- Checklist items scoped to this day: rendered as a checklist, directly checkable
- Day notes: single text field (replaces the "activity ideas" + "day notes" split from the current prototype)
- Attachments linked to this day's stay: shown as links or image thumbnails

*Day restructuring:*
- Each day card has a `⋮` context menu with: "Split into two days", "Merge with next day", "Move a leg to another day"
- Split: distributes legs evenly between two new days; checklist items stay with the day they were scoped to
- Merge: combines two consecutive days' legs and checklists into one day; prompts if a Stay check-out/check-in conflict exists
- Move leg: a simple picker showing available days

*Itinerary-wide controls:*
- Expand all / Collapse all buttons
- "Redistibute days" button: re-runs the pacing algorithm with current stops and the configured max drive hours

*Bidirectional link with Route view:*
- Clicking a day card's route label highlights the corresponding legs on the map (if the Route view is open in a split or if navigating to Route)
- This is implemented via a `selectedDayId` value in the store that both views read

**Definition of done:** All 9 days for the Luxembourg → Sofia trip render correctly. Warnings appear on Day 3 (Slovenia vignette) and Day 9 (Bulgaria vignette) based on the countries crossed in those days' legs. Day split and merge work without corrupting the store. Checklist items are checkable inline.

**Depends on:** Steps 3 and 5 (store + Route view, because of the bidirectional link).

---

### Step 7 — Stays & Budget view

**Goal:** Build the two-column view that answers "am I booked and am I on budget?"

**What gets built:**

*Left column — Stays:*
- All stays in route order as expandable cards
- Collapsed: city, check-in/out dates, property name (or "Not yet named"), status badge, parking indicator (✓/✗), planned cost
- Expanded (inline edit mode): property name, address, booking URL, confirmation code, check-in window, cancellation policy, parking notes (full multi-line field), planned cost, actual cost, notes
- All expanded fields are directly editable — no separate "edit mode" toggle; the field becomes an input on click (contenteditable pattern or input that switches on focus)
- Filter strip: All | Needs work | Booked | Parking unconfirmed
- Booking completion score badge at the top of the column

*Right column — Budget:*
- **Pinned to the top of the column regardless of stay list scroll length** (using CSS `position: sticky` on the budget card)
- Accommodation row: auto-derived total from all Stay `costPlanned` and `costActual` values. Read-only. Updates live as stays are edited in the left column.
- Other budget line rows (fuel, tolls, food, activities, parking, other): each has editable planned and actual fields
- "Add budget line" opens an inline form for one-off expenses with a free-text label and category selector
- Total row: planned | spent | remaining — always visible at the bottom of the budget card
- Visual progress bars per category

**Definition of done:** All 6 stays for the Luxembourg → Sofia trip are displayed. Editing a stay's `costPlanned` updates the accommodation total in the budget card without a page refresh. The budget card stays visible while scrolling the stay list. Filters work correctly.

**Depends on:** Step 3 (store). Can be built in parallel with Step 6.

---

### Step 8 — Prep view and Notes view

**Goal:** Build the final two Planning Mode views — the readiness workspace and the notes layer.

**What gets built:**

*Prep view — left column (Country rules):*
- One expandable section per country, in the order they're encountered on the route
- Each section: required documents list, road rule summary (vignette status, emission zones, border notes, common mistakes), checklist items with status toggles (todo / in-progress / done)
- Seeded items are labeled with a small "Built-in" indicator
- "Add custom item" adds a manual checklist item scoped to this country
- Sections for countries not in the seeded database show an empty template with a prompt to fill in manually

*Prep view — right column (Vehicle & departure checklist):*
- Vehicle checks grouped by category (mechanical, safety kit, comfort, documents) — same structure as current prototype, updated to use the new universal ChecklistItem type
- **Pre-departure timeline** section: trip-level checklist items grouped by when they should be done. Three groups: "T-7 days" (confirm all bookings, buy vignettes), "T-1 day" (pack car, download offline maps, charge devices), "Morning of departure" (final check, fuel, documents accessible). Default items are seeded for these groups; user can add, remove, and edit.
- Overall readiness score: a single percentage from `getTripReadiness()`. The three contributors (bookings, compliance, vehicle) are shown as sub-scores.
- **`ready` state trigger:** when readiness reaches 100%, a banner appears — "Everything looks good. Mark this trip as ready?" — with a confirm button that sets trip status to `ready`.

*Notes view:*
- Left column: quick capture form (title, body, tag input, stop/day linker) + last 5 notes as a preview list
- Right column: full note browser — all notes filterable by tag, by linked stop, or by linked day. Pinned notes float to top.
- Each note card: title, tags, linked stop/day if any, body preview (truncated). Clicking opens inline edit mode.
- Toggle pin from the note card directly.

**Definition of done:** All 5 European countries on the Luxembourg → Sofia route have their rules populated from the seed database. Marking a compliance item as "done" updates the readiness score. The overall readiness score is accurate. Notes can be created, edited, pinned, and filtered.

**Depends on:** Step 3. Can be built in parallel with Steps 6 and 7.

---

## Phase C — Trip Mode

*With all Planning Mode views complete, Trip Mode is built as a distinct interface layer. It uses the same store and entities but different components, layouts, and interaction patterns.*

---

### Step 9 — Trip Mode: Today screen

**Goal:** Build the primary on-road screen — the single vertical-scroll view that gives the traveller everything they need for the current day.

**What gets built:**

*Mode infrastructure:*
- `AppMode` state in the store: `planning | trip`
- Mode is set to `trip` automatically when the current date reaches the trip's start date (checked on app load and on a daily interval)
- A "Start trip now" manual trigger is added to the Prep view's `ready` state banner
- A "Back to planning" link lives in the Trip Mode header
- The app's root layout switches component trees based on `appMode` — the Planning Mode nav and desktop layout are entirely replaced by the Trip Mode mobile layout

*Today screen layout:*
- Single column, full mobile width, vertical scroll
- Bottom tab bar: Today | Stays | Trip

*Content sections (driving day):*
1. **Header:** Day N of M, date, current stop or "En route to [destination]"
2. **Checklist:** Items scoped to today, checkable inline. Progress count. If all done, a subtle "All clear" state.
3. **Today's drive:** Origin → Destination. Distance + time. Leg risk notes if any. Each destination address is a tappable link that opens the system maps app (Google Maps / Apple Maps).
4. **Tonight's stay:** Property name, check-in window, confirmation code (tap to copy to clipboard), parking notes (full text, not truncated), address with "Navigate" button, any attachments.
5. **Heads up:** Uses `getDayWarnings()` to surface open compliance items for today's countries, and any checklist items with `dueBy` of today. Only renders if there are active warnings. No weather. No speculative content.
6. **Tomorrow preview:** Collapsible. Route label, distance, time, overnight stop, any tomorrow warnings.

*Content sections (rest day):*
1. **Header:** Day N of M, date, current stop, "Rest day"
2. **Tonight's stay:** Same as above — most useful on a rest day
3. **Checklist:** Items scoped to today
4. **Day notes:** The notes text field for this day
5. **Heads up:** Same logic
6. **Tomorrow preview:** Collapsible

*Lightweight editing:*
- Any field on the Today screen that exists in the store can be edited in-place with a single tap — an edit icon (pencil) appears on hover/focus for each editable region
- Tapping edit on a stay field opens an inline input, saves on blur
- "Add checklist item" is a one-tap affordance at the bottom of the checklist section
- "Add note" is a one-tap affordance at the bottom of the day notes section
- No mode switch required for any of these

*Offline behaviour:*
- All Today screen content is read from localStorage — fully functional offline
- A connectivity indicator in the header shows "Offline" when network is unavailable — no other behaviour changes

*Day advancement:*
- On app load, `executionDayId` is auto-set to the day whose date matches today's date
- If today is before the trip start, the first day is shown
- If today is after the trip end, the last day is shown with a "Trip complete" banner

**Definition of done:** Trip Mode Today screen renders correctly for Day 5 of the Luxembourg → Sofia trip (the long transfer day). All sections display. Checklist items are checkable. Stay details are editable inline. The mode switch from Planning to Trip Mode and back works without data loss. Offline indicator works correctly.

**Depends on:** All of Phase B (the store and Planning Mode must be stable).

---

### Step 10 — Trip Mode: Stays tab and Trip Overview tab

**Goal:** Build the two supporting tabs of Trip Mode.

**What gets built:**

*Stays tab:*
- A scrollable list of all stays in route order
- Each row: city, check-in date, property name, status badge
- Tapping a stay opens a full-screen detail sheet: property name, address (with Navigate button), check-in window, confirmation code (tap to copy), parking notes, attachments
- "Back" returns to the list
- This tab is fully functional offline — all data is local

*Trip Overview tab:*
- Progress indicator: "Day X of Y — [next destination] next"
- Route map (React Leaflet, reused from Planning Mode) with simplified interaction: current stop highlighted, completed stops visually distinct, upcoming stops normal
- Below the map (or as a fallback when offline): ordered list of all stops with dates, drive times, completion status
- Total driven distance vs. remaining distance
- If map tiles fail to load offline, the list view is the primary display and the map area shows "Map unavailable offline" without crashing or hiding the list

**Definition of done:** Both tabs render. The Stays tab shows all 6 stays. Tapping a stay shows the full detail sheet with all fields. The Trip Overview shows the correct current position for Day 5. Offline map degradation shows the list fallback without errors.

**Depends on:** Step 9.

---

## Phase D — Integration and Polish

*The final phase ties everything together: navigation, search, mode transitions, empty states, and error states. Nothing here is new functionality — it's the connective tissue that makes the app feel whole.*

---

### Step 11 — Navigation, search, and trip duplication

**Goal:** Build the global navigation, the trip library home screen, search, and mode switching as a coherent system.

**What gets built:**

*Planning Mode navigation:*
- Five-tab nav (Route, Itinerary, Stays & Budget, Prep, Notes) as a persistent top or left-side bar
- Active tab indicated clearly
- The overall readiness signal (stays open, compliance to-do, vehicle checks) is shown in the nav bar itself — always visible, never buried in a view
- On screens narrower than the three-column layout threshold, the left panel in Route view collapses to a drawer; the nav becomes a bottom bar

*Trip Mode navigation:*
- Three-tab bottom bar (Today, Stays, Trip Overview)
- Current day and stop name in the header

*Global search:*
- Keyboard shortcut `Cmd/Ctrl + K` on desktop opens a search modal
- Search icon in the header opens the same modal on mobile
- Indexes: stop names, property names, note titles and bodies, checklist item labels, country rule item labels
- Results are grouped by type (Stops, Stays, Notes, Checklist) and link directly to the relevant view and entity
- Search is client-side (no external service) — runs against the in-memory store

*Trip duplication:*
- "Duplicate trip" on the trip library screen opens a confirmation dialog
- On confirm: creates a new trip copying all stops, legs, country rule structures, vehicle config, budget category labels, checklist item labels and scopes. Clears: confirmation codes, actual costs, checklist done states, note bodies. Status is set to `draft`.
- The duplicated trip opens immediately in the creation wizard at Step 4 (pacing) so the user can adjust dates and day distribution

*Mode switching:*
- Automatic switch to Trip Mode when today's date reaches the trip start date (checked on app load)
- "Start trip now" manual trigger in Prep view when status is `ready`
- "Back to planning" in Trip Mode header — always visible, one tap

**Definition of done:** All navigation works. Keyboard shortcut opens search. Searching "Belgrade" returns the Belgrade stop and its stay. Duplicating the Luxembourg → Sofia trip creates a clean copy with no user data. Mode switching is smooth in both directions.

**Depends on:** All previous steps.

---

### Step 12 — Empty states, error states, and lifecycle polish

**Goal:** Make every state the app can be in feel intentional. This is the step that separates a working prototype from a product.

**What gets built:**

*Empty states (every view):*
- Trip library, no trips: "Plan your first road trip" card with "Start planning" CTA
- Route view, no stops added yet: map centered on Europe, left panel shows "Add your first stop", right panel shows trip basics
- Itinerary, no days yet: "Your itinerary will appear once you've set your travel dates and stops"
- Stays, no overnight stops: "Stays are created automatically when you mark a stop as overnight"
- Prep, no countries yet: "Country rules will appear once your route is set"
- Notes, no notes yet: "Add your first note using the form on the left"
- Today screen (pre-trip): shows the first day's preview with a "Trip starts in X days" header
- Today screen (post-trip): "Trip complete — [trip name] is archived" with a link to view the archive

*Error states:*
- Routing unavailable (leg drive time/distance can't be calculated): fields show "—" with an edit icon and a tooltip "Tap to enter manually"
- Map tiles offline: "Map unavailable offline — showing stop list" with the stop list as a full fallback
- Country not in database: "We don't have built-in rules for [Country]. Add them manually." with an empty Country Rule template
- Store migration failure (old localStorage schema unreadable): offer to reset to the seed with a clear warning that user data will be lost

*Lifecycle transitions:*
- `draft → planning`: triggered when the user sets travel dates in the wizard
- `planning → ready`: triggered manually via the Prep view banner when readiness is 100%
- `ready → active`: triggered automatically by date, or manually via "Start trip now"
- `active → completed`: triggered automatically on the day after the trip end date, or manually via a "Complete trip" button in Trip Mode header
- `completed` trips are read-only: all edit controls are hidden, a "View archive" label replaces the mode indicator

*Final consistency pass:*
- Verify all `getDayWarnings()` calls produce correct results for all 9 days
- Verify readiness score calculation is accurate and updates correctly when items are marked done
- Verify pacing warnings appear on the correct days given the 7h default limit
- Verify the mode transition is smooth and no state is lost when switching between Planning and Trip Mode
- Verify the store migration correctly reads the old `road-trip-os-state` key and converts the existing trip data to the new schema

**Definition of done:** Every view has a handled empty state. Disconnecting network shows offline indicators in the correct places without breaking the Today screen. The trip lifecycle transitions work for all five states. The existing Luxembourg → Sofia trip data migrates correctly from the old store schema.

**Depends on:** All previous steps. This step closes the build.

---

## Summary

| Phase | Steps | What's established |
|-------|-------|-------------------|
| A — Foundation | 1–3 | Types, country rules database, store, seed data |
| B — Planning Mode | 4–8 | Trip library, creation wizard, all five planning views |
| C — Trip Mode | 9–10 | Today screen, Stays tab, Trip Overview tab |
| D — Integration | 11–12 | Navigation, search, duplication, empty/error states, lifecycle |

Each phase produces a usable increment. After Phase A, the data layer is stable. After Phase B, the full planning experience works on desktop. After Phase C, the execution experience works on mobile. After Phase D, the app is complete.
