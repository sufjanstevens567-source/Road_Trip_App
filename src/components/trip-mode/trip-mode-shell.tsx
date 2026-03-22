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
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,oklch(0.982_0.008_90),oklch(0.964_0.008_86))]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/94 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">On the Road</p>
            <h1 data-display="true" className="mt-1 text-[1.45rem] leading-none text-foreground">
              {activeTrip.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {activeTrip.status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 rounded-xl text-green-600 hover:bg-green-50 hover:text-green-700"
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
              className="h-10 rounded-xl text-muted-foreground"
            >
              <ChevronLeft className="mr-1.5 size-4" /> Back to planning
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl">
          {activeTripView === "today" && <TodayScreen />}
          {activeTripView === "stays" && <StaysTab />}
          {activeTripView === "overview" && <OverviewTab />}
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="sticky bottom-0 border-t border-slate-200/90 bg-white/96 px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-[color-mix(in_oklch,var(--secondary)_76%,white)] px-1 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTripView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTripView(tab.id)}
                className={`interactive-lift flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-primary shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
