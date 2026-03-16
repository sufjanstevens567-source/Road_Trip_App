"use client";

import { ChevronLeft, Map, Calendar, DollarSign, Clipboard, BookOpen, CheckCircle2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { getActiveTrip, getTripStays, getTripCountryRules, getTripDays, getTripChecklist, getTripReadiness } from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/ui-helpers";
import type { TripStatus } from "@/types/trip";
import { RouteView } from "./route-view";
import { ItineraryView } from "./itinerary-view";
import { StaysBudgetView } from "./stays-budget-view";
import { PrepView } from "./prep-view";
import { NotesView } from "./notes-view";

export function PlanningShell() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const activeView = state.activeView;

  if (!activeTrip) return null;

  const setAppMode = useTripStore((s) => s.setAppMode);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);
  const setActiveView = useTripStore((s) => s.setActiveView);
  const setTripStatus = useTripStore((s) => s.setTripStatus);

  const stays = getTripStays(state, activeTrip.id);
  const rules = getTripCountryRules(state, activeTrip.id);
  const days = getTripDays(state, activeTrip.id);
  const checklist = getTripChecklist(state, activeTrip.id);
  const readiness = getTripReadiness(stays, rules, checklist);

  const navItems = [
    { id: "route" as const, label: "Route", icon: Map },
    { id: "itinerary" as const, label: "Itinerary", icon: Calendar },
    { id: "stays" as const, label: "Stays & Budget", icon: DollarSign },
    { id: "prep" as const, label: "Prep", icon: Clipboard },
    { id: "notes" as const, label: "Notes", icon: BookOpen },
  ];

  const staysOpenCount = stays.filter((s) => s.status !== "booked").length;
  const complianceOpenCount = rules.flatMap((r) => r.items).filter((i) => i.status !== "done").length;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-slate-50 p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          {/* Trip Header */}
          <div className="space-y-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{activeTrip.name}</h1>
            </div>
            <StatusPill label={activeTrip.status} tone={tripStatusTone(activeTrip.status)} />
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
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
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Readiness Chips */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Readiness
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span className="text-xs text-muted-foreground">Stays</span>
                <span className="text-xs font-semibold text-foreground">
                  {staysOpenCount > 0 ? `${staysOpenCount} open` : "All booked"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span className="text-xs text-muted-foreground">Compliance</span>
                <span className="text-xs font-semibold text-foreground">
                  {complianceOpenCount > 0 ? `${complianceOpenCount} open` : "Done"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span className="text-xs text-muted-foreground">Overall</span>
                <span className="text-xs font-semibold text-foreground">{readiness.overall}%</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            {/* Lifecycle progression */}
            {activeTrip.status === "planning" && readiness.overall >= 80 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => setTripStatus(activeTrip.id, "ready")}
              >
                <CheckCircle2 className="mr-2 size-4" /> Mark as Ready
              </Button>
            )}
            {(activeTrip.status === "planning" || activeTrip.status === "ready") && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setTripStatus(activeTrip.id, "active");
                  setAppMode("trip");
                }}
              >
                Start Trip
              </Button>
            )}
            {activeTrip.status !== "planning" && activeTrip.status !== "ready" && activeTrip.status !== "draft" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAppMode("trip")}
              >
                Switch to Trip Mode
              </Button>
            )}
            {(activeTrip.status === "planning" || activeTrip.status === "draft" || activeTrip.status === "ready") && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAppMode("trip")}
              >
                Preview Trip Mode
              </Button>
            )}
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
          {activeView === "route" && <RouteView />}
          {activeView === "itinerary" && <ItineraryView />}
          {activeView === "stays" && <StaysBudgetView />}
          {activeView === "prep" && <PrepView />}
          {activeView === "notes" && <NotesView />}
        </div>
      </div>
    </div>
  );
}

function tripStatusTone(status: TripStatus): "success" | "warning" | "danger" | "muted" | "info" {
  if (status === "ready") return "success";
  if (status === "active") return "info";
  if (status === "completed") return "muted";
  if (status === "planning") return "warning";
  return "muted";
}
