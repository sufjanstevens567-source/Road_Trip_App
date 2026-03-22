"use client";

import { ChevronLeft, Map, Calendar, DollarSign, Clipboard, BookOpen, CheckCircle2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { getActiveTrip, getTripStays, getTripCountryRules, getTripDays, getTripChecklist, getTripReadiness, getTripNotes, getDayWarnings, getTripStops } from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { MiniReadinessBar, StatusPill } from "@/components/shared/ui-helpers";
import type { TripStatus } from "@/types/trip";
import { AiHelpSheet } from "./ai-help-sheet";
import { RouteView } from "./route-view";
import { ItineraryView } from "./itinerary-view";
import { StaysBudgetView } from "./stays-budget-view";
import { PrepView } from "./prep-view";
import { NotesView } from "./notes-view";

export function PlanningShell() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const tripId = activeTrip?.id ?? "";
  const activeView = state.activeView;

  const setAppMode = useTripStore((s) => s.setAppMode);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);
  const setActiveView = useTripStore((s) => s.setActiveView);
  const setTripStatus = useTripStore((s) => s.setTripStatus);

  const stays = getTripStays(state, tripId);
  const rules = getTripCountryRules(state, tripId);
  const days = getTripDays(state, tripId);
  const checklist = getTripChecklist(state, tripId);
  const notes = getTripNotes(state, tripId);
  const stops = getTripStops(state, tripId);
  const readiness = getTripReadiness(stays, rules, checklist);

  if (!activeTrip) return null;

  const navItems = [
    { id: "route" as const, label: "Route", icon: Map },
    { id: "itinerary" as const, label: "Itinerary", icon: Calendar },
    { id: "stays" as const, label: "Stays & Costs", icon: DollarSign },
    { id: "prep" as const, label: "Trip Prep", icon: Clipboard },
    { id: "notes" as const, label: "Notes", icon: BookOpen },
  ];

  const staysOpenCount = stays.filter((s) => s.status !== "booked").length;
  const complianceOpenCount = rules.flatMap((r) => r.items).filter((i) => i.status !== "done").length;
  const itineraryAttentionCount = days.filter((day) => getDayWarnings(day, state.legs, rules, checklist, stays).length > 0).length;
  const tripModeLabel =
    activeTrip.status === "ready"
      ? "Start Trip"
      : activeTrip.status === "planning" || activeTrip.status === "draft"
        ? "Preview trip"
        : "Open trip";

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-slate-50 p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="flex min-h-full flex-col">
          {/* Trip Header */}
          <div className="space-y-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{activeTrip.name}</h1>
            </div>
            <StatusPill label={presentTripStatus(activeTrip.status)} tone={tripStatusTone(activeTrip.status)} />
          </div>

          {/* Navigation */}
          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  <NavIndicator
                    view={item.id}
                    stopCount={stops.length}
                    staysOpenCount={staysOpenCount}
                    complianceOpenCount={complianceOpenCount}
                    itineraryAttentionCount={itineraryAttentionCount}
                    notesCount={notes.length}
                  />
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-6 pt-6">
            {/* Readiness Chips */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ready to go</p>
              <div className="space-y-2">
                <MiniReadinessBar
                  label="Stays"
                  value={readiness.bookings}
                  detail={staysOpenCount > 0 ? `${staysOpenCount} still open` : "Everything booked"}
                />
                <MiniReadinessBar
                  label="Travel requirements"
                  value={readiness.compliance}
                  detail={complianceOpenCount > 0 ? `${complianceOpenCount} items still open` : "All country rules cleared"}
                />
                <MiniReadinessBar
                  label="Overall"
                  value={readiness.overall}
                  detail={`${days.length} days across ${rules.length} countries`}
                  emphasized
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              {activeTrip.status === "planning" && readiness.overall >= 80 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => setTripStatus(activeTrip.id, "ready")}
                >
                  <CheckCircle2 className="mr-2 size-4" /> Mark Trip Ready
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (activeTrip.status === "ready") {
                    setTripStatus(activeTrip.id, "active");
                  }
                  setAppMode("trip");
                }}
              >
                {tripModeLabel}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                setActiveTripId(null);
                setAppMode("planning");
              }}
            >
              <ChevronLeft className="mr-2 size-4" />
              Back to all trips
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8">
          <div className="mb-6 flex justify-end">
            <AiHelpSheet tripId={activeTrip.id} tripName={activeTrip.name} />
          </div>
          <div key={activeView} className="view-stage">
            {activeView === "route" && <RouteView />}
            {activeView === "itinerary" && <ItineraryView />}
            {activeView === "stays" && <StaysBudgetView />}
            {activeView === "prep" && <PrepView />}
            {activeView === "notes" && <NotesView />}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavIndicator({
  view,
  stopCount,
  staysOpenCount,
  complianceOpenCount,
  itineraryAttentionCount,
  notesCount,
}: {
  view: "route" | "itinerary" | "stays" | "prep" | "notes";
  stopCount: number;
  staysOpenCount: number;
  complianceOpenCount: number;
  itineraryAttentionCount: number;
  notesCount: number;
}) {
  const count =
    view === "route"
      ? stopCount
      : view === "itinerary"
        ? itineraryAttentionCount
        : view === "stays"
          ? staysOpenCount
          : view === "prep"
            ? complianceOpenCount
            : notesCount;

  const isClear = view === "route" || view === "notes" ? true : count === 0;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isClear ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {count}
    </span>
  );
}

function tripStatusTone(status: TripStatus): "success" | "warning" | "danger" | "muted" | "info" {
  if (status === "ready") return "success";
  if (status === "active") return "info";
  if (status === "completed") return "muted";
  if (status === "planning") return "warning";
  return "muted";
}

function presentTripStatus(status: TripStatus) {
  if (status === "ready") return "Trip Ready";
  if (status === "active") return "On the Road";
  if (status === "completed") return "Completed";
  if (status === "planning") return "Planning";
  return "Draft";
}
