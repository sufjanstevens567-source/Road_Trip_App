"use client";

import dynamic from "next/dynamic";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripDays,
  getTripLegs,
  getTripTotals,
  getTripStops,
  formatDriveHours,
  formatDistance,
} from "@/lib/trip-utils";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/ui-helpers";

const SimpleRouteMap = dynamic(
  () => import("@/components/planning/simple-route-map").then((m) => ({ default: m.SimpleRouteMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-200" />
    ),
  }
);

export function OverviewTab() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);

  if (!activeTrip) return null;

  const days = getTripDays(state, activeTrip.id);
  const legs = getTripLegs(state, activeTrip.id);
  const stops = getTripStops(state, activeTrip.id);
  const totals = getTripTotals(days, legs);

  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const today = getTodayISO();
  const currentDay = days.find((d) => d.date >= today) || days[0];

  const daysCompleted = days.filter((d) => d.date < today).length;
  const daysRemaining = days.length - daysCompleted;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card className="p-4 bg-gradient-to-br from-sky-50 to-slate-50 border-sky-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Progress
        </p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          Day {currentDay.dayNumber} of {days.length}
        </h2>
        <div className="mt-3 flex gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-lg font-semibold text-emerald-600">{daysCompleted}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-semibold text-sky-600">{daysRemaining}</p>
          </div>
        </div>
      </Card>

      {/* Map */}
      {stops.length >= 2 && (
        <Card className="overflow-hidden">
          <SimpleRouteMap stops={stops} legs={legs} />
        </Card>
      )}

      {/* Stats */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Route stats
        </p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total distance</span>
            <span className="font-semibold text-foreground">{formatDistance(totals.km)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total driving</span>
            <span className="font-semibold text-foreground">{formatDriveHours(totals.hours)}</span>
          </div>
        </div>
      </Card>

      {/* All stops */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          All stops
        </p>
        <div className="space-y-2">
          {stops.map((stop) => {
            const day = days.find((d) => d.overnightStopId === stop.id);
            const isPassed = day && day.date < today;
            const isCurrent = day && day.date === today;

            return (
              <Card
                key={stop.id}
                className={`p-3 ${
                  isCurrent
                    ? "border-sky-300 bg-sky-50"
                    : isPassed
                    ? "border-slate-300 opacity-75"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{stop.name}</p>
                    <p className="text-xs text-muted-foreground">{stop.country}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusPill label={stop.type} tone="info" />
                    {day && (
                      <StatusPill
                        label={`Day ${day.dayNumber}`}
                        tone={isPassed ? "muted" : "info"}
                      />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
