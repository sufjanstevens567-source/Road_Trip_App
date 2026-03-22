// ─── Primitives ───────────────────────────────────────────────────────────────

export type TripStatus = "draft" | "planning" | "ready" | "active" | "completed";
export type AppMode = "planning" | "trip";
export type AppView = "route" | "itinerary" | "stays" | "prep" | "notes";
export type TripView = "today" | "stays" | "overview";
export type RouteLayoutPreference = "map-focus" | "balanced" | "details-focus";
export type DisplayScale = "default" | "comfortable" | "large";

export type StopType = "origin" | "waypoint" | "overnight" | "destination";
export type DayType = "driving" | "rest" | "mixed";
export type BookingStatus = "researching" | "shortlisted" | "booked";
export type ChecklistScope = "trip" | `day:${string}` | `stop:${string}`;
export type ChecklistSource = "manual" | "country-rule";
export type ChecklistStatus = "todo" | "in-progress" | "done";
export type BudgetCategory = "fuel" | "tolls" | "food" | "activities" | "parking" | "other";
export type AttachmentType = "url" | "image" | "document";

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  name: string;
  originId: string;
  destinationId: string;
  startDate: string | null;    // ISO date string e.g. "2025-07-30"
  endDate: string | null;
  travelers: string;
  vehicle: string;
  currency: string;
  maxDriveHoursPerDay: number; // default 7
  status: TripStatus;
  createdAt: string;
}

export interface Stop {
  id: string;
  tripId: string;
  name: string;
  country: string;
  coordinates: [number, number]; // [lat, lng]
  type: StopType;
  position: number;             // 0-based order index
  isAlternative: boolean;
  tags: string[];               // user-defined
  notes: string;
}

export interface Leg {
  id: string;
  tripId: string;
  fromStopId: string;
  toStopId: string;
  order: number;                // matches stop position sequence
  distanceKm: number;
  driveHours: number;
  countriesCrossed: string[];   // e.g. ["Germany", "Austria"]
  tollNotes: string;
  riskNotes: string;
}

export interface Day {
  id: string;
  tripId: string;
  date: string;                 // ISO date string
  dayNumber: number;            // 1-based
  legIds: string[];             // ordered — a day can cover multiple legs
  overnightStopId: string;
  type: DayType;
  notes: string;
}

export interface Stay {
  id: string;
  tripId: string;
  stopId: string;
  checkIn: string;              // ISO date string
  checkOut: string;             // ISO date string
  propertyName: string;
  address: string;
  bookingUrl: string;
  status: BookingStatus;
  confirmationCode: string;
  parkingIncluded: boolean;
  parkingNotes: string;
  checkInWindow: string;
  cancellationPolicy: string;
  costPlanned: number;
  costActual: number;
  notes: string;
}

export interface ChecklistItem {
  id: string;
  tripId: string;
  label: string;
  done: boolean;
  scope: ChecklistScope;
  category: string;             // user-defined tag
  dueBy: string;                // e.g. "before Day 3", "T-1", ISO date, or ""
  source: ChecklistSource;
  countryRuleId?: string;       // set when source === "country-rule"
}

export interface CountryRuleItem {
  id: string;
  label: string;
  detail: string;
  status: ChecklistStatus;
  dueBy?: string;
  seeded: boolean;
}

export interface CountryRule {
  id: string;
  tripId: string;
  country: string;
  seeded: boolean;
  documents: string[];
  vignetteRequired: boolean;
  vignetteUrl: string;
  emissionZoneNotes: string;
  speedLimitNotes: string;
  tollNotes: string;
  borderNotes: string;
  commonMistakes: string[];
  items: CountryRuleItem[];
}

export interface BudgetLine {
  id: string;
  tripId: string;
  category: BudgetCategory;
  label: string;
  planned: number;
  actual: number;
  stopId?: string;
  dayId?: string;
}

export interface Note {
  id: string;
  tripId: string;
  title: string;
  body: string;
  tags: string[];               // user-defined
  stopId?: string;
  dayId?: string;
  pinned: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  tripId: string;
  type: AttachmentType;
  label: string;
  url: string;
  stayId?: string;
  stopId?: string;
  dayId?: string;
}

// ─── Derived / computed helpers ───────────────────────────────────────────────

export interface PacingWarning {
  dayId: string;
  dayNumber: number;
  driveHours: number;
  limit: number;
}

export interface DayWarning {
  id: string;
  dayId: string;
  type: "compliance" | "booking" | "checklist";
  label: string;
  detail: string;
  countryRuleId?: string;
  severity: "critical" | "warning";
}

export interface ReadinessScore {
  overall: number;
  bookings: number;
  compliance: number;
  vehicle: number;
}

export interface BudgetSummary {
  accommodation: { planned: number; actual: number };
  byCategory: Record<BudgetCategory, { planned: number; actual: number }>;
  total: { planned: number; actual: number; remaining: number };
}

// ─── Full app state ───────────────────────────────────────────────────────────

export interface TripState {
  // Data
  trips: Trip[];
  stops: Stop[];
  legs: Leg[];
  days: Day[];
  stays: Stay[];
  checklistItems: ChecklistItem[];
  countryRules: CountryRule[];
  budgetLines: BudgetLine[];
  notes: Note[];
  attachments: Attachment[];

  // UI state
  activeTripId: string | null;
  appMode: AppMode;
  activeView: AppView;
  activeTripView: TripView;
  selectedDayId: string | null;
  executionDayId: string | null;
  expandedDayIds: string[];
  routeLayoutPreference: RouteLayoutPreference;
  displayScale: DisplayScale;
}
