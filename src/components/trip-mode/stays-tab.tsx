"use client";

import { ChevronDown, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import { formatDate, getActiveTrip, getCurrentExecutionDay, getTripDays, getTripStays, getTripStops } from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { bookingTone, EmptyState, SectionLead, StatusPill } from "@/components/shared/ui-helpers";
import { CopyButton, NavigateButton, openMapsDestination } from "./trip-mode-primitives";
import type { Stay } from "@/types/trip";

export function StaysTab() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const [expandedStayId, setExpandedStayId] = useState<string | null>(null);

  if (!activeTrip) return null;

  const stays = getTripStays(state, activeTrip.id);
  const stops = getTripStops(state, activeTrip.id);
  const days = getTripDays(state, activeTrip.id);
  const currentDay = getCurrentExecutionDay(days, state.executionDayId);

  const orderedStays = [...stays].sort((a, b) => {
    const aTonight = a.stopId === currentDay.overnightStopId ? -1 : 0;
    const bTonight = b.stopId === currentDay.overnightStopId ? -1 : 0;
    if (aTonight !== bTonight) return aTonight - bTonight;
    return a.checkIn.localeCompare(b.checkIn);
  });

  if (orderedStays.length === 0) {
    return (
      <EmptyState
        title="No stays yet"
        description="Once a stop becomes an overnight stop, its stay details will appear here with quick actions for arrival."
      />
    );
  }

  return (
    <div className="view-stage space-y-4">
      <SectionLead
        eyebrow="Accommodations"
        title="Stays"
        description={`${orderedStays.length} stays lined up for the road, with tonight surfaced first.`}
      />

      <div className="space-y-3">
        {orderedStays.map((stay) => {
          const stop = stops.find((entry) => entry.id === stay.stopId);
          const isTonight = stay.stopId === currentDay.overnightStopId;
          const isExpanded = expandedStayId === stay.id;

          return (
            <Card
              key={stay.id}
              className={`interactive-lift relative overflow-hidden border px-0 py-0 ${isTonight ? "border-primary/30 bg-[color-mix(in_oklch,var(--primary)_10%,white)]" : "border-slate-200 bg-white"}`}
            >
              <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-gradient-to-b from-slate-200 to-slate-300">
                <span
                  className={`absolute left-1/2 top-5 size-3 -translate-x-1/2 rounded-full border-2 border-white ${
                    isTonight ? "bg-primary" : stay.status === "booked" ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => setExpandedStayId(isExpanded ? null : stay.id)}
                className="flex min-h-24 w-full items-start justify-between gap-3 pl-7 pr-4 py-4 text-left"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-950">{propertyTitle(stop?.name, stay.propertyName)}</p>
                    {isTonight && <StatusPill label="Tonight" tone="info" />}
                  </div>
                  <p className="text-sm text-slate-500">{stop?.name ?? "Unknown stop"}</p>
                  <p className="text-sm text-slate-600">
                    {formatDate(stay.checkIn)} → {formatDate(stay.checkOut)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill label={presentStayStatus(stay.status)} tone={bookingTone(stay.status)} />
                  {isExpanded ? <ChevronDown className="size-4 text-slate-500" /> : <ChevronRight className="size-4 text-slate-500" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-200/90 pl-7 pr-4 py-4">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {stop && <NavigateButton coordinates={stop.coordinates} label={isTonight ? "Navigate to tonight's stay" : `Navigate to ${stop.name}`} />}
                      {stay.address && stop ? (
                        <Button variant="outline" size="lg" className="h-12 rounded-xl justify-center" onClick={() => openMapsDestination(stop?.coordinates ?? [0, 0], stay.propertyName || stop?.name)}>
                          <MapPin className="mr-2 size-4" />
                          Open address
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {stay.bookingUrl && (
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-12 rounded-xl justify-center"
                          onClick={() => window.open(stay.bookingUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="mr-2 size-4" />
                          Open booking
                        </Button>
                      )}
                      {stay.confirmationCode && <CopyButton value={stay.confirmationCode} className="h-12 rounded-xl" />}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {stay.address && stop && (
                        <InfoCell label="Address" value={stay.address} onClick={() => openMapsDestination(stop.coordinates, stay.propertyName || stop.name)} />
                      )}
                      {stay.checkInWindow && <InfoCell label="Check-in window" value={stay.checkInWindow} />}
                      {stay.parkingNotes && <InfoCell label="Parking" value={stay.parkingNotes} />}
                      {stay.cancellationPolicy && <InfoCell label="Cancellation" value={stay.cancellationPolicy} />}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InfoCell({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 ${onClick ? "cursor-pointer" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{value}</p>
    </div>
  );

  if (!onClick) return content;

  return (
    <button type="button" className="text-left" onClick={onClick}>
      {content}
    </button>
  );
}

function propertyTitle(stopName?: string, propertyName?: string) {
  if (propertyName) return propertyName;
  if (stopName) return `${stopName} — not chosen yet`;
  return "Stay not chosen yet";
}

function presentStayStatus(status: Stay["status"]) {
  if (status === "booked") return "Booked";
  if (status === "shortlisted") return "Shortlisted";
  return "Researching";
}
