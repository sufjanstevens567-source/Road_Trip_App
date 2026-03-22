"use client";

import { ChevronLeft, Sun, Home, MapIcon, Flag } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { getActiveTrip } from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { TodayScreen } from "./today-screen";
import { StaysTab } from "./stays-tab";
import { OverviewTab } from "./overview-tab";

export function TripModeShell() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const activeTripView = useTripStore((s) => s.activeTripView);
  const setActiveTripView = useTripStore((s) => s.setActiveTripView);
  const setAppMode = useTripStore((s) => s.setAppMode);
  const setTripStatus = useTripStore((s) => s.setTripStatus);

  if (!activeTrip) return null;

  const tabs = [
    { id: "today" as const, label: "Today", icon: Sun },
    { id: "stays" as const, label: "Stays", icon: Home },
    { id: "overview" as const, label: "Progress", icon: MapIcon },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-4 sticky top-0 z-40 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              On the Road
            </p>
            <h1 className="mt-0.5 text-lg font-semibold text-foreground">{activeTrip.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {activeTrip.status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => {
                  setTripStatus(activeTrip.id, "completed");
                  setAppMode("planning");
                }}
              >
                <Flag className="mr-1.5 size-4" /> Complete trip
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAppMode("planning")}
              className="text-muted-foreground"
            >
              <ChevronLeft className="mr-1.5 size-4" /> Back to planning
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {activeTripView === "today" && <TodayScreen />}
          {activeTripView === "stays" && <StaysTab />}
          {activeTripView === "overview" && <OverviewTab />}
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="border-t border-slate-200 bg-white sticky bottom-0">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTripView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTripView(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-t-2 transition-colors ${
                  isActive
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
