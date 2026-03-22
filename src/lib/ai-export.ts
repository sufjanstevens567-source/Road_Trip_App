import {
  formatDate,
  formatDistance,
  formatDriveHours,
  getActiveTrip,
  getBudgetSummary,
  getCountriesOnRoute,
  getDayDriveStats,
  getDayWarnings,
  getPacingWarnings,
  getTripBudgetLines,
  getTripChecklist,
  getTripCountryRules,
  getTripDays,
  getTripLegs,
  getTripNotes,
  getTripReadiness,
  getTripStays,
  getTripStops,
  getTripTotals,
} from "@/lib/trip-utils";
import type { Day, DayWarning, TripState } from "@/types/trip";

export type AiHelpGoalId = "route" | "pacing" | "stays" | "budget" | "prep" | "review";
export type AiShareSection = "route" | "itinerary" | "stays" | "budget" | "prep" | "notes";

export interface AiHelpRequest {
  goals: AiHelpGoalId[];
  specificRequest: string;
  includedSections: AiShareSection[];
  includeSensitiveDetails: boolean;
}

export interface AiExportBundle {
  filenameBase: string;
  markdown: string;
  json: string;
  context: Record<string, unknown>;
}

export interface AiPreviewSummary {
  focusLine: string;
  includeLine: string;
  sensitiveLine: string;
  noteLine?: string;
  taskLines: string[];
}

export const AI_ALWAYS_INCLUDED_SECTIONS: AiShareSection[] = ["route", "itinerary"];

export const AI_SHARE_SECTIONS: Array<{
  id: AiShareSection;
  label: string;
  description: string;
  required?: boolean;
}> = [
  { id: "route", label: "Route", description: "Stop order, drive legs, and route structure.", required: true },
  { id: "itinerary", label: "Itinerary", description: "Day-by-day pacing, dates, and day warnings.", required: true },
  { id: "stays", label: "Stays", description: "Overnight stops, booking status, and parking context." },
  { id: "budget", label: "Budget", description: "Planned spend, actual spend, and category totals." },
  { id: "prep", label: "Travel prep", description: "Country rules, documents, and open prep items." },
  { id: "notes", label: "Notes", description: "Pinned notes, tagged notes, and planning context." },
];

export const AI_OPTIONAL_SHARE_SECTIONS = AI_SHARE_SECTIONS.filter((section) => !section.required);

export const AI_HELP_GOALS: Array<{
  id: AiHelpGoalId;
  label: string;
  description: string;
  focus: string;
  previewLabel: string;
  suggestedTasks: string[];
}> = [
  {
    id: "route",
    label: "Improve the route",
    description: "Look at stop order, route logic, and possible alternatives.",
    focus: "Review the route shape, stop order, optional detours, and whether the overall structure feels coherent.",
    previewLabel: "route quality",
    suggestedTasks: [
      "Review whether the current stop order is the strongest version of the trip.",
      "Suggest cleaner sequencing or stronger route logic if needed.",
      "Call out optional stops that are adding complexity without much benefit.",
    ],
  },
  {
    id: "pacing",
    label: "Check the pacing",
    description: "Review long drive days, rest days, and overnight balance.",
    focus: "Review drive times, overnight spacing, and any days that feel too ambitious or too loose.",
    previewLabel: "pacing",
    suggestedTasks: [
      "Identify days that are longer than the preferred drive limit.",
      "Suggest pacing improvements without changing the overall character of the trip.",
      "Call out where an extra stop or merged day would make the trip feel smoother.",
    ],
  },
  {
    id: "stays",
    label: "Find better stays",
    description: "Review overnights, booking gaps, and parking-friendly options.",
    focus: "Review overnight choices, booking status, parking needs, and where better accommodation decisions would improve the trip.",
    previewLabel: "stay quality",
    suggestedTasks: [
      "Identify which overnight stops still need accommodation decisions.",
      "Suggest better types of stays based on the route and parking needs.",
      "Point out any stays that look weak, risky, or poorly placed for the route.",
    ],
  },
  {
    id: "budget",
    label: "Review the budget",
    description: "Check planned costs, open spending areas, and realism.",
    focus: "Review accommodation spend, budget line items, and whether the overall trip budget feels realistic.",
    previewLabel: "budget realism",
    suggestedTasks: [
      "Review whether the total budget looks realistic for this trip.",
      "Point out categories that seem underplanned or overplanned.",
      "Suggest where cost-saving changes would have the least impact on the trip experience.",
    ],
  },
  {
    id: "prep",
    label: "Check travel prep",
    description: "Review country rules, open items, and readiness risks.",
    focus: "Review country requirements, unresolved prep items, and anything that could cause friction before departure.",
    previewLabel: "travel prep",
    suggestedTasks: [
      "Identify the most important unresolved travel requirements.",
      "Highlight countries or documents that still need attention.",
      "Call out anything that could become a last-minute risk if ignored.",
    ],
  },
  {
    id: "review",
    label: "Review the whole trip",
    description: "Give a broad critique across route, pacing, stays, budget, and prep.",
    focus: "Review the trip as a whole and identify the highest-impact improvements across the route, pacing, stays, budget, and prep.",
    previewLabel: "the whole trip",
    suggestedTasks: [
      "Give the top improvements that would make this trip stronger overall.",
      "Identify the main risks, weak spots, or unfinished decisions.",
      "Suggest changes that improve the trip without losing its original intent.",
    ],
  },
];

export function buildAiExportBundle(state: TripState, tripId: string, request: AiHelpRequest): AiExportBundle {
  const trip = getActiveTrip({ ...state, activeTripId: tripId });
  if (!trip) {
    throw new Error("No active trip found for AI export.");
  }

  const goals = resolveGoals(request.goals);
  const includedSections = resolveIncludedSections(request.includedSections);

  const stops = getTripStops(state, tripId);
  const legs = getTripLegs(state, tripId);
  const days = getTripDays(state, tripId);
  const stays = getTripStays(state, tripId);
  const checklist = getTripChecklist(state, tripId);
  const rules = getTripCountryRules(state, tripId);
  const budgetLines = getTripBudgetLines(state, tripId);
  const notes = getTripNotes(state, tripId);

  const totals = getTripTotals(days, legs);
  const pacingWarnings = getPacingWarnings(days, legs, trip.maxDriveHoursPerDay);
  const readiness = getTripReadiness(stays, rules, checklist);
  const budgetSummary = getBudgetSummary(stays, budgetLines);
  const countriesOnRoute = getCountriesOnRoute(legs);
  const exportedAt = new Date().toISOString();
  const openQuestions = buildOpenQuestions(days, stays, rules, checklist, legs, stops, includedSections);
  const planningRisks = buildPlanningRisks(days, stays, rules, legs, trip.maxDriveHoursPerDay, includedSections);
  const suggestedTasks = buildSuggestedTasks(goals);
  const preview = buildAiPreviewSummary(request);

  const summary: Record<string, unknown> = {
    route_title: `${stops[0]?.name ?? "Origin"} -> ${stops[stops.length - 1]?.name ?? "Destination"}`,
    stop_count: stops.length,
    day_count: days.length,
    total_distance_km: totals.km,
    total_distance_label: formatDistance(totals.km),
    total_drive_hours: totals.hours,
    total_drive_time_label: formatDriveHours(totals.hours),
    countries_on_route: countriesOnRoute,
    pacing_warning_count: pacingWarnings.length,
  };

  if (includedSections.includes("stays")) {
    summary.booked_stays = stays.filter((stay) => stay.status === "booked").length;
    summary.open_stays = stays.filter((stay) => stay.status !== "booked").length;
    summary.readiness = {
      stays: readiness.bookings,
    };
  }

  if (includedSections.includes("prep")) {
    summary.readiness = {
      ...(typeof summary.readiness === "object" && summary.readiness ? (summary.readiness as Record<string, unknown>) : {}),
      travel_prep: readiness.compliance,
      overall: readiness.overall,
    };
  }

  const context: Record<string, unknown> = {
    exported_at: exportedAt,
    ai_request: {
      goal_ids: goals.map((goal) => goal.id),
      goal_labels: goals.map((goal) => goal.label),
      focus_areas: goals.map((goal) => goal.focus),
      preview_summary: preview.focusLine,
      specific_request: request.specificRequest.trim() || null,
      included_sections: includedSections,
      include_sensitive_details: request.includeSensitiveDetails,
      suggested_tasks: suggestedTasks,
    },
    trip: {
      id: trip.id,
      name: trip.name,
      status: trip.status,
      start_date: trip.startDate,
      end_date: trip.endDate,
      travelers: trip.travelers,
      vehicle: trip.vehicle,
      currency: trip.currency,
      max_drive_hours_per_day: trip.maxDriveHoursPerDay,
      created_at: trip.createdAt,
    },
    summary,
    route: {
      stops: stops.map((stop) => {
        const stay = stays.find((entry) => entry.stopId === stop.id);
        return {
          id: stop.id,
          position: stop.position + 1,
          name: stop.name,
          country: stop.country,
          type: stop.type,
          is_alternative: stop.isAlternative,
          tags: stop.tags,
          ...(includedSections.includes("stays") ? { stay_status: stay?.status ?? null } : {}),
          ...(includedSections.includes("notes") && request.includeSensitiveDetails && stop.notes ? { notes: stop.notes } : {}),
        };
      }),
      legs: legs.map((leg) => {
        const fromStop = stops.find((stop) => stop.id === leg.fromStopId);
        const toStop = stops.find((stop) => stop.id === leg.toStopId);
        return {
          id: leg.id,
          order: leg.order + 1,
          from: fromStop?.name ?? "Unknown",
          to: toStop?.name ?? "Unknown",
          distance_km: leg.distanceKm,
          distance_label: formatDistance(leg.distanceKm),
          drive_hours: leg.driveHours,
          drive_time_label: formatDriveHours(leg.driveHours),
          countries_crossed: leg.countriesCrossed,
          toll_notes: leg.tollNotes || null,
          risk_notes: leg.riskNotes || null,
        };
      }),
    },
    itinerary: {
      days: days.map((day) =>
        buildDayContext(day, legs, stops, stays, rules, checklist, includedSections, request.includeSensitiveDetails)
      ),
    },
    open_questions: openQuestions,
    planning_risks: planningRisks,
  };

  if (includedSections.includes("stays")) {
    context.stays = {
      summary: budgetSummary.accommodation,
      items: stays.map((stay) => {
        const stop = stops.find((entry) => entry.id === stay.stopId);
        return {
          id: stay.id,
          stop_name: stop?.name ?? null,
          property_name: stay.propertyName || null,
          status: stay.status,
          check_in: stay.checkIn,
          check_out: stay.checkOut,
          parking_included: stay.parkingIncluded,
          planned_cost: stay.costPlanned,
          actual_cost: stay.costActual,
          ...(request.includeSensitiveDetails
            ? {
                address: stay.address || null,
                booking_url: stay.bookingUrl || null,
                confirmation_code: stay.confirmationCode || null,
                parking_notes: stay.parkingNotes || null,
                check_in_window: stay.checkInWindow || null,
                cancellation_policy: stay.cancellationPolicy || null,
                notes: stay.notes || null,
              }
            : {}),
        };
      }),
    };
  }

  if (includedSections.includes("budget")) {
    context.budget = {
      summary: budgetSummary,
      lines: budgetLines.map((line) => ({
        id: line.id,
        category: line.category,
        label: line.label || null,
        planned: line.planned,
        actual: line.actual,
        stop_id: line.stopId ?? null,
        day_id: line.dayId ?? null,
      })),
    };
  }

  if (includedSections.includes("prep")) {
    context.prep = {
      countries: rules.map((rule) => ({
        id: rule.id,
        country: rule.country,
        documents: rule.documents,
        vignette_required: rule.vignetteRequired,
        vignette_url: rule.vignetteUrl || null,
        border_notes: rule.borderNotes || null,
        toll_notes: rule.tollNotes || null,
        speed_limit_notes: rule.speedLimitNotes || null,
        emission_zone_notes: rule.emissionZoneNotes || null,
        common_mistakes: rule.commonMistakes,
        items: rule.items.map((item) => ({
          id: item.id,
          label: item.label,
          detail: item.detail,
          status: item.status,
          due_by: item.dueBy ?? null,
        })),
      })),
    };
  }

  if (includedSections.includes("notes")) {
    context.notes = request.includeSensitiveDetails
      ? {
          count: notes.length,
          pinned_count: notes.filter((note) => note.pinned).length,
          items: notes.map((note) => ({
            id: note.id,
            title: note.title,
            body: note.body,
            tags: note.tags,
            pinned: note.pinned,
            stop_id: note.stopId ?? null,
            day_id: note.dayId ?? null,
            created_at: note.createdAt,
          })),
        }
      : {
          count: notes.length,
          pinned_count: notes.filter((note) => note.pinned).length,
          tags: Array.from(new Set(notes.flatMap((note) => note.tags))).sort(),
        };
  }

  const json = JSON.stringify(context, null, 2);
  const markdown = buildAiMarkdown({
    trip,
    goals,
    request,
    includedSections,
    stops,
    days,
    stays,
    rules,
    budgetSummary,
    openQuestions,
    planningRisks,
    totals,
    readiness,
    suggestedTasks,
    json,
  });

  return {
    filenameBase: slugify(trip.name || "trip"),
    markdown,
    json,
    context,
  };
}

export function buildAiPreviewSummary(request: AiHelpRequest): AiPreviewSummary {
  if (request.goals.length === 0) {
    const includedSections = resolveIncludedSections(request.includedSections);
    const shareLabels = includedSections.map((sectionId) => sectionLabel(sectionId));

    return {
      focusLine: "Choose at least one area so the AI knows what kind of help you want.",
      includeLine: `If you continue, it will receive ${formatList(shareLabels.map((label) => label.toLowerCase()))}.`,
      sensitiveLine: request.includeSensitiveDetails
        ? "Sensitive booking references and personal notes will be included."
        : "Sensitive booking references and personal notes will stay out of the export.",
      noteLine: request.specificRequest.trim() ? `Your note: ${request.specificRequest.trim()}` : undefined,
      taskLines: [],
    };
  }

  const goals = resolveGoals(request.goals);
  const includedSections = resolveIncludedSections(request.includedSections);
  const suggestedTasks = buildSuggestedTasks(goals);
  const shareLabels = includedSections.map((sectionId) => sectionLabel(sectionId));

  return {
    focusLine:
      goals.length === 1
        ? `The AI will focus on ${goals[0].previewLabel}.`
        : `The AI will focus on ${formatList(goals.map((goal) => goal.previewLabel))}.`,
    includeLine: `It will receive ${formatList(shareLabels.map((label) => label.toLowerCase()))}.`,
    sensitiveLine: request.includeSensitiveDetails
      ? "Sensitive booking references and personal notes will be included."
      : "Sensitive booking references and personal notes will stay out of the export.",
    noteLine: request.specificRequest.trim() ? `Your note: ${request.specificRequest.trim()}` : undefined,
    taskLines: suggestedTasks,
  };
}

function buildDayContext(
  day: Day,
  legs: TripState["legs"],
  stops: TripState["stops"],
  stays: TripState["stays"],
  rules: TripState["countryRules"],
  checklist: TripState["checklistItems"],
  includedSections: AiShareSection[],
  includeSensitiveDetails: boolean
) {
  const included = new Set(includedSections);
  const stats = getDayDriveStats(day, legs);
  const overnightStop = stops.find((stop) => stop.id === day.overnightStopId);
  const dayStay = stays.find((stay) => stay.stopId === day.overnightStopId);
  const warnings = getDayWarnings(day, legs, rules, checklist, stays).filter((warning) => shouldIncludeWarning(warning, included));
  const dayLegs = day.legIds
    .map((legId) => legs.find((leg) => leg.id === legId))
    .filter((leg): leg is NonNullable<typeof leg> => Boolean(leg));

  return {
    id: day.id,
    day_number: day.dayNumber,
    date: day.date,
    date_label: formatDate(day.date),
    type: day.type,
    drive_hours: stats.hours,
    drive_time_label: formatDriveHours(stats.hours),
    distance_km: stats.km,
    distance_label: formatDistance(stats.km),
    overnight_stop: overnightStop?.name ?? null,
    ...(included.has("stays") ? { stay_status: dayStay?.status ?? null } : {}),
    route: dayLegs.map((leg) => ({
      from: stops.find((stop) => stop.id === leg.fromStopId)?.name ?? "Unknown",
      to: stops.find((stop) => stop.id === leg.toStopId)?.name ?? "Unknown",
      drive_time_label: formatDriveHours(leg.driveHours),
      distance_label: formatDistance(leg.distanceKm),
    })),
    warnings: warnings.map((warning) => ({
      label: warning.label,
      detail: warning.detail,
      severity: warning.severity,
      type: warning.type,
    })),
    ...(included.has("notes") && includeSensitiveDetails && day.notes ? { notes: day.notes } : {}),
  };
}

function buildOpenQuestions(
  days: TripState["days"],
  stays: TripState["stays"],
  rules: TripState["countryRules"],
  checklist: TripState["checklistItems"],
  legs: TripState["legs"],
  stops: TripState["stops"],
  includedSections: AiShareSection[]
) {
  const included = new Set(includedSections);
  const questions: string[] = [];
  const openStays = stays.filter((stay) => stay.status !== "booked");
  const missingStayDays = days.filter((day) => !stays.find((stay) => stay.stopId === day.overnightStopId));
  const openRuleItems = rules.flatMap((rule) => rule.items.filter((item) => item.status !== "done"));
  const dayWarnings = days.flatMap((day) =>
    getDayWarnings(day, legs, rules, checklist, stays).filter((warning) => shouldIncludeWarning(warning, included))
  );
  const alternativeStops = stops.filter((stop) => stop.isAlternative);

  if (included.has("stays") && openStays.length > 0) {
    questions.push(`${openStays.length} stays are still not booked.`);
  }
  if (included.has("stays") && missingStayDays.length > 0) {
    questions.push(`${missingStayDays.length} itinerary days still have no stay attached.`);
  }
  if (included.has("prep") && openRuleItems.length > 0) {
    questions.push(`${openRuleItems.length} travel requirement items are still open.`);
  }
  if (dayWarnings.length > 0) {
    questions.push(`${dayWarnings.length} day-level warnings are still unresolved.`);
  }
  if (alternativeStops.length > 0) {
    questions.push(`${alternativeStops.length} optional stops are still in the route and may need a decision.`);
  }

  return questions;
}

function buildPlanningRisks(
  days: TripState["days"],
  stays: TripState["stays"],
  rules: TripState["countryRules"],
  legs: TripState["legs"],
  maxDriveHoursPerDay: number,
  includedSections: AiShareSection[]
) {
  const included = new Set(includedSections);
  const risks: string[] = [];
  const pacingWarnings = getPacingWarnings(days, legs, maxDriveHoursPerDay);
  const researchingStays = stays.filter((stay) => stay.status === "researching");
  const openTodoItems = rules.flatMap((rule) => rule.items.filter((item) => item.status === "todo"));

  pacingWarnings.slice(0, 3).forEach((warning) => {
    risks.push(`Day ${warning.dayNumber} runs ${formatDriveHours(warning.driveHours)} against a ${warning.limit}h target.`);
  });

  if (included.has("stays") && researchingStays.length > 0) {
    risks.push(`${researchingStays.length} stays are still only in researching mode, which keeps overnight planning loose.`);
  }

  if (included.has("prep") && openTodoItems.length > 0) {
    risks.push(`${openTodoItems.length} travel requirement items are still untouched.`);
  }

  return risks;
}

function buildAiMarkdown({
  trip,
  goals,
  request,
  includedSections,
  stops,
  days,
  stays,
  rules,
  budgetSummary,
  openQuestions,
  planningRisks,
  totals,
  readiness,
  suggestedTasks,
  json,
}: {
  trip: TripState["trips"][number];
  goals: (typeof AI_HELP_GOALS)[number][];
  request: AiHelpRequest;
  includedSections: AiShareSection[];
  stops: TripState["stops"];
  days: TripState["days"];
  stays: TripState["stays"];
  rules: TripState["countryRules"];
  budgetSummary: ReturnType<typeof getBudgetSummary>;
  openQuestions: string[];
  planningRisks: string[];
  totals: ReturnType<typeof getTripTotals>;
  readiness: ReturnType<typeof getTripReadiness>;
  suggestedTasks: string[];
  json: string;
}) {
  const shareLabels = includedSections.map((sectionId) => sectionLabel(sectionId));
  const routeTitle = `${stops[0]?.name ?? "Origin"} -> ${stops[stops.length - 1]?.name ?? "Destination"}`;
  const bookedStays = stays.filter((stay) => stay.status === "booked").length;

  return [
    "# Help request",
    `I want help with: ${formatList(goals.map((goal) => goal.label))}`,
    "",
    request.specificRequest.trim()
      ? `Specific request: ${request.specificRequest.trim()}`
      : "Specific request: Use the trip context below to suggest the strongest improvements.",
    "",
    "## What the AI will get",
    `- Focus areas: ${formatList(goals.map((goal) => goal.previewLabel))}`,
    `- Shared sections: ${formatList(shareLabels)}`,
    `- Sensitive details: ${request.includeSensitiveDetails ? "Included" : "Excluded"}`,
    "",
    "## How to approach this",
    ...goals.map((goal) => `- ${goal.focus}`),
    "",
    "## Trip at a glance",
    `- Trip: ${trip.name}`,
    `- Route: ${routeTitle}`,
    `- Dates: ${trip.startDate || "TBD"} to ${trip.endDate || "TBD"}`,
    `- Stops: ${stops.length}`,
    `- Days: ${days.length}`,
    `- Total distance: ${formatDistance(totals.km)}`,
    `- Total drive time: ${formatDriveHours(totals.hours)}`,
    ...(includedSections.includes("stays") ? [`- Booked stays: ${bookedStays}/${stays.length}`] : []),
    ...(includedSections.includes("prep") ? [`- Travel rules complete: ${readiness.compliance}%`] : []),
    ...(includedSections.includes("budget") ? [`- Budget planned: ${budgetSummary.total.planned.toLocaleString()} ${trip.currency}`] : []),
    "",
    "## What is already decided",
    `- The route runs from ${stops[0]?.name ?? "the origin"} to ${stops[stops.length - 1]?.name ?? "the destination"}.`,
    `- The trip currently has ${days.length} planned days.`,
    ...(includedSections.includes("stays") ? [`- ${stays.length} stay records are currently in the plan.`] : []),
    ...(includedSections.includes("prep") ? [`- There are ${rules.length} country requirement sets in the prep plan.`] : []),
    "",
    "## What still needs attention",
    ...(openQuestions.length > 0 ? openQuestions.map((item) => `- ${item}`) : ["- No major open questions are currently flagged in the shared context."]),
    "",
    "## Planning risks",
    ...(planningRisks.length > 0 ? planningRisks.map((item) => `- ${item}`) : ["- No major planning risks are currently flagged in the shared context."]),
    "",
    "## Suggested tasks for the AI",
    ...suggestedTasks.map((task) => `- ${task}`),
    "",
    "## Structured trip context",
    "```json",
    json,
    "```",
  ].join("\n");
}

function resolveGoals(goalIds: AiHelpGoalId[]) {
  const selectedIds = goalIds.length > 0 ? goalIds : [AI_HELP_GOALS[0].id];
  return AI_HELP_GOALS.filter((goal) => selectedIds.includes(goal.id));
}

function resolveIncludedSections(sectionIds: AiShareSection[]) {
  const selected = new Set<AiShareSection>([...AI_ALWAYS_INCLUDED_SECTIONS, ...sectionIds]);
  return AI_SHARE_SECTIONS.filter((section) => selected.has(section.id)).map((section) => section.id);
}

function buildSuggestedTasks(goals: Array<(typeof AI_HELP_GOALS)[number]>) {
  return Array.from(new Set(goals.flatMap((goal) => goal.suggestedTasks)));
}

function shouldIncludeWarning(warning: DayWarning, includedSections: Set<AiShareSection>) {
  if (warning.type === "booking") return includedSections.has("stays");
  if (warning.type === "compliance") return includedSections.has("prep");
  return true;
}

function sectionLabel(sectionId: AiShareSection) {
  return AI_SHARE_SECTIONS.find((section) => section.id === sectionId)?.label ?? sectionId;
}

function formatList(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
