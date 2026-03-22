"use client";

import { useMemo, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, MoreHorizontal, Plus, Route as RouteIcon, ShieldCheck, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTripStore } from "@/store/trip-store";
import {
  formatDistance,
  formatDriveHours,
  getActiveTrip,
  getComplianceCompletion,
  getDayDriveStats,
  getPacingWarnings,
  getTripCountryRules,
  getTripDays,
  getTripLegs,
  getTripStops,
  getTripStays,
  getTripTotals,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionLead, StatusPill } from "@/components/shared/ui-helpers";
import type { Day, Leg, Stop, StopType } from "@/types/trip";

const SimpleRouteMap = dynamic(() => import("./simple-route-map").then((m) => ({ default: m.SimpleRouteMap })), {
  ssr: false,
  loading: () => <div className="h-[72vh] w-full animate-pulse rounded-2xl bg-slate-200" />,
});

export function RouteView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const tripId = activeTrip?.id ?? "";
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [menuStopId, setMenuStopId] = useState<string | null>(null);
  const [newStopQuery, setNewStopQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const addStop = useTripStore((s) => s.addStop);
  const removeStop = useTripStore((s) => s.removeStop);
  const reorderStops = useTripStore((s) => s.reorderStops);
  const setActiveView = useTripStore((s) => s.setActiveView);

  const stops = getTripStops(state, tripId);
  const legs = getTripLegs(state, tripId);
  const days = getTripDays(state, tripId);
  const rules = getTripCountryRules(state, tripId);
  const stays = getTripStays(state, tripId);
  const totals = getTripTotals(days, legs);
  const pacingWarnings = getPacingWarnings(days, legs, activeTrip?.maxDriveHoursPerDay ?? 0);
  const complianceScore = getComplianceCompletion(rules);

  const selectedStop = stops.find((stop) => stop.id === selectedStopId) ?? null;
  const selectedStopIndex = selectedStop ? stops.findIndex((stop) => stop.id === selectedStop.id) : -1;
  const selectedConnections = useMemo(() => getStopConnections(selectedStop, stops, legs), [legs, selectedStop, stops]);
  const selectedStopDays = useMemo(
    () =>
      days.filter(
        (day) => day.overnightStopId === selectedStop?.id || day.legIds.some((legId) => selectedConnections.some((entry) => entry.leg.id === legId))
      ),
    [days, selectedConnections, selectedStop]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!activeTrip) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = stops.findIndex((stop) => stop.id === active.id);
    const toIndex = stops.findIndex((stop) => stop.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;

    reorderStops(activeTrip.id, fromIndex, toIndex);
  };

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
        const result = data[0];
        const newStopId = addStop({
          tripId: activeTrip.id,
          name: (result.name as string) || (result.display_name as string).split(",")[0],
          country: ((result.address as Record<string, string>)?.country) || "",
          coordinates: [parseFloat(result.lat as string), parseFloat(result.lon as string)] as [number, number],
          type: "waypoint",
          position: stops.length,
          isAlternative: false,
          tags: [],
          notes: "",
        });
        setNewStopQuery("");
        setSelectedStopId(newStopId);
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionLead
        eyebrow="Route"
        title="See the route at a glance"
        description="Start with the map, then open a stop for local details."
      />

      <div className="grid gap-6 xl:grid-cols-[30rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold leading-snug text-slate-950">
              {stops[0]?.name ?? "Origin"} -&gt; {stops[stops.length - 1]?.name ?? "Destination"}
            </p>
          </div>

          <RouteTotalsCard
            totalDistance={formatDistance(totals.km)}
            totalDriveTime={formatDriveHours(totals.hours)}
            complianceScore={complianceScore}
            pacingWarnings={pacingWarnings}
          />

          <div className="relative h-[72vh] overflow-hidden">
            <div
              className={`absolute inset-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                selectedStop ? "-translate-x-full" : "translate-x-0"
              }`}
            >
              <Card className="flex h-full flex-col border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                <div className="space-y-1 border-b border-slate-200 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Stops</p>
                  <h3 className="text-xl font-semibold text-slate-900">{stops.length} stops on the route</h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Reorder stops when you need to, but use selection first to inspect the route.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={stops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
                      <div className="mt-4 space-y-2">
                        {stops.map((stop) => {
                          const stay = stays.find((entry) => entry.stopId === stop.id);
                          return (
                            <SortableStopItem
                              key={stop.id}
                              stop={stop}
                              selected={stop.id === selectedStopId}
                              stayStatus={stay?.status}
                              menuOpen={menuStopId === stop.id}
                              onSelect={() => {
                                setSelectedStopId(stop.id);
                                setMenuStopId(null);
                              }}
                              onToggleMenu={() => setMenuStopId((current) => (current === stop.id ? null : stop.id))}
                              onDelete={
                                stops.length > 2
                                  ? () => {
                                      removeStop(stop.id);
                                      setMenuStopId(null);
                                      if (selectedStopId === stop.id) setSelectedStopId(null);
                                    }
                                  : undefined
                              }
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Search for a city or stop..."
                      value={newStopQuery}
                      onChange={(e) => setNewStopQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddStop(newStopQuery);
                      }}
                    />
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddStop(newStopQuery)} disabled={isSearching}>
                      <Plus className="mr-1.5 size-3.5" /> Add stop
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div
              className={`absolute inset-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                selectedStop ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {selectedStop && (
                <Card className="flex h-full flex-col border-slate-200 bg-white/96 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex items-start gap-3">
                      <Button variant="ghost" size="icon-xs" onClick={() => setSelectedStopId(null)}>
                        <ArrowLeft className="size-4" />
                      </Button>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Stop details</p>
                        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{selectedStop.name}</h3>
                        <p className="text-sm text-slate-500">{selectedStop.country}</p>
                      </div>
                    </div>
                    <StatusPill label={presentStopType(selectedStop.type)} tone="info" />
                  </div>

                  <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
                    <Card className="border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Stop type</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{humanizeStopType(selectedStop.type)}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{routeStopDescriptor(selectedStop, selectedStopIndex, stops.length)}</p>
                    </Card>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <a
                        href={buildGoogleMapsUrl(selectedStop)}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Open in Google Maps</p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">View this stop</p>
                        <p className="mt-1 text-sm text-slate-500">Open the location in a new tab.</p>
                      </a>
                      <button
                        type="button"
                        onClick={() => setActiveView("stays")}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Stay status</p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                          {selectedStopStayLabel(stays.find((entry) => entry.stopId === selectedStop.id)?.status)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Open stays to manage this stop.</p>
                      </button>
                    </div>

                    <Card className="border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <RouteIcon className="size-4 text-slate-400" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Connected drives</p>
                      </div>
                      <div className="mt-4 space-y-3">
                        {selectedConnections.length > 0 ? (
                          selectedConnections.map((connection) => (
                            <div key={connection.leg.id} className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-950">{connection.label}</p>
                                <p className="text-sm font-semibold text-slate-950">{formatDriveHours(connection.leg.driveHours)}</p>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{formatDistance(connection.leg.distanceKm)}</span>
                                <span>{connection.leg.countriesCrossed.join(" | ")}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">This stop is not connected to a drive yet.</p>
                        )}
                      </div>
                    </Card>

                    <Card className="border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-slate-400" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Route pacing</p>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <PacingSummary
                          label="Linked days"
                          value={`${selectedStopDays.length}`}
                          detail={selectedStopDays.length === 1 ? "This stop shapes 1 day." : `This stop shapes ${selectedStopDays.length} days.`}
                        />
                        <PacingSummary
                          label="Longest linked day"
                          value={getLongestLinkedDayLabel(selectedStopDays, legs)}
                          detail="Open the itinerary for the day-by-day plan."
                        />
                      </div>
                    </Card>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        <div className="relative min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
          {stops.length >= 2 ? (
            <SimpleRouteMap stops={stops} legs={legs} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId} />
          ) : (
            <div className="flex h-full min-h-[72vh] items-center justify-center bg-slate-100 text-sm text-slate-500">
              Add at least 2 stops to view the route.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableStopItem({
  stop,
  selected,
  stayStatus,
  menuOpen,
  onSelect,
  onToggleMenu,
  onDelete,
}: {
  stop: Stop;
  selected: boolean;
  stayStatus?: string;
  menuOpen: boolean;
  onSelect: () => void;
  onToggleMenu: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "z-20" : undefined}>
      <div
        className={`group relative w-full rounded-xl border px-4 py-3 text-left transition-all ${
          selected
            ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
            : "border-slate-200 bg-slate-50/70 text-slate-900 hover:border-slate-300 hover:bg-white"
        } ${isDragging ? "shadow-[0_28px_65px_rgba(15,23,42,0.22)]" : ""} interactive-lift`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border transition-opacity ${
              selected ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-400"
            } ${menuOpen || isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>

          <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 pr-1">
                  <p className={`text-sm font-semibold leading-snug whitespace-normal break-words ${selected ? "text-white" : "text-slate-900"}`}>{stop.name}</p>
                  <p className={`text-xs ${selected ? "text-slate-200" : "text-slate-500"}`}>{stop.country}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {stayStatus && (
                    <StatusPill
                      label={presentStopStatus(stayStatus)}
                      tone={stayStatus === "booked" ? "success" : "warning"}
                      className={selected ? "border-white/15 bg-white/10 text-white" : ""}
                    />
                  )}
                  <StatusPill label={presentStopType(stop.type)} tone="muted" className={selected ? "border-white/15 bg-white/10 text-white" : ""} />
                </div>
              </div>
            </div>
          </button>

          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon-xs"
              className={`${selected ? "text-white hover:bg-white/10 hover:text-white" : ""} ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMenu();
              }}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_50px_rgba(15,23,42,0.15)]">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete?.();
                  }}
                  disabled={!onDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-700 transition-colors hover:bg-rose-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                  Remove stop
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteTotalsCard({
  totalDistance,
  totalDriveTime,
  complianceScore,
  pacingWarnings,
}: {
  totalDistance: string;
  totalDriveTime: string;
  complianceScore: number;
  pacingWarnings: Array<{ dayId: string; dayNumber: number; driveHours: number; limit: number }>;
}) {
  return (
    <Card className="border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Route overview</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">{totalDistance}</p>
          <p className="text-sm text-slate-500">Total distance</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">{totalDriveTime}</p>
          <p className="text-sm text-slate-500">Total drive time</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">{complianceScore}%</p>
          <p className="text-sm text-slate-500">Travel rules complete</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">{pacingWarnings.length}</p>
          <p className="text-sm text-slate-500">Days over target</p>
        </div>
      </div>

      {pacingWarnings.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">Pacing warnings</p>
          {pacingWarnings.slice(0, 2).map((warning) => (
            <div key={warning.dayId} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Day {warning.dayNumber} runs {formatDriveHours(warning.driveHours)} against a {warning.limit}h target.
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function buildGoogleMapsUrl(stop: Stop) {
  const query = encodeURIComponent(`${stop.name}, ${stop.country}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function routeStopDescriptor(stop: Stop, index: number, totalStops: number) {
  if (index === 0) return "The starting point for the route.";
  if (index === totalStops - 1) return "The final arrival point for the trip.";
  if (stop.type === "overnight") return "An overnight stop that shapes the pacing between longer drive days.";
  return "A route stop that changes the shape, timing, or feel of the drive.";
}

function humanizeStopType(type: Stop["type"]) {
  if (type === "origin") return "Starting point";
  if (type === "destination") return "Final arrival";
  if (type === "overnight") return "Overnight stop";
  return "Route stop";
}

function presentStopType(type: StopType) {
  if (type === "origin") return "Start";
  if (type === "destination") return "Finish";
  if (type === "overnight") return "Overnight stop";
  return "Route stop";
}

function presentStopStatus(status: string) {
  if (status === "booked") return "Booked";
  if (status === "shortlisted") return "Shortlisted";
  return "Researching";
}

function selectedStopStayLabel(status?: string) {
  if (!status) return "No stay added";
  return presentStopStatus(status);
}

function getLongestLinkedDayLabel(days: Day[], legs: Leg[]) {
  const longestHours = days.reduce((max, day) => {
    const stats = getDayDriveStats(day, legs);
    return Math.max(max, stats.hours);
  }, 0);

  return longestHours > 0 ? formatDriveHours(longestHours) : "Rest only";
}

function PacingSummary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function getStopConnections(selectedStop: Stop | null, stops: Stop[], legs: Leg[]) {
  if (!selectedStop) return [];

  const connections: Array<{ leg: Leg; label: string }> = [];

  legs.forEach((leg) => {
    const fromStop = stops.find((stop) => stop.id === leg.fromStopId);
    const toStop = stops.find((stop) => stop.id === leg.toStopId);

    if (!fromStop || !toStop) return;
    if (leg.fromStopId === selectedStop.id || leg.toStopId === selectedStop.id) {
      connections.push({ leg, label: `${fromStop.name} -> ${toStop.name}` });
    }
  });

  return connections;
}
