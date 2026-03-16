"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripDays,
  getTripLegs,
  getTripStays,
  getDayDriveStats,
  getDayWarnings,
  getTripCountryRules,
  getTripChecklist,
  getLegsForDay,
  getChecklistForDay,
  formatDriveHours,
  formatDistance,
  formatDate,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SectionLead, StatusPill } from "@/components/shared/ui-helpers";
import type { Day } from "@/types/trip";

export function ItineraryView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);

  if (!activeTrip) return null;

  const days = getTripDays(state, activeTrip.id);
  const legs = getTripLegs(state, activeTrip.id);
  const stays = getTripStays(state, activeTrip.id);
  const rules = getTripCountryRules(state, activeTrip.id);
  const checklistItems = getTripChecklist(state, activeTrip.id);

  const expandedDayIds = useTripStore((s) => s.expandedDayIds);
  const toggleExpandedDay = useTripStore((s) => s.toggleExpandedDay);
  const expandAllDays = useTripStore((s) => s.expandAllDays);
  const collapseAllDays = useTripStore((s) => s.collapseAllDays);
  const updateDay = useTripStore((s) => s.updateDay);
  const removeDay = useTripStore((s) => s.removeDay);
  const updateStay = useTripStore((s) => s.updateStay);
  const toggleChecklistItem = useTripStore((s) => s.toggleChecklistItem);

  const stops = state.stops.filter((st) => st.tripId === activeTrip.id).sort((a, b) => a.position - b.position);
  const getStayForDay = (day: Day) => stays.find((s) => s.stopId === day.overnightStopId);

  // Calculate pacing colors
  const getPacingColor = (driveHours: number): string => {
    if (driveHours < 5) return "bg-emerald-50 border-emerald-200";
    if (driveHours < 7) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <SectionLead eyebrow="Plan" title="Itinerary" description={`${days.length} day${days.length !== 1 ? "s" : ""}`} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => expandAllDays(activeTrip.id)}>
            Expand all
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAllDays}>
            Collapse all
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {days.map((day, i) => {
          const dayLegs = getLegsForDay(legs, day);
          const dayStay = getStayForDay(day);
          const dayStats = getDayDriveStats(day, legs);
          const warnings = getDayWarnings(day, legs, rules, checklistItems, stays);
          const dayChecklist = checklistItems.filter((c) => c.scope === `day:${day.id}`);
          const checkedCount = dayChecklist.filter((c) => c.done).length;
          const isExpanded = expandedDayIds.includes(day.id);

          return (
            <Card key={day.id} className={`overflow-hidden border-2 ${getPacingColor(dayStats.hours)}`}>
              <div
                className="cursor-pointer p-4 hover:bg-black/2"
                onClick={() => toggleExpandedDay(day.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        Day {day.dayNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground">{formatDate(day.date)}</p>
                      {warnings.length > 0 && (
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dayLegs.length > 0
                        ? `${dayLegs[0].fromStopId.split("-")[1]} → ${dayLegs[dayLegs.length - 1].toStopId.split("-")[1]}`
                        : "Rest day"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {dayLegs.length > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatDriveHours(dayStats.hours)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistance(dayStats.km)}
                        </p>
                      </div>
                    )}
                    {dayStay && (
                      <StatusPill
                        label={dayStay.status}
                        tone={dayStay.status === "booked" ? "success" : "warning"}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandedDay(day.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-black/8 p-4 space-y-4 bg-white/50">
                  {/* Legs */}
                  {dayLegs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Legs
                      </p>
                      <div className="space-y-1 text-sm">
                        {dayLegs.map((leg) => {
                          const fromStop = stops.find((s) => s.id === leg.fromStopId);
                          const toStop = stops.find((s) => s.id === leg.toStopId);
                          return (
                            <div key={leg.id} className="flex justify-between">
                              <span className="text-foreground">
                                {fromStop?.name || "?"} → {toStop?.name || "?"}
                              </span>
                              <span className="text-muted-foreground">
                                {formatDriveHours(leg.driveHours)} · {formatDistance(leg.distanceKm)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">
                        Heads up
                      </p>
                      <div className="space-y-2">
                        {warnings.map((w) => (
                          <div
                            key={w.id}
                            className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs"
                          >
                            <p className="font-medium text-amber-900">{w.label}</p>
                            {w.detail && (
                              <p className="text-amber-800">{w.detail}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stay */}
                  {dayStay && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Tonight's stay
                      </p>
                      <Card className="p-3 space-y-2 text-sm">
                        <Input
                          placeholder="Property name"
                          value={dayStay.propertyName}
                          onChange={(e) =>
                            updateStay(dayStay.id, { propertyName: e.target.value })
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={dayStay.checkIn}
                            onChange={(e) =>
                              updateStay(dayStay.id, { checkIn: e.target.value })
                            }
                          />
                          <Input
                            placeholder="Confirmation code"
                            value={dayStay.confirmationCode}
                            onChange={(e) =>
                              updateStay(dayStay.id, { confirmationCode: e.target.value })
                            }
                          />
                        </div>
                        <Input
                          placeholder="Parking notes"
                          value={dayStay.parkingNotes}
                          onChange={(e) =>
                            updateStay(dayStay.id, { parkingNotes: e.target.value })
                          }
                        />
                      </Card>
                    </div>
                  )}

                  {/* Day checklist */}
                  {dayChecklist.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Checklist ({checkedCount}/{dayChecklist.length})
                      </p>
                      <div className="space-y-1">
                        {dayChecklist.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => toggleChecklistItem(item.id)}
                              className="rounded border-slate-300"
                            />
                            <span
                              className={
                                item.done
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              }
                            >
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day notes */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Notes
                    </p>
                    <Textarea
                      placeholder="Add day-specific notes..."
                      value={day.notes}
                      onChange={(e) => updateDay(day.id, { notes: e.target.value })}
                      className="min-h-20"
                    />
                  </div>

                  {/* Delete day */}
                  {days.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 hover:text-red-700"
                      onClick={() => removeDay(day.id)}
                    >
                      <Trash2 className="mr-1.5 size-3.5" /> Remove day
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
