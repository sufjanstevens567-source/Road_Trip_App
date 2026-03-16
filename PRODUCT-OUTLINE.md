# Road Trip Planner — Product Structure Outline
*Revised*

---

## The governing idea

A road trip has a lifecycle, and the app's interface should match it at every stage. There are five distinct phases, each with a different user mindset and a different UI contract:

| Phase | Status | Primary question | Primary device |
|-------|--------|-----------------|----------------|
| Early planning | `draft` | "What's the shape of this trip?" | Desktop |
| Active planning | `planning` | "Is everything in place?" | Desktop |
| Pre-departure | `ready` | "Am I actually ready to leave?" | Desktop / Phone |
| On the road | `active` | "What do I need right now?" | Phone |
| After the trip | `completed` | "What did this trip look like?" | Desktop / Phone |

The app has two primary modes — **Planning Mode** (desktop-first, expansive) and **Trip Mode** (mobile-first, focused) — but the transition between them is not a hard binary switch. Planning Mode covers `draft`, `planning`, and `ready`. Trip Mode covers `active`. Completed trips are read-only archives accessible from both devices.

**The transition to Trip Mode happens automatically** when the trip's start date arrives. The user can also trigger it manually. Critically, Trip Mode allows lightweight edits — marking a compliance item done, updating a confirmation code, adding a quick note — without a full return to Planning Mode. The two modes are different lenses on the same data, not separate applications.

---

## Trip lifecycle states

### `draft`
The trip has an origin, destination, and a rough idea of stops. No dates are locked, no bookings have been researched. The Route view is the primary workspace.

### `planning`
Dates are set, the itinerary is taking shape, and the user is actively booking stays, working through compliance, and refining the day structure. All four Planning Mode views are actively used.

### `ready`
All critical items are resolved: stays booked, compliance complete, vehicle checked. The app surfaces a "departure ready" signal. The user is in final confirmation mode — checking details, not making decisions. Planning Mode is still accessible but the emphasis shifts to the Prep view's pre-departure checklist.

### `active`
The trip is in progress. Trip Mode is the default interface. Planning Mode remains accessible for reference and lightweight edits. The current day advances automatically based on the calendar.

### `completed`
The trip is over. The full itinerary, stays, notes, and budget are preserved as a read-only archive. This is where institutional knowledge lives — useful for planning future trips, reviewing what you spent, or simply remembering where you stayed.

---

## Core data model (generalized)

These entities work for any road trip. Nothing is hardcoded to a specific route, country set, or trip style.

### Trip
The top-level container.

- Name
- Origin (place + coordinates)
- Destination (place + coordinates)
- Travel window (start date, end date)
- Travelers (e.g. "1 driver", "2 adults")
- Vehicle (name, type — informs compliance suggestions and comfort warnings)
- Currency
- Status: `draft` | `planning` | `ready` | `active` | `completed`
- Max drive hours per day (user-configurable — default 7h, used for pacing warnings and day auto-distribution)

### Stop
A place on the route. Stops are the backbone — every other entity links back to them.

- Name
- Country
- Coordinates
- Type: `origin` | `waypoint` | `overnight` | `destination`
- Position in route (integer, determines order)
- Tags (user-defined: "scenic", "city", "rest stop", "fuel", etc.)
- Notes (free text)
- `isAlternative` (boolean) — marks a stop as part of an alternative route option rather than the primary route; lets you hold two options on the same map without a full variant system

Stops of type `overnight` and `destination` generate a linked Stay automatically on creation.

### Leg
The drive segment between two consecutive stops. **Legs are first-class editable objects**, not just a calculated relationship.

- From stop → To stop
- Drive distance (km or mi — derived from routing, editable)
- Drive time (hours — derived from routing, editable)
- Countries crossed (derived from coordinates, editable — used to surface country rule warnings)
- Toll / road notes (free text)
- Risk notes (e.g. "low-emission zone on entry", "border crossing — have passport accessible")
- Order (matches stop sequence)

Drive distance and time are auto-calculated when stops are added (via a routing API or local heuristics). Both are editable — the user always has the final say on what a leg actually involves.

### Day
A calendar day in the itinerary. Days are distinct from stops and legs — they represent time, not place.

- Date
- Day number
- Legs covered (ordered list of Leg references — a day can cover one or more legs)
- Overnight stop (derived from the last leg's destination stop)
- Type: `driving` | `rest` | `mixed`
- Total drive time for the day (sum of covered legs — auto-calculated)
- Total drive distance for the day (sum of covered legs — auto-calculated)
- Notes (free text — single field, replaces the "activity ideas" + "day notes" duplication)
- Checklist items (scoped to this day — see Checklist Item)

**Day-to-Leg mapping rule:** Days are generated by the itinerary builder during the creation flow and can be restructured afterwards. A leg belongs to exactly one day. A day can contain multiple legs (e.g. drive Bohinj → Ljubljana, then Ljubljana → Novi Sad). Splitting or merging days redistributes their legs accordingly. Checklist items scoped to a day move with the day when restructured.

### Stay
Accommodation at an overnight or destination stop.

- Stop (linked)
- Check-in date (derived from day itinerary, editable)
- Check-out date (derived from day itinerary, editable)
- Property name
- Address (tappable in Trip Mode — opens device maps app)
- Booking URL (paste link from Booking.com, Airbnb, etc.)
- Status: `researching` | `shortlisted` | `booked`
- Confirmation code
- Parking included (boolean)
- Parking notes (the most important field for on-road use — rich text or multi-line)
- Check-in window
- Cancellation policy
- Cost planned (contributes to accommodation budget category automatically)
- Cost actual
- Notes

**Budget sync rule:** A Stay's planned and actual costs are the source of truth for the accommodation budget category. The Budget view derives accommodation totals from Stay records — there is no separate accommodation Budget Line. This eliminates the dual-representation problem.

### Checklist Item
A task the user needs to complete. Can be scoped to the trip, a specific day, or a specific stop.

- Label
- Done (boolean)
- Scope: `trip` | `day:{dayId}` | `stop:{stopId}`
- Category (user-defined tags — with sensible defaults provided: "booking", "documents", "parking", "vehicle", "vignette", "fuel", "packing")
- Due by (optional: a date, a day reference such as "before Day 3", or a phase such as "before departure")
- Source: `manual` | `country-rule` (items generated from Country Rules are flagged so users know where they came from)

### Country Rule
Compliance information for a country on the route. **Country Rules are seeded from a curated built-in database** for commonly travelled European countries. For countries not in the database, the user creates rules manually. Both seeded and manual rules have the same structure.

- Country name
- Required documents (list)
- Road rules: vignette required (boolean + purchase URL), emission zones, speed limits, toll notes
- Border crossing notes
- Common mistakes (advisory text)
- Items (checklist-style items — each generates a linked Checklist Item with source: `country-rule`)
- Status: seeded items have an initial status of `todo`; user can mark each `in-progress` or `done`

**Auto-derivation mechanism:** When a Leg's "countries crossed" field includes a country, the app checks the built-in database and offers to add that country's rules to the trip. This is a prompt, not silent automation — the user confirms before rules are added. For countries not in the database, the user is shown an empty Country Rule template to fill in manually.

### Budget Line
Spending tracked by category — for everything except accommodation (which flows from Stays).

- Category: `fuel` | `tolls` | `food` | `activities` | `parking` | `other`
- Label
- Planned amount
- Actual amount
- Linked stop (optional)
- Linked day (optional)

Accommodation is intentionally absent from Budget Line categories because Stay costs serve that role. The Budget view shows accommodation totals derived from Stays alongside Budget Lines from all other categories.

### Note
Free-form intelligence linked to the trip, a stop, or a day.

- Title
- Body
- Tags (user-defined)
- Linked stop (optional)
- Linked day (optional) — Notes can link to days, not just stops
- Pinned (boolean)
- Created at (timestamp)

### Attachment
A file or URL linked to a Stay, Stop, Day, or the Trip.

- Type: `url` | `image` | `document`
- Label
- URL or file reference
- Linked entity (stay, stop, day, or trip)

This is the home for confirmation email screenshots, parking garage maps, booking PDFs, and any document that matters on the road. Attachments on a Stay surface directly in the Trip Mode Today screen.

---

## Planning Mode (desktop-first)

Planning Mode has **five views**. The fifth — Notes — was incorrectly removed in the previous draft. Each view answers one clear question.

### 1. Route
**Question: "What's my trip and does the shape make sense?"**

The home screen of Planning Mode. The first thing you see when you open the app.

**Layout: three columns**

**Left panel — Stop list**
- Ordered list of stops with type badges and country flags
- Each stop row shows: name, stay status (if overnight), days spent
- Alternative stops are visually distinct (lighter treatment, "Alt" badge)
- Drag to reorder — legs and days recalculate on drop
- Add stop button (opens a search/map-pin flow)
- Remove stop (with confirmation if the stop has a Stay attached)

**Center — Map**
- Full interactive map, the dominant visual element
- Route drawn as a connected path between stops in order
- Alternative stops shown as a branching path in a different colour
- Clicking a stop opens its **detail panel** (slides in from the right, replacing the route summary panel temporarily)
- Clicking a leg label shows that leg's drive time, distance, and toll notes as a tooltip
- Map updates in real time as stops are added, removed, or reordered

**Right panel — Two states**

*Default: Route summary*
- Overall readiness signal: a compact status bar showing "X stays open, Y compliance items to action, Z vehicle checks outstanding" — this is where the top-level trip health signal lives
- Total distance, total drive time, number of days, number of countries
- Per-leg breakdown table: From → To | Distance | Time | Countries crossed
- Pacing warnings: legs or days that exceed the trip's configured max drive hours are flagged in amber or red
- Countries on route (auto-detected list, each with a link to its Country Rule)

*When a stop is selected: Stop detail panel*
- Stop name, type, tags
- Stay status (if overnight)
- Linked Country Rules (for the country this stop is in)
- Notes linked to this stop
- Checklist items scoped to this stop
- Close button returns to Route summary

**Relationship with Itinerary:** Clicking a day in the Itinerary view highlights the corresponding legs on the Route map, and vice versa. These two views are linked, not parallel.

---

### 2. Itinerary
**Question: "What does each day look like and is the pacing right?"**

A vertical timeline of days. Collapsed by default. Expandable.

**Collapsed day card shows:**
- Day number + date
- Route label (e.g. "Munich → Bohinj" or "Bohinj rest day")
- Drive time + distance (or "Rest day")
- Overnight stop name + stay status badge
- Checklist completion (e.g. "2/5 items done")
- Warning indicator if the day has unresolved risks (amber dot)

**Expanded day card shows:**
- Everything above, plus:
- Legs covered with per-leg stats (expandable if the day has multiple legs)
- **Warnings panel** — auto-surfaced from Country Rules: the app checks which countries are crossed on this day's legs and surfaces any `todo` compliance items relevant to those countries. For example, if Day 3's legs cross into Slovenia, any open Slovenia vignette items appear here. This works because Legs store "countries crossed" and Checklist Items store their country-rule source.
- Stay card (inline): property name, check-in, parking notes, confirmation code, booking URL — all editable inline
- Checklist items scoped to this day — checkable directly
- Notes for this day (single text field — no separate "activity ideas" vs "notes" split)
- Attachments linked to this day's stay

**Re-planning:** Days can be restructured after initial creation. A day card has a context menu with: "Split this day into two", "Merge with next day", "Move a leg to another day". Merging/splitting redistributes the day's legs. Checklist items scoped to the day move with it. A confirmation step surfaces if the restructuring would conflict with a Stay's check-in or check-out date.

**Itinerary-wide controls:**
- Expand all / Collapse all
- "Redistribute days" — re-runs the auto-distribution algorithm if the user has changed stops since initial creation
- Pacing summary bar above the day list: a horizontal timeline showing drive intensity per day, making it immediately obvious which days are heavy

---

### 3. Stays & Budget
**Question: "Am I booked and am I on budget?"**

**Layout: two columns, equal weight**

**Left column — Stays**
- All stays in route order
- Each stay card shows: city, dates, property name, status badge, parking indicator, planned cost
- Filter strip: All | Needs work | Booked | Parking unconfirmed
- Expanding a stay card reveals: address, booking URL, confirmation code (editable), check-in window, cancellation policy, parking notes, actual cost — all inline editable
- Booking completion score at the top of the column

**Right column — Budget**
- Fixed at the top of the column regardless of how long the stays list is (no vertical stacking that buries budget)
- Accommodation total: auto-derived from all Stay planned/actual costs — read-only derivation, not a manual line
- Other categories (fuel, tolls, food, activities, parking, other): each is a manually maintained Budget Line with planned and actual fields
- Visual progress bars per category
- Total planned | Total spent | Remaining — always visible
- A simple "add budget line" control for one-off expenses

---

### 4. Prep
**Question: "Am I ready to leave?"**

**Layout: two columns**

**Left column — Country rules**
- One expandable section per country on the route (in the order they're encountered)
- Each section shows: required documents, road rules summary, border notes, common mistakes
- Checklist items for this country — each with a status toggle (todo / in-progress / done)
- Items generated from the built-in database are marked with a "seeded" indicator so the user knows they came from a curated source
- "Add manual item" for country-specific rules not in the database

**Right column — Vehicle & departure checklist**
- Vehicle checks grouped by category: mechanical, safety kit, comfort, documents
- Each item has a status toggle and an optional note field
- **Pre-departure timeline checklist:** trip-level items grouped by when they should be done (T-7 days, T-1 day, morning of departure). These are the items that don't belong to a specific country or day — packing the car, confirming all bookings, saving offline maps, setting up the route in Google Maps.
- Overall readiness score: a single percentage aggregating booking completion, country rule completion, and vehicle check completion

**The `ready` state trigger:** When overall readiness reaches 100% (all critical items resolved), the app offers to mark the trip as `ready`. This doesn't lock anything — it's a confidence signal, not a gate.

---

### 5. Notes
**Question: "What do I know that I don't want to forget?"**

Notes were removed from the previous draft. They belong back as a first-class view because they don't fit neatly inside any other view — they're the ambient intelligence layer that spans the whole trip.

**Layout: two columns**

**Left column — Quick capture**
- Title field, body field, tag selector, stop/day linker
- "Add note" saves and clears the form
- Recent notes (last 5) shown below the form for reference

**Right column — Note browser**
- All notes, filterable by tag or by linked stop/day
- Pinned notes float to the top
- Each note card shows: title, tags, linked stop/day if any, a preview of the body
- Inline edit mode on click
- Toggle pin from the note card

Notes in this view are the same entities surfaced in the Itinerary (day notes), Stop detail panel (stop notes), and Trip Mode Today screen (pinned notes). It's one data model, multiple surfaces.

---

## Trip Mode (mobile-first)

Trip Mode is the interface for the `active` state. It is fundamentally different from Planning Mode — not just a smaller version of it. Three tabs. Designed for one hand, bright daylight, and divided attention.

### Today
**The primary screen. Used for most of the time on the road.**

A single vertical-scroll view. Content adapts based on the time of day and the day's type.

**Section order (driving day):**

1. **Where I am** — Day number, date, current stop or "En route to [destination]"

2. **Today's checklist** — *Moved to the top.* The items you need to complete before you drive (vignette bought? tank full? address saved to phone?) are the most time-sensitive in the morning. Ticking them off is the first action of the day. Shows count and a simple progress bar.

3. **Today's drive** — Origin → Destination. Distance and drive time. Any leg-level risk notes (e.g. "toll road begins after Ljubljana — keep card accessible"). If multiple legs today, shows them in sequence. Tapping the destination address opens Google Maps.

4. **Tonight's stay** — Property name. Check-in window. Confirmation code (tappable to copy). Parking instructions (the full notes field — not truncated). Address with "Navigate" button. Attachments linked to this stay (e.g. parking garage screenshot).

5. **Heads up** — Active warnings for today and tomorrow only. Sources: unresolved country-rule checklist items relevant to today's legs, stays with unconfirmed parking for today or tomorrow, any checklist items with a due date of today. No weather. No speculative alerts. Only what's actually in the data.

6. **Tomorrow preview** — Collapsible. Where you're going, drive time and distance, overnight location, any warnings for tomorrow. Lets you prep tonight without switching screens.

**Section order (rest day):**

1. **Where I am** — Day number, date, current stop name, "Rest day"
2. **Tonight's stay** — Same as above — this is the most useful thing on a rest day
3. **Today's checklist** — Items due today
4. **Day notes** — The notes attached to this day in the itinerary (activity ideas, local knowledge, etc.)
5. **Heads up** — Same logic as driving days
6. **Tomorrow preview** — Collapsible

**Lightweight editing in Trip Mode:** Any field shown on the Today screen is editable with a long-press or an edit icon. Tapping "Edit" on a stay card opens an inline form — no mode switch required. The same applies to checklist items (check off or add one), and notes (quick capture from the Today screen). Changes persist immediately. This covers the most common on-road edits without ever leaving Trip Mode.

**Offline behaviour:** The Today screen is fully functional without network access. All content — stays, checklist items, notes, parking instructions, attachments — is stored locally. The only element that requires network access is the map tile layer in the Trip Overview tab. If tiles don't load, the map shows an "Offline — map unavailable" state. The Today and Stays tabs are never affected by connectivity.

---

### Stays
A simplified list of all stays in route order. The quick-access reference for the whole trip.

Each stay row shows: city, check-in date, property name, status badge.

Tapping a stay opens a full-screen detail card: property name, address (with Navigate button), check-in window, confirmation code (tappable to copy), parking instructions, any attachments. One tap to get everything you need for a specific night — including nights that aren't today.

This tab exists because "where am I staying on Thursday?" is a common on-road lookup that shouldn't require scrolling through the Today timeline.

---

### Trip Overview
A simplified view of the whole journey. Glanceable context, not a planning tool.

- Progress indicator: "Day 4 of 9 — Bohinj → Novi Sad next"
- Route map with current position highlighted and remaining stops marked
- A simple list of all stops with dates — completed stops shown differently from upcoming ones
- Total distance driven vs. remaining

The map here is for orientation, not interaction. If tiles fail to load offline, the stop list remains fully visible.

---

## Trip creation flow

The flow starts from origin + destination and builds the trip structure progressively. No blank screens.

### Step 1: New trip
- "Give this trip a name" (defaults to "Origin → Destination")
- "Where are you starting from?" — search field with map
- "Where are you ending up?" — search field with map
- The app immediately draws the direct route and shows total drive time and distance
- A simple one-line prompt: "That's a [X]h drive. Want to add some stops?"

### Step 2: Travel window
- "When are you leaving?" — date picker (start date)
- "When do you need to arrive?" — date picker (end date, optional)
- The app calculates available days: "You have 9 days. That's [X]h of driving — comfortable for one driver."
- If the dates don't leave enough time for the drive: a gentle warning, not a block

### Step 3: Add stops
- "Where do you want to stop along the way?" — search field and map
- Each stop added is placed on the map and inserted into the route in geographic order
- The user sets each stop as `waypoint` (passing through, no stay) or `overnight` (staying)
- Legs between stops auto-calculate drive time and distance as stops are added
- **No suggested stops** — suggestions require data infrastructure this app doesn't have. Instead, the map shows the route corridor clearly so the user can identify where they want to add stops based on their own knowledge. This is honest about what the app does.

### Step 4: Configure pacing
- "How many hours do you want to drive per day at most?" — slider, default 7h
- The app auto-distributes days: overnights are assigned to stops, multi-leg days are formed based on the drive time limit
- A preview itinerary shows the result: "Day 1: Luxembourg → Munich (5.2h). Day 3: Munich → Bohinj (4.7h)..." etc.
- The user can adjust individual day assignments before confirming
- Pacing warnings flag any days that exceed the configured limit

### Step 5: Trip created — enter Planning Mode
- The trip is saved with status `planning`
- The Route view opens with all stops and legs in place
- Stays are auto-created for each overnight stop (empty, status `researching`)
- Country Rules are offered for each country on the route — the user sees a list: "Your route passes through Germany, Slovenia, Serbia, and Bulgaria. Add country-specific rules?" Confirming populates the Prep view with seeded items from the built-in database for each of those countries.
- An empty state checklist walks the user through the first planning steps: "Add a property name for Munich", "Review the Slovenia vignette requirement", "Set your fuel budget"

### Trip duplication
From the trip library screen (the app's home before any trip is open), a completed or planning trip can be duplicated. Duplication copies: all stops, legs, country rules structure, vehicle config, budget categories, and checklist item labels. It clears: confirmation codes, actual costs, checklist done states, notes bodies. The result is a clean starting point for a similar future trip — the structure without the specifics.

---

## Navigation structure

### Planning Mode (desktop)
```
[Route]  [Itinerary]  [Stays & Budget]  [Prep]  [Notes]
```
Five tabs in a persistent top or side nav. Route is the default. The overall readiness signal (stays open, compliance items, vehicle checks) is visible in the nav bar at all times — not buried inside a view.

### Trip Mode (mobile)
```
[Today]  [Stays]  [Trip Overview]
```
Three tabs in a bottom nav. Today is always the default on open. The current day and stop name are shown in the header, always visible.

### Mode switch
The transition from Planning to Trip Mode is triggered automatically when the trip's start date is reached. A manual "Start trip now" option is available from the Prep view for early switchers. A persistent but unobtrusive "Back to planning" link lives in Trip Mode's header — one tap to switch, one tap to return.

### Search
A global search — accessible from both modes via a keyboard shortcut (desktop) or a search icon in the header (mobile) — indexes stop names, property names, note bodies, and checklist items. This is essential for a trip with 8+ stops and dozens of notes and items. Without search, the app stops scaling after a certain complexity threshold.

### Trip library
The app's home screen before a trip is open. Shows all trips with their status and a brief summary (route, dates, status badge). "New trip" opens the creation flow. Tapping a completed trip opens it in read-only archive mode.

---

## Empty and error states

These were absent from the previous draft. They're product decisions, not implementation details.

**New user, no trips:** The trip library shows a single card — "Plan your first road trip" — with a brief three-line description of what the app does and a prominent "Start planning" button. No feature list, no onboarding tour. The creation flow is the onboarding.

**Trip created but nothing filled in yet:** Each empty section in Planning Mode shows a specific prompt, not a generic "Nothing here yet." Examples: "No stays added yet — stays are created automatically when you mark a stop as overnight." / "No country rules — add them from the Prep view or let the app suggest them based on your route."

**Map tiles offline:** "Map unavailable offline" with a simple stop list as fallback. The list is always rendered and never depends on tile loading.

**Routing API unavailable:** Drive times show as "—" with an "Edit" affordance so the user can enter them manually. The app never silently shows wrong data.

**Country not in built-in database:** The user sees: "We don't have rules for [Country] yet. You can add them manually." An empty Country Rule template is provided.

---

## Design principles (revised)

1. **Two modes, matched to two mindsets.** Planning is expansive and desktop-first. Execution is focused and mobile-first. They share data but not interface conventions.

2. **The map is the home screen in Planning Mode.** During planning, the Route view is the default. The map is the dominant element. On mobile in Trip Mode, the Today screen is the home — the map is a secondary reference tab.

3. **One question per view.** Each view answers exactly one question. If a view is answering two questions, split it or merge it.

4. **Show status, not philosophy.** The interface communicates through status badges, progress indicators, and warnings — not through prose descriptions of what the app is or what it believes in.

5. **Progressive detail.** Collapsed is the default. Expanded is on demand. Nothing starts open that doesn't need to be. The user reveals depth deliberately, not accidentally.

6. **Generalize through structure, not abstraction.** The data model works for any road trip because it's built around universal concepts — stops, legs, days, stays. Tags and categories are user-defined. The built-in country database provides a head start, not a constraint.

7. **Earn every pixel.** If a UI element doesn't help the user plan or execute, remove it. This includes marketing copy, redundant sidebars, and duplicate data representations.

8. **Make the right action the easy action.** The path of least resistance leads to the right outcome. Buying a vignette should be one tap from the relevant warning. Copying a confirmation code should be one tap from the Today screen. If the correct action takes more than two taps from the relevant context, it will be skipped.

9. **Fail gracefully, always.** Every "auto-" feature has a manual fallback. Map tiles offline: show the stop list. Routing unavailable: show editable "—" fields. Country not in database: show a blank template. The app is never rendered unusable by a missing external dependency.

10. **Every action should feel like progress.** Checking off a checklist item, confirming a booking, resolving a compliance warning — each should produce a visible, satisfying state change. The readiness score moves. A badge clears. The system acknowledges that something was done. Feedback is not decoration; it's the product telling the user it's working.
