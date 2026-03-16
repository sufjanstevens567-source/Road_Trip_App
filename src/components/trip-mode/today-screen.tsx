"use client";

import { Copy, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripDays,
  getTripStays,
  getTripLegs,
  getCurrentExecutionDay,
  getDayDriveStats,
  getDayWarnings,
  formatDate,
  formatDriveHours,
  formatDistance,
  getTripCountryRules,
  getTripChecklist,
  getLegsForDay,
  getChecklistForDay,
  getTripStops,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLead, StatusPill } from "@/components/shared/ui-helpers";
import type { Day } from "@/types/trip";

export function TodayScreen() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const [showTomorrow, setShowTomorrow] = useState(false);

  if (!activeTrip) return null;

  const days = getTripDays(state, activeTrip.id);
  const stays = getTripStays(state, activeTrip.id);
  const legs = getTripLegs(state, activeTrip.id);
  const rules = getTripCountryRules(state, activeTrip.id);
  const checklist = getTripChecklist(state, activeTrip.id);

  const today = getCurrentExecutionDay(days);
  const todayIndex = days.findIndex((d) => d.id === today.id);
  const tomorrow = todayIndex < days.length - 1 ? days[todayIndex + 1] : null;

  const stops = getTripStops(state, activeTrip.id);
  const todayStay = stays.find((s) => s.stopId === today.overnightStopId);
  const todayDriveStats = getDayDriveStats(today, legs);
  const todayWarnings = getDayWarnings(today, legs, rules, checklist, stays);
  const dayChecklist = getChecklistForDay(checklist, today.id);
  const dayLegs = getLegsForDay(legs, today);

  const toggleChecklistItem = useTripStore((s) => s.toggleChecklistItem);
  const updateStay = useTripStore((s) => s.updateStay);

  const todayOvernightStop = stops.find((s) => s.id === today.overnightStopId);

  return (
    <div className="space-y-6">
      {/* Where I am */}
      <Card className="p-6 bg-gradient-to-br from-sky-50 to-slate-50 border-sky-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Where I am
        </p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          Day {today.dayNumber}
        </h2>
        <p className="mt-1 text-lg text-muted-foreground">{formatDate(today.date)}</p>
        {todayOvernightStop && (
          <p className="mt-2 text-sm text-foreground">
            Tonight: <span className="font-semibold">{todayOvernightStop.name}</span>
          </p>
        )}
      </Card>

      {/* Today's drive */}
      {dayLegs.length > 0 ? (
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Today's drive
          </p>
          <div className="space-y-2">
            {dayLegs.map((leg) => {
              const fromStop = stops.find((s) => s.id === leg.fromStopId);
              const toStop = stops.find((s) => s.id === leg.toStopId);
              return (
                <div key={leg.id} className="text-sm">
                  <p className="font-semibold text-foreground">
                    {fromStop?.name} → {toStop?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDriveHours(leg.driveHours)} · {formatDistance(leg.distanceKm)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-3 text-sm">
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total today</span>
              <span>{formatDriveHours(todayDriveStats.hours)}</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-muted-foreground">Rest day</p>
        </Card>
      )}

      {/* Today's checklist */}
      {dayChecklist.length > 0 && (
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Today's checklist
          </p>
          <div className="space-y-2">
            {dayChecklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 text-sm cursor-pointer"
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
        </Card>
      )}

      {/* Tonight's stay */}
      {todayStay && (
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tonight's stay
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-foreground">{todayStay.propertyName}</p>
              <StatusPill
                label={todayStay.status}
                tone={todayStay.status === "booked" ? "success" : "warning"}
              />
            </div>

            {todayStay.confirmationCode && (
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">Code:</p>
                <code className="bg-slate-100 px-2 py-1 rounded font-mono text-xs text-foreground">
                  {todayStay.confirmationCode}
                </code>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    navigator.clipboard.writeText(todayStay.confirmationCode);
                  }}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            )}

            {todayStay.parkingNotes && (
              <div>
                <p className="text-xs text-muted-foreground">Parking</p>
                <p className="text-foreground">{todayStay.parkingNotes}</p>
              </div>
            )}

            {todayStay.checkInWindow && (
              <div>
                <p className="text-xs text-muted-foreground">Check-in window</p>
                <p className="text-foreground">{todayStay.checkInWindow}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Heads up - warnings */}
      {todayWarnings.length > 0 && (
        <Card className="p-4 space-y-2 border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-900">
            Heads up
          </p>
          <div className="space-y-2">
            {todayWarnings.map((w) => (
              <div key={w.id} className="text-sm">
                <p className="font-semibold text-amber-900">{w.label}</p>
                {w.detail && (
                  <p className="text-xs text-amber-800">{w.detail}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tomorrow preview */}
      {tomorrow && (
        <Card className="p-4 space-y-3 border-slate-200">
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setShowTomorrow(!showTomorrow)}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tomorrow's preview
            </p>
            <ChevronDown
              className={`size-4 transition-transform ${
                showTomorrow ? "rotate-180" : ""
              }`}
            />
          </button>

          {showTomorrow && tomorrow && (
            <div className="space-y-2 text-sm pt-2 border-t">
              <p className="font-semibold text-foreground">
                Day {tomorrow.dayNumber} · {formatDate(tomorrow.date)}
              </p>
              <p className="text-muted-foreground">
                {getDayDriveStats(tomorrow, legs).hours > 0
                  ? `${formatDriveHours(getDayDriveStats(tomorrow, legs).hours)} of driving`
                  : "Rest day"}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
