import { TRIP_SEED } from "@/data/trip-seed";
import type {
  Booking,
  BookingStatus,
  BudgetCategory,
  BudgetItem,
  ComplianceCountry,
  ComplianceItem,
  NoteCategory,
  RiskItem,
  RouteStop,
  RouteVariantId,
  TripDay,
  TripStateData,
  VehicleCheck,
  VehicleStatus,
} from "@/types/trip";

export function cloneDay(day: TripDay): TripDay {
  return {
    ...day,
    viaStopIds: day.viaStopIds ? [...day.viaStopIds] : undefined,
    highlights: [...day.highlights],
    tolls: [...day.tolls],
    risks: day.risks.map((risk) => ({ ...risk })),
    checklist: day.checklist.map((item) => ({ ...item })),
    prepItems: [...day.prepItems],
    activityIdeas: [...day.activityIdeas],
    reminders: [...day.reminders],
  };
}

export const cloneDays = (days: TripDay[]) => days.map(cloneDay);
export const cloneBookings = (bookings: Booking[]) => bookings.map((item) => ({ ...item }));
export const cloneBudgetItems = (items: BudgetItem[]) => items.map((item) => ({ ...item }));
export const cloneVehicleChecks = (items: VehicleCheck[]) => items.map((item) => ({ ...item }));
export const cloneNotes = <T extends object>(items: T[]) => items.map((item) => ({ ...item }));
export const cloneComplianceCountries = (countries: ComplianceCountry[]) =>
  countries.map((country) => ({
    ...country,
    documents: [...country.documents],
    commonMistakes: [...country.commonMistakes],
    items: country.items.map((item) => ({ ...item })),
  }));

export function isVisibleForVariant(variantScope: "all" | RouteVariantId | undefined, variant: RouteVariantId) {
  return !variantScope || variantScope === "all" || variantScope === variant;
}

export function getVisibleBookings(bookings: Booking[], variant: RouteVariantId) {
  return bookings.filter((booking) => isVisibleForVariant(booking.variantScope, variant));
}

export function getVisibleComplianceCountries(countries: ComplianceCountry[], variant: RouteVariantId) {
  return countries.filter((country) => isVisibleForVariant(country.variantScope, variant));
}

export function getVisibleBudgetItems(items: BudgetItem[], variant: RouteVariantId) {
  return items.filter((item) => isVisibleForVariant(item.variantScope, variant));
}

export function getVisibleStops(variant: RouteVariantId): RouteStop[] {
  const ids = new Set(TRIP_SEED.routeVariants[variant].stopIds);
  return TRIP_SEED.stops.filter((stop) => ids.has(stop.id) || stop.id === "luxembourg");
}

export function getBookingCompletion(bookings: Booking[]) {
  const score = bookings.reduce((acc, booking) => {
    if (booking.status === "booked") return acc + 1;
    if (booking.status === "shortlist") return acc + 0.55;
    if (booking.status === "researching") return acc + 0.25;
    return acc;
  }, 0);
  return Math.round((score / Math.max(bookings.length, 1)) * 100);
}

export function getComplianceCompletion(countries: ComplianceCountry[]) {
  const items = countries.flatMap((country) => country.items);
  const score = items.reduce((acc, item) => {
    if (item.status === "ready") return acc + 1;
    if (item.status === "watch") return acc + 0.55;
    return acc;
  }, 0);
  return Math.round((score / Math.max(items.length, 1)) * 100);
}

export function getVehicleCompletion(checks: VehicleCheck[]) {
  const score = checks.reduce((acc, item) => {
    if (item.status === "done") return acc + 1;
    if (item.status === "watch") return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((score / Math.max(checks.length, 1)) * 100);
}

export function getDayCompletion(day: TripDay) {
  const checklistDone = day.checklist.filter((item) => item.done).length;
  const checklistPct = day.checklist.length ? checklistDone / day.checklist.length : 1;
  const bookingWeight = day.accommodationStatus === "booked" ? 1 : day.accommodationStatus === "shortlist" ? 0.65 : day.accommodationStatus === "researching" ? 0.35 : 0;
  return Math.round((checklistPct * 0.65 + bookingWeight * 0.35) * 100);
}

export const getTotalDriveHours = (days: TripDay[]) => days.reduce((acc, day) => acc + day.driveHours, 0);
export const getTotalDriveDistance = (days: TripDay[]) => days.reduce((acc, day) => acc + day.driveDistanceKm, 0);
export const getMovingDays = (days: TripDay[]) => days.filter((day) => day.driveHours >= 1);

export function formatDriveHours(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
}

export const formatDistance = (km: number) => `${km.toLocaleString()} km`;
export const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function getBudgetSummary(items: BudgetItem[]) {
  const planned = items.reduce((acc, item) => acc + item.planned, 0);
  const actual = items.reduce((acc, item) => acc + item.actual, 0);
  return { planned, actual, remaining: planned - actual };
}

export function getSelectedDay(days: TripDay[], selectedDayId: string) {
  return days.find((day) => day.id === selectedDayId) ?? days[0];
}

export function getTomorrowDay(days: TripDay[], executionDayId: string) {
  const index = Math.max(days.findIndex((day) => day.id === executionDayId), 0);
  return days[Math.min(index + 1, days.length - 1)];
}

export function getVariantComparison(currentVariant: RouteVariantId) {
  const alternativeVariant = currentVariant === "bohinj" ? "bled" : "bohinj";
  const current = TRIP_SEED.routeVariants[currentVariant];
  const alternative = TRIP_SEED.routeVariants[alternativeVariant];
  return {
    alternative,
    driveDeltaHours: Number((getTotalDriveHours(alternative.days) - getTotalDriveHours(current.days)).toFixed(1)),
    distanceDeltaKm: getTotalDriveDistance(alternative.days) - getTotalDriveDistance(current.days),
  };
}

export function getUniqueStopCount(variant: RouteVariantId) {
  return TRIP_SEED.routeVariants[variant].stopIds.length;
}

export function statusToneFromBooking(status: BookingStatus) {
  if (status === "booked") return "success";
  if (status === "shortlist") return "warning";
  if (status === "researching") return "muted";
  return "danger";
}

export function statusToneFromVehicle(status: VehicleStatus) {
  if (status === "done") return "success";
  if (status === "watch") return "warning";
  return "danger";
}

export function statusToneFromCompliance(status: ComplianceItem["status"]) {
  if (status === "ready") return "success";
  if (status === "watch") return "warning";
  return "danger";
}

export function statusToneFromRisk(severity: RiskItem["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "muted";
}

export function getRiskSummary(days: TripDay[]) {
  return days.flatMap((day) =>
    day.risks.filter((risk) => !risk.resolved).map((risk) => ({
      id: `${day.id}-${risk.id}`,
      dayId: day.id,
      dayNumber: day.dayNumber,
      title: risk.label,
      detail: risk.detail,
      severity: risk.severity,
    }))
  );
}

export function getNextActions(state: TripStateData) {
  const bookings = getVisibleBookings(state.bookings, state.routeVariant);
  const compliance = getVisibleComplianceCountries(state.complianceCountries, state.routeVariant);
  return [
    ...bookings
      .filter((booking) => booking.status !== "booked")
      .map((booking) => ({ id: booking.id, tone: statusToneFromBooking(booking.status), title: `Close ${booking.city} stay`, detail: booking.notes })),
    ...compliance.flatMap((country) =>
      country.items
        .filter((item) => item.status === "needs-action")
        .map((item) => ({ id: `${country.id}-${item.id}`, tone: "danger", title: item.label, detail: item.detail }))
    ),
    ...state.vehicleChecks.filter((item) => item.status === "todo").map((item) => ({ id: item.id, tone: "warning", title: item.label, detail: item.note })),
  ].slice(0, 6);
}

export function getBudgetBreakdown(items: BudgetItem[]) {
  const categories = new Map<BudgetCategory, { planned: number; actual: number }>();
  for (const item of items) {
    const current = categories.get(item.category) ?? { planned: 0, actual: 0 };
    current.planned += item.planned;
    current.actual += item.actual;
    categories.set(item.category, current);
  }
  return categories;
}

export function groupVehicleChecks(checks: VehicleCheck[]) {
  return checks.reduce<Record<string, VehicleCheck[]>>((acc, item) => {
    acc[item.category] ??= [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

export function groupNotesByCategory(notes: TripStateData["notes"]) {
  return notes.reduce<Record<NoteCategory, typeof notes>>(
    (acc, note) => {
      acc[note.category].push(note);
      return acc;
    },
    { food: [], "swim-hike": [], detour: [], parking: [], later: [], general: [] }
  );
}
