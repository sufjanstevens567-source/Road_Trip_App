export type AppView =
  | "overview"
  | "itinerary"
  | "map"
  | "compliance"
  | "bookings"
  | "budget"
  | "readiness"
  | "notes";

export type RouteVariantId = "bohinj" | "bled";
export type VariantScope = "all" | RouteVariantId;

export type StopKind = "origin" | "city" | "scenic" | "practical" | "finish";

export type BookingStatus =
  | "booked"
  | "researching"
  | "shortlist"
  | "missing";

export type ComplianceStatus = "ready" | "needs-action" | "watch";
export type VehicleStatus = "done" | "todo" | "watch";
export type RiskSeverity = "info" | "warning" | "critical";
export type NoteCategory =
  | "food"
  | "swim-hike"
  | "detour"
  | "parking"
  | "later"
  | "general";
export type BudgetCategory =
  | "accommodation"
  | "tolls"
  | "fuel"
  | "parking"
  | "food"
  | "contingency";

export interface RouteStop {
  id: string;
  name: string;
  country: string;
  kind: StopKind;
  coordinates: [number, number];
  summary: string;
  parkingBias: string;
  markerLabel: string;
  variantScope?: VariantScope;
}

export interface DayChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface RiskItem {
  id: string;
  label: string;
  detail: string;
  severity: RiskSeverity;
  resolved: boolean;
}

export interface TripDay {
  id: string;
  dayNumber: number;
  dateLabel: string;
  title: string;
  routeLabel: string;
  theme: string;
  startStopId: string;
  viaStopIds?: string[];
  endStopId: string;
  overnightStopId: string;
  driveHours: number;
  driveDistanceKm: number;
  overnightLabel: string;
  accommodationName: string;
  accommodationStatus: BookingStatus;
  parkingStrategy: string;
  routeNotes: string;
  highlights: string[];
  tolls: string[];
  risks: RiskItem[];
  checklist: DayChecklistItem[];
  prepItems: string[];
  accommodationDetails: string;
  parkingDetails: string;
  activityIdeas: string[];
  reminders: string[];
  notes: string;
}

export interface Booking {
  id: string;
  stopId: string;
  dateLabel: string;
  city: string;
  propertyName: string;
  status: BookingStatus;
  parkingIncluded: boolean;
  cancellationPolicy: string;
  checkInWindow: string;
  notes: string;
  confirmationCode: string;
  variantScope?: VariantScope;
}

export interface ComplianceItem {
  id: string;
  label: string;
  detail: string;
  status: ComplianceStatus;
  dueBy?: string;
  stopId?: string;
}

export interface ComplianceCountry {
  id: string;
  country: string;
  summary: string;
  parkingStrategy: string;
  documents: string[];
  borderNotes: string;
  commonMistakes: string[];
  items: ComplianceItem[];
  variantScope?: VariantScope;
}

export interface BudgetItem {
  id: string;
  category: BudgetCategory;
  label: string;
  planned: number;
  actual: number;
  dayId?: string;
  variantScope?: VariantScope;
}

export interface VehicleCheck {
  id: string;
  category: "vehicle" | "legal" | "roadside" | "comfort";
  label: string;
  status: VehicleStatus;
  note: string;
}

export interface TripNote {
  id: string;
  category: NoteCategory;
  title: string;
  body: string;
  linkedStopId?: string;
  pinned: boolean;
}

export interface RouteVariantConfig {
  id: RouteVariantId;
  label: string;
  shortLabel: string;
  summary: string;
  travelTone: string;
  tradeoff: string;
  impactSummary: string;
  days: TripDay[];
  stopIds: string[];
}

export interface TripSeed {
  title: string;
  subtitle: string;
  routeSummary: string;
  travelWindow: string;
  travelers: string;
  carLabel: string;
  routeVariants: Record<RouteVariantId, RouteVariantConfig>;
  stops: RouteStop[];
  bookings: Booking[];
  complianceCountries: ComplianceCountry[];
  budgetItems: BudgetItem[];
  vehicleChecks: VehicleCheck[];
  notes: TripNote[];
  defaultExpandedDayIds: string[];
  defaultSelectedDayId: string;
  defaultExecutionDayId: string;
}

export interface TripStateData {
  routeVariant: RouteVariantId;
  activeView: AppView;
  selectedDayId: string;
  executionDayId: string;
  expandedDayIds: string[];
  days: TripDay[];
  bookings: Booking[];
  complianceCountries: ComplianceCountry[];
  budgetItems: BudgetItem[];
  vehicleChecks: VehicleCheck[];
  notes: TripNote[];
}
