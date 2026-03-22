"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, MapPinned } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import {
  formatDistance,
  getActiveTrip,
  getCurrentExecutionDay,
  getTripDays,
  getTripLegs,
  getTripStops,
  getTripTotals,
} from "@/lib/trip-utils";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/ui-helpers";

const SimpleRouteMap = dynamic(
  () => import("@/components/planning/simple-route-map").then((m) => ({ default: m.SimpleRouteMap })),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-slate-200" />,
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
  const currentDay = getCurrentExecutionDay(days, state.executionDayId);
  const currentStop = stops.find((stop) => stop.id === currentDay.overnightStopId) ?? stops[0] ?? null;
  const completedLegIds = new Set(state.completedLegIds);

  const doneDays = Math.max(currentDay.dayNumber - 1, 0);
  const distanceDone = legs
    .filter((leg) => completedLegIds.has(leg.id) || days.some((day) => day.dayNumber < currentDay.dayNumber && day.legIds.includes(leg.id)))
    .reduce((sum, leg) => sum + leg.distanceKm, 0);
  const countriesVisited = new Set(stops.filter((stop) => currentStop && stop.position <= currentStop.position).map((stop) => stop.country));
  const progress = {
    doneDays,
    currentDayNumber: currentDay.dayNumber,
    remainingDays: Math.max(days.length - currentDay.dayNumber, 0),
    distanceDone,
    distanceRemaining: Math.max(totals.km - distanceDone, 0),
    countriesVisited: countriesVisited.size,
  };

  const stopStateById = Object.fromEntries(
    stops.map((stop) => {
      if (!currentStop) return [stop.id, "future"] as const;
      if (stop.position < currentStop.position) return [stop.id, "past"] as const;
      if (stop.id === currentStop.id) return [stop.id, "current"] as const;
      return [stop.id, "future"] as const;
    })
  );

  return (
    <div className="view-stage space-y-4">
      <Card className="border-none bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_11%,white),color-mix(in_oklch,var(--primary)_16%,white))] px-4 py-4 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.34)]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Progress</p>
              <h2 data-display="true" className="mt-1 text-[1.9rem] text-slate-950">
                Day {currentDay.dayNumber} of {days.length}
              </h2>
            </div>
            <StatusPill label={`${Math.round((currentDay.dayNumber / days.length) * 100)}% through`} tone="info" />
          </div>

          <div className="grid grid-cols-9 gap-2">
            {days.map((day) => {
              const stateTone =
                day.dayNumber < currentDay.dayNumber
                  ? "bg-emerald-500"
                  : day.id === currentDay.id
                    ? "bg-primary shadow-[0_0_0_4px_rgba(64,97,161,0.15)]"
                    : "bg-slate-200";
              return <div key={day.id} className={`h-3 rounded-full ${stateTone}`} />;
            })}
          </div>
        </div>
      </Card>

      <Card className="px-0 py-0">
        <div className="grid grid-cols-3 divide-x divide-black/6">
          <MetricCell label="Km done" value={formatDistance(progress.distanceDone)} />
          <MetricCell label="Km left" value={formatDistance(progress.distanceRemaining)} />
          <MetricCell label="Countries visited" value={String(progress.countriesVisited)} />
        </div>
      </Card>

      {stops.length >= 2 && (
        <Card className="overflow-hidden border-slate-200">
          <div className="border-b border-black/6 px-4 py-3">
            <div className="flex items-center gap-2">
              <MapPinned className="size-4 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Route map</p>
            </div>
          </div>
          <SimpleRouteMap stops={stops} legs={legs} stopStateById={stopStateById} />
        </Card>
      )}

      <div className="space-y-3">
        {stops.map((stop, index) => {
          const relatedDay = days.find((day) => day.overnightStopId === stop.id);
          const stateForStop = stopStateById[stop.id];
          const dotClass =
            stateForStop === "past"
              ? "bg-emerald-500"
              : stateForStop === "current"
                ? "bg-primary ring-4 ring-primary/15"
                : "bg-white ring-2 ring-slate-300";

          return (
            <div key={stop.id} className="relative pl-8">
              {index < stops.length - 1 && <div className="absolute left-[0.65rem] top-8 h-[calc(100%+0.9rem)] w-px bg-slate-200" />}
              <span className={`absolute left-0 top-5 size-5 rounded-full ${dotClass}`} />

              <Card className={`interactive-lift border px-4 py-4 ${stateForStop === "current" ? "border-primary/30 bg-[color-mix(in_oklch,var(--primary)_8%,white)]" : "border-slate-200 bg-white"} ${stateForStop === "future" ? "opacity-88" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-slate-950">{stop.name}</p>
                      {stateForStop === "past" && <CheckCircle2 className="size-4 text-emerald-600" />}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{stop.country}</p>
                    {relatedDay && <p className="mt-2 text-xs text-slate-500">Day {relatedDay.dayNumber}</p>}
                  </div>
                  <StatusPill
                    label={stateForStop === "past" ? "Visited" : stateForStop === "current" ? "Current" : "Upcoming"}
                    tone={stateForStop === "past" ? "success" : stateForStop === "current" ? "info" : "muted"}
                  />
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
