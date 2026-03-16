"use client";

import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import { TripLibrary } from "./trip-library";
import { PlanningShell } from "./planning/planning-shell";
import { TripModeShell } from "./trip-mode/trip-mode-shell";
import { TripWizard } from "./wizard/trip-wizard";

export function AppShell() {
  const activeTripId = useTripStore((s) => s.activeTripId);
  const appMode = useTripStore((s) => s.appMode);
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      {activeTripId === null ? (
        <TripLibrary onNewTrip={() => setShowWizard(true)} />
      ) : appMode === "planning" ? (
        <PlanningShell />
      ) : (
        <TripModeShell />
      )}
      {showWizard && <TripWizard onClose={() => setShowWizard(false)} />}
    </>
  );
}
