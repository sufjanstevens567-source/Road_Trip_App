"use client";

import { Copy, Plus } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, StatusPill } from "@/components/shared/ui-helpers";
import { formatDate } from "@/lib/trip-utils";
import type { Trip } from "@/types/trip";

export function TripLibrary({ onNewTrip }: { onNewTrip: () => void }) {
  const trips = useTripStore((s) => s.trips);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);
  const setAppMode = useTripStore((s) => s.setAppMode);
  const duplicateTrip = useTripStore((s) => s.duplicateTrip);

  const handleSelectTrip = (tripId: string) => {
    setActiveTripId(tripId);
    setAppMode("planning");
  };

  const handleDuplicate = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    duplicateTrip(tripId);
  };

  if (trips.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-slate-50 px-4">
        <EmptyState
          title="Plan your first road trip"
          description="Build your first trip and keep the route, stays, prep, and notes in one place."
          action={
            <Button onClick={onNewTrip} size="lg">
              <Plus className="mr-2 size-5" /> Start planning
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Trips
            </p>
            <h1 className="mt-2 text-4xl font-bold text-foreground">
              {trips.length === 1 ? "Your trip" : "Your trips"}
            </h1>
          </div>
          <Button onClick={onNewTrip} size="lg">
            <Plus className="mr-2 size-5" /> New trip
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onSelect={() => handleSelectTrip(trip.id)}
              onDuplicate={(e) => handleDuplicate(e, trip.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TripCard({
  trip,
  onSelect,
  onDuplicate,
}: {
  trip: Trip;
  onSelect: () => void;
  onDuplicate: (e: React.MouseEvent) => void;
}) {
  const startDate = trip.startDate ? new Date(trip.startDate) : null;
  const endDate = trip.endDate ? new Date(trip.endDate) : null;
  const dateRange = startDate && endDate
    ? `${formatDate(trip.startDate!)} – ${formatDate(trip.endDate!)}`
    : "Dates pending";

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:border-sky-300"
      onClick={onSelect}
    >
      <div className="space-y-4 p-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">{trip.name}</h3>
          <p className="text-sm text-muted-foreground">{dateRange}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill label={presentTripStatus(trip.status)} tone={statusTone(trip.status)} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="flex-1"
          >
            <Copy className="mr-1.5 size-3.5" /> Duplicate
          </Button>
        </div>
      </div>
    </Card>
  );
}

function statusTone(
  status: Trip["status"]
): "success" | "warning" | "danger" | "muted" | "info" {
  if (status === "ready") return "success";
  if (status === "active") return "info";
  if (status === "completed") return "muted";
  if (status === "planning") return "warning";
  return "muted";
}

function presentTripStatus(status: Trip["status"]) {
  if (status === "ready") return "Trip Ready";
  if (status === "active") return "On the Road";
  if (status === "completed") return "Completed";
  if (status === "planning") return "Planning";
  return "Draft";
}
