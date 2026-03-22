"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, X } from "lucide-react";
import { buildCountryRule, getSeededCountryRule } from "@/data/country-rules-db";
import { estimateDriveStats, genId } from "@/lib/trip-utils";
import { useTripStore } from "@/store/trip-store";
import type { StopType } from "@/types/trip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Simple geocoder (nominatim) ─────────────────────────────────────────────

interface GeoResult {
  name: string;
  country: string;
  coordinates: [number, number];
  displayName: string;
}

async function geocode(query: string): Promise<GeoResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.map((r: Record<string, unknown>) => ({
      name: (r.name as string) || (r.display_name as string).split(",")[0],
      country: ((r.address as Record<string, string>)?.country) || "",
      coordinates: [parseFloat(r.lat as string), parseFloat(r.lon as string)] as [number, number],
      displayName: r.display_name as string,
    }));
  } catch {
    return [];
  }
}

// ─── Place search field ───────────────────────────────────────────────────────

function PlaceSearch({
  label,
  placeholder,
  value,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: string;
  onSelect: (result: GeoResult) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    const r = await geocode(q);
    setResults(r);
    setLoading(false);
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
        />
        {focused && results.length > 0 && (
          <ul className="absolute top-full z-50 mt-1 w-full rounded-lg border border-black/10 bg-white shadow-lg">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onMouseDown={() => {
                    onSelect(r);
                    setQuery(`${r.name}, ${r.country}`);
                    setResults([]);
                  }}
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-foreground">{r.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {loading && (
          <p className="mt-1 text-xs text-muted-foreground">Searching…</p>
        )}
      </div>
    </div>
  );
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardStop {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number];
  type: StopType;
}

interface WizardState {
  tripName: string;
  origin: WizardStop | null;
  destination: WizardStop | null;
  startDate: string;
  endDate: string;
  maxDriveHoursPerDay: number;
  waypoints: WizardStop[];
  travelers: string;
  vehicle: string;
}

const EMPTY: WizardState = {
  tripName: "",
  origin: null,
  destination: null,
  startDate: "",
  endDate: "",
  maxDriveHoursPerDay: 7,
  waypoints: [],
  travelers: "1 driver",
  vehicle: "",
};

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function TripWizard({ onClose }: { onClose: () => void }) {
  const store = useTripStore();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardState>(EMPTY);

  function patch(updates: Partial<WizardState>) {
    setData((d) => ({ ...d, ...updates }));
  }

  // auto-name the trip when origin+dest are both set
  function autoName(origin: WizardStop | null, dest: WizardStop | null) {
    if (origin && dest && !data.tripName) {
      patch({ tripName: `${origin.name} → ${dest.name}` });
    }
  }

  // ── Step validation ──────────────────────────────────────────────────────────
  const step1Valid = data.origin && data.destination;
  const step2Valid = data.startDate && data.endDate && data.startDate <= data.endDate;

  // ── Calculate available days ─────────────────────────────────────────────────
  const availableDays =
    data.startDate && data.endDate
      ? Math.round(
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
            86400000
        ) + 1
      : 0;

  // ── Build all stops in order ─────────────────────────────────────────────────
  const allStops: WizardStop[] = [
    ...(data.origin ? [data.origin] : []),
    ...data.waypoints,
    ...(data.destination ? [data.destination] : []),
  ];

  // ── Estimate total drive ─────────────────────────────────────────────────────
  const totalDrive = allStops.reduce(
    (acc, stop, i) => {
      if (i === 0) return acc;
      const prev = allStops[i - 1];
      const { distanceKm, driveHours } = estimateDriveStats(prev.coordinates, stop.coordinates);
      return { km: acc.km + distanceKm, hours: acc.hours + driveHours };
    },
    { km: 0, hours: 0 }
  );

  // ── Finalize trip creation ────────────────────────────────────────────────────
  function finalize(addRules: boolean) {
    if (!data.origin || !data.destination) return;

    // Create trip
    store.createTrip({
      name: data.tripName || `${data.origin.name} → ${data.destination.name}`,
      originId: "",
      destinationId: "",
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      travelers: data.travelers,
      vehicle: data.vehicle,
      currency: "EUR",
      maxDriveHoursPerDay: data.maxDriveHoursPerDay,
    });

    // The createTrip action sets activeTripId to the new trip's id.
    // We need to get the id that was just created.
    const newTripId = useTripStore.getState().activeTripId!;

    // Create stops
    const stopIds: string[] = [];
    for (let i = 0; i < allStops.length; i++) {
      const ws = allStops[i];
      const type: StopType =
        i === 0 ? "origin" : i === allStops.length - 1 ? "destination" : ws.type;
      const id = store.addStop({
        tripId: newTripId,
        name: ws.name,
        country: ws.country,
        coordinates: ws.coordinates,
        type,
        position: i,
        isAlternative: false,
        tags: [],
        notes: "",
      });
      stopIds.push(id);
    }

    // Create legs + days
    let dayNumber = 1;
    let currentDate = data.startDate
      ? new Date(data.startDate)
      : new Date();
    let hoursToday = 0;
    let todayLegIds: string[] = [];
    let todayOvernightIdx = 0;

    for (let i = 1; i < allStops.length; i++) {
      const { distanceKm, driveHours } = estimateDriveStats(
        allStops[i - 1].coordinates,
        allStops[i].coordinates
      );

      const legId = store.addLeg({
        tripId: newTripId,
        fromStopId: stopIds[i - 1],
        toStopId: stopIds[i],
        order: i - 1,
        distanceKm,
        driveHours,
        countriesCrossed: [allStops[i - 1].country, allStops[i].country].filter(
          (v, idx, arr) => arr.indexOf(v) === idx
        ),
        tollNotes: "",
        riskNotes: "",
      });

      // If adding this leg would exceed the daily limit, close current day first
      if (hoursToday > 0 && hoursToday + driveHours > data.maxDriveHoursPerDay) {
        store.addDay({
          tripId: newTripId,
          date: currentDate.toISOString().slice(0, 10),
          dayNumber,
          legIds: todayLegIds,
          overnightStopId: stopIds[todayOvernightIdx],
          type: "driving",
          notes: "",
        });
        dayNumber++;
        currentDate = new Date(currentDate.getTime() + 86400000);
        hoursToday = 0;
        todayLegIds = [];
      }

      todayLegIds.push(legId);
      hoursToday += driveHours;
      todayOvernightIdx = i;
    }

    // Close final driving day
    if (todayLegIds.length > 0) {
      store.addDay({
        tripId: newTripId,
        date: currentDate.toISOString().slice(0, 10),
        dayNumber,
        legIds: todayLegIds,
        overnightStopId: stopIds[stopIds.length - 1],
        type: "driving",
        notes: "",
      });
      dayNumber++;
      currentDate = new Date(currentDate.getTime() + 86400000);
    }

    // Fill remaining days as rest days if endDate gives more days
    const endD = data.endDate ? new Date(data.endDate) : null;
    while (endD && currentDate <= endD) {
      store.addDay({
        tripId: newTripId,
        date: currentDate.toISOString().slice(0, 10),
        dayNumber,
        legIds: [],
        overnightStopId: stopIds[stopIds.length - 1],
        type: "rest",
        notes: "",
      });
      dayNumber++;
      currentDate = new Date(currentDate.getTime() + 86400000);
    }

    // Create stays for overnight stops
    const overnightIds = allStops
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => s.type === "overnight" || i === allStops.length - 1)
      .map(({ i }) => stopIds[i]);

    for (const sid of overnightIds) {
      store.createStay({
        tripId: newTripId,
        stopId: sid,
        checkIn: data.startDate || "",
        checkOut: data.endDate || "",
        propertyName: "",
        address: "",
        bookingUrl: "",
        status: "researching",
        confirmationCode: "",
        parkingIncluded: false,
        parkingNotes: "",
        checkInWindow: "",
        cancellationPolicy: "",
        costPlanned: 0,
        costActual: 0,
        notes: "",
      });
    }

    // Add country rules if requested
    if (addRules) {
      const countries = [...new Set(allStops.map((s) => s.country))];
      for (const country of countries) {
        if (getSeededCountryRule(country)) {
          const ruleData = buildCountryRule(newTripId, country);
          store.addCountryRule({ ...ruleData, id: genId("cr") } as Parameters<typeof store.addCountryRule>[0]);
        }
      }
    }

    // Update trip status to planning
    store.setTripStatus(newTripId, "planning");
    store.setActiveView("route");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/8 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              New trip · Step {step} of 4
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-foreground">
              {step === 1 && "Where are you going?"}
              {step === 2 && "When are you traveling?"}
              {step === 3 && "Add stops along the way"}
              {step === 4 && "Trip details"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <PlaceSearch
                label="Starting point"
                placeholder="e.g. Luxembourg City"
                value={data.origin ? `${data.origin.name}, ${data.origin.country}` : ""}
                onSelect={(r) => {
                  const origin: WizardStop = { id: genId("s"), name: r.name, country: r.country, coordinates: r.coordinates, type: "origin" };
                  patch({ origin });
                  autoName(origin, data.destination);
                }}
              />
              <PlaceSearch
                label="Destination"
                placeholder="e.g. Sofia"
                value={data.destination ? `${data.destination.name}, ${data.destination.country}` : ""}
                onSelect={(r) => {
                  const dest: WizardStop = { id: genId("s"), name: r.name, country: r.country, coordinates: r.coordinates, type: "destination" };
                  patch({ destination: dest });
                  autoName(data.origin, dest);
                }}
              />
              {data.origin && data.destination && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">
                  Estimated drive: ~{Math.round(estimateDriveStats(data.origin.coordinates, data.destination.coordinates).driveHours)}h direct
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Departure date</label>
                  <Input type="date" value={data.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Arrival date</label>
                  <Input type="date" value={data.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
                </div>
              </div>
              {availableDays > 0 && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">
                  {availableDays} days available · {Math.round(totalDrive.hours)}h of driving total
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium">Max drive hours per day</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={12}
                    step={0.5}
                    value={data.maxDriveHoursPerDay}
                    onChange={(e) => patch({ maxDriveHoursPerDay: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-sm font-medium">{data.maxDriveHoursPerDay}h</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add overnight stops or route stops between {data.origin?.name} and {data.destination?.name}.
              </p>
              {data.waypoints.length > 0 && (
                <ul className="space-y-2">
                  {data.waypoints.map((wp, i) => (
                    <li key={wp.id} className="flex items-center justify-between rounded-xl border border-black/8 bg-white px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{wp.name}</p>
                        <p className="text-xs text-muted-foreground">{wp.country} · {wp.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const updated = [...data.waypoints];
                            updated[i] = { ...wp, type: wp.type === "overnight" ? "waypoint" : "overnight" };
                            patch({ waypoints: updated });
                          }}
                        >
                          {wp.type === "overnight" ? "Overnight stop" : "Route stop"}
                        </button>
                        <button
                          type="button"
                          onClick={() => patch({ waypoints: data.waypoints.filter((_, j) => j !== i) })}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <PlaceSearch
                label="Add a stop"
                placeholder="Search for a city or place"
                value=""
                onSelect={(r) => {
                  patch({
                    waypoints: [
                      ...data.waypoints,
                      { id: genId("s"), name: r.name, country: r.country, coordinates: r.coordinates, type: "overnight" },
                    ],
                  });
                }}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Trip name</label>
                <Input value={data.tripName} onChange={(e) => patch({ tripName: e.target.value })} placeholder="e.g. Luxembourg → Sofia" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Travelers</label>
                <Input value={data.travelers} onChange={(e) => patch({ travelers: e.target.value })} placeholder="e.g. 1 driver" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Vehicle (optional)</label>
                <Input value={data.vehicle} onChange={(e) => patch({ vehicle: e.target.value })} placeholder="e.g. 2015 Opel Mokka 1.4L" />
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Route summary</p>
                <p className="mt-1">{allStops.map((s) => s.name).join(" → ")}</p>
                <p className="mt-1">~{Math.round(totalDrive.hours)}h drive · ~{totalDrive.km} km</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-black/8 px-6 py-4">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="mr-1.5 size-3.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              size="sm"
              disabled={
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid)
              }
              onClick={() => setStep((s) => s + 1)}
            >
              Continue <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => finalize(false)}>
                Skip travel rules
              </Button>
              <Button size="sm" onClick={() => finalize(true)}>
                <Check className="mr-1.5 size-3.5" /> Create trip
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
