import type {
  Attachment,
  BudgetLine,
  BudgetSummary,
  ChecklistItem,
  CountryRule,
  Day,
  DayWarning,
  Leg,
  Note,
  PacingWarning,
  ReadinessScore,
  Stay,
  Stop,
  Trip,
  TripState,
} from "@/types/trip";

export interface BorderCrossing {
  fromCountry: string;
  toCountry: string;
  rule: CountryRule | null;
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getActiveTrip(state: TripState): Trip | null {
  return state.trips.find((t) => t.id === state.activeTripId) ?? null;
}

export function getTripStops(state: TripState, tripId: string): Stop[] {
  return state.stops
    .filter((s) => s.tripId === tripId)
    .sort((a, b) => a.position - b.position);
}

export function getTripLegs(state: TripState, tripId: string): Leg[] {
  return state.legs
    .filter((l) => l.tripId === tripId)
    .sort((a, b) => a.order - b.order);
}

export function getTripDays(state: TripState, tripId: string): Day[] {
  return state.days
    .filter((d) => d.tripId === tripId)
    .sort((a, b) => a.dayNumber - b.dayNumber);
}

export function getTripStays(state: TripState, tripId: string): Stay[] {
  return state.stays.filter((s) => s.tripId === tripId);
}

export function getTripChecklist(state: TripState, tripId: string): ChecklistItem[] {
  return state.checklistItems.filter((c) => c.tripId === tripId);
}

export function getTripCountryRules(state: TripState, tripId: string): CountryRule[] {
  return state.countryRules.filter((c) => c.tripId === tripId);
}

export function getTripBudgetLines(state: TripState, tripId: string): BudgetLine[] {
  return state.budgetLines.filter((b) => b.tripId === tripId);
}

export function getTripNotes(state: TripState, tripId: string): Note[] {
  return state.notes
    .filter((n) => n.tripId === tripId)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
}

export function getTripAttachments(state: TripState, tripId: string): Attachment[] {
  return state.attachments.filter((a) => a.tripId === tripId);
}

export function getStayForStop(stays: Stay[], stopId: string): Stay | undefined {
  return stays.find((s) => s.stopId === stopId);
}

export function getLegsForDay(legs: Leg[], day: Day): Leg[] {
  return day.legIds
    .map((id) => legs.find((l) => l.id === id))
    .filter((l): l is Leg => l !== undefined);
}

export function getChecklistForDay(items: ChecklistItem[], dayId: string): ChecklistItem[] {
  return items.filter((i) => i.scope === `day:${dayId}`);
}

export function getChecklistForStop(items: ChecklistItem[], stopId: string): ChecklistItem[] {
  return items.filter((i) => i.scope === `stop:${stopId}`);
}

export function getTripLevelChecklist(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter((i) => i.scope === "trip");
}

export function getNotesForStop(notes: Note[], stopId: string): Note[] {
  return notes.filter((n) => n.stopId === stopId);
}

export function getNotesForDay(notes: Note[], dayId: string): Note[] {
  return notes.filter((n) => n.dayId === dayId);
}

export function getAttachmentsForStay(attachments: Attachment[], stayId: string): Attachment[] {
  return attachments.filter((a) => a.stayId === stayId);
}

// ─── Drive calculations ───────────────────────────────────────────────────────

export function getDayDriveStats(day: Day, legs: Leg[]): { hours: number; km: number } {
  const dayLegs = getLegsForDay(legs, day);
  return {
    hours: dayLegs.reduce((sum, l) => sum + l.driveHours, 0),
    km: dayLegs.reduce((sum, l) => sum + l.distanceKm, 0),
  };
}

export function getTripTotals(days: Day[], legs: Leg[]): { hours: number; km: number } {
  return {
    hours: legs.reduce((sum, l) => sum + l.driveHours, 0),
    km: legs.reduce((sum, l) => sum + l.distanceKm, 0),
  };
}

/** Straight-line distance heuristic with road factor.
 *  Used in wizard when no routing API is available. */
export function estimateDriveStats(
  from: [number, number],
  to: [number, number]
): { distanceKm: number; driveHours: number } {
  const R = 6371;
  const dLat = ((to[0] - from[0]) * Math.PI) / 180;
  const dLon = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from[0] * Math.PI) / 180) *
      Math.cos((to[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const straightKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(straightKm * 1.35); // road factor
  const driveHours = Math.round((distanceKm / 85) * 10) / 10; // avg 85 km/h
  return { distanceKm, driveHours };
}

// ─── Pacing warnings ──────────────────────────────────────────────────────────

export function getPacingWarnings(
  days: Day[],
  legs: Leg[],
  maxHours: number
): PacingWarning[] {
  return days
    .map((day) => {
      const { hours } = getDayDriveStats(day, legs);
      return { dayId: day.id, dayNumber: day.dayNumber, driveHours: hours, limit: maxHours };
    })
    .filter((w) => w.driveHours > w.limit);
}

// ─── Day warnings (compliance + booking) ─────────────────────────────────────

export function getDayWarnings(
  day: Day,
  legs: Leg[],
  countryRules: CountryRule[],
  checklistItems: ChecklistItem[],
  stays: Stay[]
): DayWarning[] {
  const warnings: DayWarning[] = [];
  const dayLegs = getLegsForDay(legs, day);

  // Countries crossed on this day's legs
  const countries = new Set(dayLegs.flatMap((l) => l.countriesCrossed));

  // Surface open compliance items for those countries
  for (const rule of countryRules) {
    if (!countries.has(rule.country)) continue;
    for (const item of rule.items) {
      if (item.status !== "done") {
        warnings.push({
          id: `compliance-${rule.id}-${item.id}`,
          dayId: day.id,
          type: "compliance",
          label: item.label,
          detail: item.detail,
          countryRuleId: rule.id,
          severity: item.status === "todo" ? "critical" : "warning",
        });
      }
    }
  }

  // Booking warning if overnight stay is not booked
  const stay = stays.find((s) => s.stopId === day.overnightStopId);
  if (stay && stay.status !== "booked") {
    warnings.push({
      id: `booking-${stay.id}`,
      dayId: day.id,
      type: "booking",
      label: `${stay.propertyName || "Stay"} not yet booked`,
      detail: stay.status === "researching" ? "Still researching — confirm soon." : "Shortlisted — ready to book.",
      severity: stay.status === "researching" ? "critical" : "warning",
    });
  }

  // Checklist items for this day that are overdue / not done
  const dayChecklist = checklistItems.filter(
    (i) => i.scope === `day:${day.id}` && !i.done
  );
  for (const item of dayChecklist) {
    warnings.push({
      id: `checklist-${item.id}`,
      dayId: day.id,
      type: "checklist",
      label: item.label,
      detail: item.dueBy ? `Due: ${item.dueBy}` : "",
      severity: "warning",
    });
  }

  return warnings;
}

// ─── Readiness score ──────────────────────────────────────────────────────────

export function getBookingCompletion(stays: Stay[]): number {
  if (!stays.length) return 100;
  const score = stays.reduce((acc, s) => {
    if (s.status === "booked") return acc + 1;
    if (s.status === "shortlisted") return acc + 0.55;
    return acc + 0.25;
  }, 0);
  return Math.round((score / stays.length) * 100);
}

export function getComplianceCompletion(rules: CountryRule[]): number {
  const items = rules.flatMap((r) => r.items);
  if (!items.length) return 100;
  const score = items.reduce((acc, i) => {
    if (i.status === "done") return acc + 1;
    if (i.status === "in-progress") return acc + 0.55;
    return acc;
  }, 0);
  return Math.round((score / items.length) * 100);
}

export function getVehicleCompletion(items: ChecklistItem[]): number {
  const vehicle = items.filter((i) => i.category === "vehicle" || i.category === "safety-kit");
  if (!vehicle.length) return 100;
  const done = vehicle.filter((i) => i.done).length;
  return Math.round((done / vehicle.length) * 100);
}

export function getTripReadiness(
  stays: Stay[],
  rules: CountryRule[],
  vehicleItems: ChecklistItem[]
): ReadinessScore {
  const bookings = getBookingCompletion(stays);
  const compliance = getComplianceCompletion(rules);
  const vehicle = getVehicleCompletion(vehicleItems);
  return {
    bookings,
    compliance,
    vehicle,
    overall: Math.round((bookings + compliance + vehicle) / 3),
  };
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export function getBudgetSummary(stays: Stay[], lines: BudgetLine[]): BudgetSummary {
  const accPlanned = stays.reduce((s, stay) => s + stay.costPlanned, 0);
  const accActual = stays.reduce((s, stay) => s + stay.costActual, 0);

  const categories = ["fuel", "tolls", "food", "activities", "parking", "other"] as const;
  const byCategory = Object.fromEntries(
    categories.map((cat) => {
      const catLines = lines.filter((l) => l.category === cat);
      return [cat, {
        planned: catLines.reduce((s, l) => s + l.planned, 0),
        actual: catLines.reduce((s, l) => s + l.actual, 0),
      }];
    })
  ) as BudgetSummary["byCategory"];

  const nonAccPlanned = Object.values(byCategory).reduce((s, v) => s + v.planned, 0);
  const nonAccActual = Object.values(byCategory).reduce((s, v) => s + v.actual, 0);

  return {
    accommodation: { planned: accPlanned, actual: accActual },
    byCategory,
    total: {
      planned: accPlanned + nonAccPlanned,
      actual: accActual + nonAccActual,
      remaining: (accPlanned + nonAccPlanned) - (accActual + nonAccActual),
    },
  };
}

// ─── Countries on route ───────────────────────────────────────────────────────

export function getCountriesOnRoute(legs: Leg[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const leg of legs) {
    for (const c of leg.countriesCrossed) {
      if (!seen.has(c)) { seen.add(c); result.push(c); }
    }
  }
  return result;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatDriveHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatDistance(km: number): string {
  return `${km.toLocaleString()} km`;
}

export function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Day for today ────────────────────────────────────────────────────────────

export function getDayForDate(days: Day[], isoDate: string): Day | null {
  return days.find((d) => d.date === isoDate) ?? null;
}

export function getCurrentExecutionDay(days: Day[], executionDayId?: string | null): Day {
  if (executionDayId) {
    const matchedDay = days.find((day) => day.id === executionDayId);
    if (matchedDay) return matchedDay;
  }

  const today = todayISO();
  return (
    getDayForDate(days, today) ??
    days[days.length - 1] ??
    days[0]
  );
}

export function getNextExecutionDay(days: Day[], currentDayId: string): Day | null {
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const index = sortedDays.findIndex((day) => day.id === currentDayId);
  if (index === -1 || index >= sortedDays.length - 1) return null;
  return sortedDays[index + 1];
}

export function getBorderCrossings(day: Day, legs: Leg[], countryRules: CountryRule[]): BorderCrossing[] {
  const dayLegs = getLegsForDay(legs, day);
  const transitions: BorderCrossing[] = [];
  let previousCountry: string | null = null;

  for (const leg of dayLegs) {
    for (const country of leg.countriesCrossed) {
      if (!country) continue;
      if (previousCountry && previousCountry !== country) {
        transitions.push({
          fromCountry: previousCountry,
          toCountry: country,
          rule: countryRules.find((rule) => rule.country === country) ?? null,
        });
      }
      previousCountry = country;
    }
  }

  return transitions.filter(
    (transition, index, all) =>
      all.findIndex(
        (entry) => entry.fromCountry === transition.fromCountry && entry.toCountry === transition.toCountry
      ) === index
  );
}

// ─── ID generation ────────────────────────────────────────────────────────────

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
