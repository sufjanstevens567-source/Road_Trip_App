"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, MoreHorizontal, NotebookText, Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import {
  formatDate,
  formatDistance,
  formatDriveHours,
  getActiveTrip,
  getDayDriveStats,
  getDayWarnings,
  getLegsForDay,
  getTripChecklist,
  getTripCountryRules,
  getTripDays,
  getTripLegs,
  getTripStays,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SectionLead, StatusPill, bookingTone, toneDotClass, warningTone } from "@/components/shared/ui-helpers";
import type { Day, DayWarning, Leg, Stay, Stop } from "@/types/trip";

interface GeoResult {
  name: string;
  country: string;
  coordinates: [number, number];
  displayName: string;
}

async function geocode(query: string): Promise<GeoResult[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await response.json();

    return data.map((result: Record<string, unknown>) => ({
      name: (result.name as string) || (result.display_name as string).split(",")[0],
      country: ((result.address as Record<string, string>)?.country) || "",
      coordinates: [parseFloat(result.lat as string), parseFloat(result.lon as string)] as [number, number],
      displayName: result.display_name as string,
    }));
  } catch {
    return [];
  }
}

export function ItineraryView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const tripId = activeTrip?.id ?? "";

  const days = getTripDays(state, tripId);
  const legs = getTripLegs(state, tripId);
  const stays = getTripStays(state, tripId);
  const rules = getTripCountryRules(state, tripId);
  const checklistItems = getTripChecklist(state, tripId);
  const stops = state.stops.filter((stop) => stop.tripId === tripId).sort((a, b) => a.position - b.position);

  const expandedDayIds = useTripStore((s) => s.expandedDayIds);
  const toggleExpandedDay = useTripStore((s) => s.toggleExpandedDay);
  const expandAllDays = useTripStore((s) => s.expandAllDays);
  const collapseAllDays = useTripStore((s) => s.collapseAllDays);
  const updateDay = useTripStore((s) => s.updateDay);
  const removeDay = useTripStore((s) => s.removeDay);
  const splitDay = useTripStore((s) => s.splitDay);
  const mergeDayWithNext = useTripStore((s) => s.mergeDayWithNext);
  const insertStopAfterLeg = useTripStore((s) => s.insertStopAfterLeg);
  const toggleChecklistItem = useTripStore((s) => s.toggleChecklistItem);
  const setActiveView = useTripStore((s) => s.setActiveView);

  const [menuDayId, setMenuDayId] = useState<string | null>(null);
  const [insertAfterLegId, setInsertAfterLegId] = useState<string | null>(null);

  const totalDriveHours = legs.reduce((sum, leg) => sum + leg.driveHours, 0);
  const driveDayCount = days.filter((day) => day.type !== "rest").length;
  const restDayCount = days.filter((day) => day.type === "rest").length;

  if (!activeTrip) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <SectionLead
          eyebrow="Plan"
          title="Itinerary"
          description={`${days.length} day${days.length !== 1 ? "s" : ""} arranged as readable route chapters.`}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => expandAllDays(activeTrip.id)}>
            Expand all
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAllDays}>
            Collapse all
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricTile label="Total days" value={`${days.length}`} />
          <MetricTile label="Drive days" value={`${driveDayCount}`} />
          <MetricTile label="Rest days" value={`${restDayCount}`} />
          <MetricTile label="Total hours" value={formatDriveHours(totalDriveHours)} />
        </div>
      </Card>

      <div className="mx-auto max-w-5xl space-y-3">
        {days.length === 0 ? (
          <EmptyState
            title="No itinerary days yet"
            description="Add route legs and overnight anchors, then the day-by-day trip rhythm will assemble here."
          />
        ) : (
          days.map((day, index) => {
            const dayLegs = getLegsForDay(legs, day);
            const dayStay = stays.find((stay) => stay.stopId === day.overnightStopId);
            const warnings = getDayWarnings(day, legs, rules, checklistItems, stays);
            const dayChecklist = checklistItems.filter((item) => item.scope === `day:${day.id}`);
            const checkedCount = dayChecklist.filter((item) => item.done).length;
            const dayStats = getDayDriveStats(day, legs);
            const isExpanded = expandedDayIds.includes(day.id);
            const summary = buildDaySummary(day, dayLegs, stops);
            const status = getDayStatus(day, dayStay, warnings);
            const accentClass = getDayAccentClass(day, status.tone);
            const nextDay = days[index + 1];

            return (
              <Card
                key={day.id}
                className={`overflow-hidden border border-slate-200 bg-white ${accentClass} ${day.type === "rest" ? "bg-slate-50/75" : ""}`}
              >
                <div className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50/70">
                  <button type="button" className="flex-1 text-left" onClick={() => toggleExpandedDay(day.id)}>
                    <div className="grid gap-4 lg:grid-cols-[9rem_minmax(0,1fr)_13rem] lg:items-center">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Day {day.dayNumber}</p>
                        <p className="text-lg font-semibold tracking-tight text-slate-950">{formatDate(day.date)}</p>
                        <p className="text-xs text-slate-500">{summary.typeLabel}</p>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950">{summary.routeLabel}</h3>
                          <StatusPill label={summary.dayType} tone="muted" />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{summary.caption}</p>
                      </div>

                      <div className="flex items-center justify-between gap-4 lg:justify-end">
                        <div className="text-right">
                          <p className="text-2xl font-semibold tracking-tight text-slate-950">
                            {dayLegs.length > 0 ? formatDriveHours(dayStats.hours) : "No drive"}
                          </p>
                          <p className="text-xs text-slate-500">{dayLegs.length > 0 ? formatDistance(dayStats.km) : "Rest rhythm"}</p>
                        </div>
                        <div className="min-w-[6.5rem] text-right">
                          <div className="flex items-center justify-end gap-2 text-xs font-medium text-slate-700">
                            <span className={`size-2 rounded-full ${toneDotClass(status.tone)}`} />
                            <span>{status.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="relative flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => toggleExpandedDay(day.id)}>
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => setMenuDayId((current) => (current === day.id ? null : day.id))}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                    {menuDayId === day.id && (
                      <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_50px_rgba(15,23,42,0.15)]">
                        {dayLegs.length > 0 && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                            onClick={() => {
                              splitDay(day.id);
                              setMenuDayId(null);
                            }}
                          >
                            <Plus className="size-3.5" /> Split day
                          </button>
                        )}
                        {nextDay && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                            onClick={() => {
                              mergeDayWithNext(day.id);
                              setMenuDayId(null);
                            }}
                          >
                            <RouteIcon className="size-3.5" /> Merge with next
                          </button>
                        )}
                        {days.length > 1 && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-700 transition-colors hover:bg-rose-50"
                            onClick={() => {
                              removeDay(day.id);
                              setMenuDayId(null);
                            }}
                          >
                            <Trash2 className="size-3.5" /> Remove day
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                  aria-hidden={!isExpanded}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="border-t border-slate-200 bg-slate-50/45 p-4">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                        <div className="space-y-4 xl:order-1">
                          <Card className="border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Stay</p>
                                <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                                  {dayStay?.propertyName || "No stay chosen yet"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {dayStay ? `${dayStay.checkIn} -> ${dayStay.checkOut}` : "Choose a place to anchor this day."}
                                </p>
                              </div>
                              <StatusPill label={dayStay?.status ?? "rest"} tone={dayStay ? bookingTone(dayStay.status) : "muted"} />
                            </div>

                            {dayStay ? (
                              <div className="mt-4 space-y-3">
                                <StayDetail label="Confirmation" value={dayStay.confirmationCode || "Not added yet"} />
                                <StayDetail label="Parking" value={dayStay.parkingIncluded ? "Included" : dayStay.parkingNotes || "Check parking before arrival"} />
                                <StayDetail label="Cancellation" value={dayStay.cancellationPolicy || "No policy logged yet"} />
                                <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveView("stays")}>
                                  Manage in stays
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-4">
                                <EmptyState
                                  title="No overnight stay attached"
                                  description="Pick or book a stay to anchor this day, then the details will appear here instead of keeping the day open."
                                />
                              </div>
                            )}
                          </Card>

                          <Card className="border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Checklist</p>
                                <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                                  {checkedCount}/{dayChecklist.length}
                                </p>
                              </div>
                              <StatusPill
                                label={checkedCount === dayChecklist.length && dayChecklist.length > 0 ? "done" : "open"}
                                tone={checkedCount === dayChecklist.length && dayChecklist.length > 0 ? "success" : "warning"}
                              />
                            </div>

                            {dayChecklist.length > 0 ? (
                              <div className="mt-4 space-y-2">
                                {dayChecklist.map((item) => (
                                  <label key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/75 px-3 py-3 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={item.done}
                                      onChange={() => toggleChecklistItem(item.id)}
                                      className="mt-0.5 rounded border-slate-300"
                                    />
                                    <div>
                                      <p className={item.done ? "text-slate-400 line-through" : "text-slate-900"}>{item.label}</p>
                                      {item.dueBy && <p className="text-xs text-slate-500">{item.dueBy}</p>}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-4">
                                <EmptyState
                                  title="No checklist items yet"
                                  description="Use this space for day-specific tasks like parking access, border prep, or local logistics."
                                />
                              </div>
                            )}
                          </Card>
                        </div>

                        <div className="space-y-4 xl:order-2">
                          <Card className="border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2">
                              <RouteIcon className="size-4 text-slate-400" />
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Drive plan</p>
                                <p className="mt-1 text-sm text-slate-600">{summary.routeLabel}</p>
                              </div>
                            </div>

                            {dayLegs.length > 0 ? (
                              <>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                  <MetricTile label="Drive time" value={formatDriveHours(dayStats.hours)} />
                                  <MetricTile label="Distance" value={formatDistance(dayStats.km)} />
                                  <MetricTile label="Legs" value={`${dayLegs.length}`} />
                                </div>
                                <div className="mt-4 space-y-2">
                                  {dayLegs.map((leg) => {
                                    const fromStop = stops.find((stop) => stop.id === leg.fromStopId);
                                    const toStop = stops.find((stop) => stop.id === leg.toStopId);

                                    return (
                                      <div key={leg.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/75 px-3 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                          <p className="text-sm font-semibold text-slate-950">
                                            {fromStop?.name ?? "Unknown"} {"->"} {toStop?.name ?? "Unknown"}
                                          </p>
                                          <p className="text-sm font-semibold text-slate-950">{formatDriveHours(leg.driveHours)}</p>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                          <span>{formatDistance(leg.distanceKm)}</span>
                                          <span>{leg.countriesCrossed.join(" / ")}</span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          className="px-0 text-slate-600 hover:text-slate-950"
                                          onClick={() => setInsertAfterLegId((current) => (current === leg.id ? null : leg.id))}
                                        >
                                          <Plus className="mr-1 size-3" /> Add stop after this leg
                                        </Button>
                                        {insertAfterLegId === leg.id && (
                                          <InlinePlaceSearch
                                            onCancel={() => setInsertAfterLegId(null)}
                                            onSelect={(result) => {
                                              insertStopAfterLeg(activeTrip.id, day.id, leg.id, {
                                                name: result.name,
                                                country: result.country,
                                                coordinates: result.coordinates,
                                                type: "waypoint",
                                                isAlternative: false,
                                                tags: [],
                                                notes: "",
                                              });
                                              setInsertAfterLegId(null);
                                            }}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <div className="mt-4">
                                <EmptyState
                                  title="No driving planned"
                                  description="Use this as a genuine pause in the route rhythm, or reshape nearby days if the pacing needs to change."
                                />
                              </div>
                            )}

                            {warnings.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Watchouts</p>
                                {warnings.map((warning) => (
                                  <WarningRow key={warning.id} warning={warning} />
                                ))}
                              </div>
                            )}
                          </Card>

                          <Card className="border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2">
                              <NotebookText className="size-4 text-slate-400" />
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Notes</p>
                                <p className="mt-1 text-sm text-slate-600">Keep the important context close to the day itself.</p>
                              </div>
                            </div>
                            <Textarea
                              placeholder="Add day-specific notes..."
                              value={day.notes}
                              onChange={(event) => updateDay(day.id, { notes: event.target.value })}
                              className="mt-4 min-h-28 bg-slate-50/60"
                            />
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function InlinePlaceSearch({
  onSelect,
  onCancel,
}: {
  onSelect: (result: GeoResult) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleSearch(nextQuery: string) {
    setQuery(nextQuery);
    if (nextQuery.trim().length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    setResults(await geocode(nextQuery));
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="space-y-2">
        <div className="relative">
          <Input
            value={query}
            placeholder="Search for a city or stop..."
            onChange={(event) => void handleSearch(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          />

          {focused && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.15)]">
              {results.map((result) => (
                <button
                  key={`${result.name}-${result.coordinates[0]}-${result.coordinates[1]}`}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                  onMouseDown={() => onSelect(result)}
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  <span className="truncate text-slate-700">{result.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <p className="text-xs text-slate-500">Searching...</p>}

        <div className="flex justify-end">
          <Button variant="ghost" size="xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildDaySummary(day: Day, dayLegs: Leg[], stops: Stop[]) {
  if (day.type === "rest" || dayLegs.length === 0) {
    const overnightStop = stops.find((stop) => stop.id === day.overnightStopId);
    return {
      routeLabel: overnightStop ? `${overnightStop.name} stay` : "Rest day",
      caption: overnightStop ? `A pause in ${overnightStop.name} with no transfer planned.` : "No road movement planned.",
      dayType: "Rest day",
      typeLabel: "Reset / local time",
    };
  }

  const firstLeg = dayLegs[0];
  const lastLeg = dayLegs[dayLegs.length - 1];
  const origin = stops.find((stop) => stop.id === firstLeg.fromStopId)?.name ?? "Unknown";
  const destination = stops.find((stop) => stop.id === lastLeg.toStopId)?.name ?? "Unknown";

  return {
    routeLabel: `${origin} -> ${destination}`,
    caption: dayLegs.length > 1 ? `${dayLegs.length} routed legs stitched into one travel day.` : "A single transfer day with one clear anchor.",
    dayType: day.type === "mixed" ? "Mixed day" : "Drive day",
    typeLabel: day.type === "mixed" ? "Drive plus local time" : "Transfer rhythm",
  };
}

function getDayStatus(day: Day, stay: Stay | undefined, warnings: DayWarning[]) {
  if (day.type === "rest") return { tone: "muted" as const, label: "Rest day" };
  if (warnings.some((warning) => warning.severity === "critical")) return { tone: "danger" as const, label: "Blocker" };
  if (stay?.status === "booked" && warnings.length === 0) return { tone: "success" as const, label: "Stay booked" };
  return { tone: "warning" as const, label: stay ? "Needs attention" : "Stay open" };
}

function getDayAccentClass(day: Day, tone: "success" | "warning" | "danger" | "muted") {
  if (day.type === "rest") return "border-l-4 border-l-slate-300";
  if (tone === "success") return "border-l-4 border-l-emerald-400";
  if (tone === "danger") return "border-l-4 border-l-rose-400";
  return "border-l-4 border-l-amber-400";
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function WarningRow({ warning }: { warning: DayWarning }) {
  const tone = warningTone(warning.severity);

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${toneDotClass(tone)}`} />
        <p className="text-sm font-semibold text-slate-950">{warning.label}</p>
      </div>
      {warning.detail && <p className="mt-1 text-sm text-slate-600">{warning.detail}</p>}
    </div>
  );
}

function StayDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/75 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}
