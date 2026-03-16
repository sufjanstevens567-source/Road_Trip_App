"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripStops,
  getTripLegs,
  getTripDays,
  getTripTotals,
  getDayDriveStats,
  getPacingWarnings,
  getTripCountryRules,
  getComplianceCompletion,
  getTripStays,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SectionLead, StatusPill, ReadinessBar } from "@/components/shared/ui-helpers";
import { formatDistance, formatDriveHours } from "@/lib/trip-utils";
import type { Stop } from "@/types/trip";

const SimpleRouteMap = dynamic(() => import("./simple-route-map").then(m => ({ default: m.SimpleRouteMap })), {
  ssr: false,
  loading: () => <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-200" />,
});

export function RouteView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [newStopQuery, setNewStopQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  if (!activeTrip) return null;

  const stops = getTripStops(state, activeTrip.id);
  const legs = getTripLegs(state, activeTrip.id);
  const days = getTripDays(state, activeTrip.id);
  const rules = getTripCountryRules(state, activeTrip.id);
  const stays = getTripStays(state, activeTrip.id);
  const totals = getTripTotals(days, legs);
  const pacingWarnings = getPacingWarnings(days, legs, activeTrip.maxDriveHoursPerDay);
  const complianceScore = getComplianceCompletion(rules);

  const addStop = useTripStore((s) => s.addStop);
  const removeStop = useTripStore((s) => s.removeStop);
  const reorderStops = useTripStore((s) => s.reorderStops);

  const selectedStop = stops.find((s) => s.id === selectedStopId);

  const handleAddStop = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();

      if (data.length > 0) {
        const r = data[0];
        const newStopId = addStop({
          tripId: activeTrip.id,
          name: (r.name as string) || (r.display_name as string).split(",")[0],
          country: ((r.address as Record<string, string>)?.country) || "",
          coordinates: [parseFloat(r.lat as string), parseFloat(r.lon as string)] as [number, number],
          type: "waypoint",
          position: stops.length,
          isAlternative: false,
          tags: [],
          notes: "",
        });
        setNewStopQuery("");
        setSelectedStopId(newStopId);
      }
    } catch (e) {
      console.error("Geocoding failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) reorderStops(activeTrip.id, index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < stops.length - 1) reorderStops(activeTrip.id, index, index + 1);
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left Panel: Stop List */}
      <div className="space-y-4">
        <SectionLead
          eyebrow="Route"
          title="Stops"
          description={`${stops.length} stop${stops.length !== 1 ? "s" : ""}`}
        />

        <Card className="p-4">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stops.map((stop, i) => (
              <div
                key={stop.id}
                className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-colors cursor-pointer ${
                  selectedStopId === stop.id
                    ? "border-sky-400 bg-sky-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => setSelectedStopId(stop.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{stop.name}</p>
                  <p className="text-xs text-muted-foreground">{stop.country}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(i);
                    }}
                    disabled={i === 0}
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveDown(i);
                    }}
                    disabled={i === stops.length - 1}
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                  {stops.length > 2 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStop(stop.id);
                        setSelectedStopId(null);
                      }}
                    >
                      <Trash2 className="size-3 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-4 space-y-2">
            <Input
              placeholder="Search for a city..."
              value={newStopQuery}
              onChange={(e) => setNewStopQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddStop(newStopQuery);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleAddStop(newStopQuery)}
              disabled={isSearching}
            >
              <Plus className="mr-1.5 size-3.5" /> Add stop
            </Button>
          </div>
        </Card>
      </div>

      {/* Center: Map */}
      <div className="space-y-4">
        <SectionLead eyebrow="Map" title="Route" />
        <Card className="overflow-hidden">
          {stops.length >= 2 && (
            <SimpleRouteMap stops={stops} legs={legs} />
          )}
          {stops.length < 2 && (
            <div className="flex h-96 items-center justify-center bg-slate-100 text-sm text-muted-foreground">
              Add at least 2 stops to view the map
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel: Details or Stop Info */}
      <div className="space-y-4">
        <SectionLead eyebrow="Details" title="Overview" />

        {selectedStop ? (
          <Card className="p-4 space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold text-foreground">{selectedStop.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedStop.country}</p>
              <div className="mt-2 flex gap-2">
                <StatusPill label={selectedStop.type} tone="info" />
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Coordinates</p>
                <p className="text-foreground">
                  {selectedStop.coordinates[0].toFixed(4)}, {selectedStop.coordinates[1].toFixed(4)}
                </p>
              </div>

              {selectedStop.tags.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Tags</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedStop.tags.map((tag) => (
                      <StatusPill key={tag} label={tag} tone="muted" />
                    ))}
                  </div>
                </div>
              )}

              {selectedStop.notes && (
                <div>
                  <p className="font-medium text-muted-foreground">Notes</p>
                  <p className="mt-1 text-foreground">{selectedStop.notes}</p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSelectedStopId(null)}
            >
              Close
            </Button>
          </Card>
        ) : (
          <Card className="p-4 space-y-4">
            <div className="space-y-3">
              <ReadinessBar label="Compliance" value={complianceScore} />
            </div>

            <div className="border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total distance</span>
                <span className="font-semibold text-foreground">{formatDistance(totals.km)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total drive time</span>
                <span className="font-semibold text-foreground">{formatDriveHours(totals.hours)}</span>
              </div>
            </div>

            {pacingWarnings.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">
                  Pacing warnings
                </p>
                <div className="space-y-2">
                  {pacingWarnings.map((w) => (
                    <div key={w.dayId} className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                      <p>
                        Day {w.dayNumber}: {formatDriveHours(w.driveHours)} (limit: {w.limit}h)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Days breakdown
              </p>
              <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                {days.map((day, i) => {
                  const stats = getDayDriveStats(day, legs);
                  return (
                    <div key={day.id} className="flex justify-between text-muted-foreground">
                      <span>Day {i + 1}</span>
                      <span>{formatDriveHours(stats.hours)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
