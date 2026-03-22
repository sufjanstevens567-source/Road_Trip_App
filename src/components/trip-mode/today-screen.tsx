"use client";

import { AlertTriangle, BookText, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Shield, Sunrise } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import {
  formatDate,
  formatDistance,
  formatDriveHours,
  getActiveTrip,
  getBorderCrossings,
  getCurrentExecutionDay,
  getDayDriveStats,
  getDayWarnings,
  getLegsForDay,
  getNextExecutionDay,
  getNotesForDay,
  getNotesForStop,
  getTripChecklist,
  getTripCountryRules,
  getTripDays,
  getTripLegs,
  getTripNotes,
  getTripStops,
  getTripStays,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { bookingTone, StatusPill, toneClass, warningTone } from "@/components/shared/ui-helpers";
import { ChecklistRow, CopyButton, NavigateButton } from "./trip-mode-primitives";

export function TodayScreen() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const toggleChecklistItem = useTripStore((s) => s.toggleChecklistItem);
  const toggleCompletedLeg = useTripStore((s) => s.toggleCompletedLeg);
  const clearCompletedLegsForDay = useTripStore((s) => s.clearCompletedLegsForDay);
  const advanceExecutionDay = useTripStore((s) => s.advanceExecutionDay);
  const setAppMode = useTripStore((s) => s.setAppMode);
  const setActiveView = useTripStore((s) => s.setActiveView);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  if (!activeTrip) return null;

  const days = getTripDays(state, activeTrip.id);
  const stays = getTripStays(state, activeTrip.id);
  const legs = getTripLegs(state, activeTrip.id);
  const rules = getTripCountryRules(state, activeTrip.id);
  const checklist = getTripChecklist(state, activeTrip.id);
  const stops = getTripStops(state, activeTrip.id);
  const notes = getTripNotes(state, activeTrip.id);

  const today = getCurrentExecutionDay(days, state.executionDayId);
  const tomorrow = getNextExecutionDay(days, today.id);
  const todayStay = stays.find((stay) => stay.stopId === today.overnightStopId);
  const todayStop = stops.find((stop) => stop.id === today.overnightStopId) ?? null;
  const dayLegs = getLegsForDay(legs, today);
  const todayDriveStats = getDayDriveStats(today, legs);
  const todayWarnings = getDayWarnings(today, legs, rules, checklist, stays);
  const todayChecklist = checklist.filter((item) => item.scope === `day:${today.id}`);
  const borderCrossings = getBorderCrossings(today, legs, rules);
  const headsUpWarnings = todayWarnings.filter((warning) => warning.type !== "checklist");
  const completedLegs = new Set(state.completedLegIds);
  const nextLeg = dayLegs.find((leg) => !completedLegs.has(leg.id)) ?? null;
  const completedCount = dayLegs.filter((leg) => completedLegs.has(leg.id)).length;
  const mergedNotes = [
    ...notes.filter((note) => note.pinned),
    ...getNotesForDay(notes, today.id),
    ...(todayStop ? getNotesForStop(notes, todayStop.id) : []),
  ];
  const relevantNotes = mergedNotes.filter((note, index, array) => array.findIndex((entry) => entry.id === note.id) === index);

  const heroState = deriveHeroState(today, todayWarnings, todayStay);
  const isRestDay = today.type === "rest" || dayLegs.length === 0;
  const completedAllLegs = dayLegs.length > 0 && completedCount === dayLegs.length;
  const nextNavigateLabel = nextLeg
    ? `Navigate to ${stops.find((stop) => stop.id === nextLeg.toStopId)?.name ?? "next stop"}`
    : todayStop
      ? `Navigate to ${todayStop.name}`
      : "Navigate";

  return (
    <div className="view-stage space-y-4 pb-6">
      <Card className={`overflow-hidden border-none px-5 py-5 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.38)] ${heroState.wrapperClass}`}>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600/80">Today</p>
              <div className="space-y-1">
                <h2 data-display="true" className="text-[1.9rem] leading-none text-slate-950">
                  {isRestDay ? `Rest day in ${todayStop?.name ?? "today's stop"}` : `Day ${today.dayNumber}`}
                </h2>
                <p className="text-sm text-slate-700">{formatDate(today.date)}</p>
              </div>
            </div>
            <StatusPill label={heroState.label} tone={heroState.tone} className="shrink-0" />
          </div>

          <div className="rounded-xl border border-white/75 bg-white/72 p-4 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.32)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Tonight</p>
                <p className="text-base font-semibold text-slate-950">{stayHeadline(todayStop?.name, todayStay?.propertyName)}</p>
                <p className="text-sm text-slate-600">{staySubline(todayStay)}</p>
              </div>
              {todayStay && <StatusPill label={presentStayStatus(todayStay.status)} tone={bookingTone(todayStay.status)} />}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {todayStay?.checkInWindow && (
                <div className="rounded-lg bg-white/85 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Check-in</p>
                  <p className="mt-1 text-sm text-slate-800">{todayStay.checkInWindow}</p>
                </div>
              )}
              {todayStay?.confirmationCode && (
                <div className="rounded-lg bg-white/85 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Confirmation</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs text-white">{todayStay.confirmationCode}</code>
                    <CopyButton value={todayStay.confirmationCode} className="h-10 rounded-lg" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {todayStop && <NavigateButton coordinates={todayStop.coordinates} label="Navigate to stay" className="h-11 rounded-xl" />}
              {todayStay?.bookingUrl && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 justify-center rounded-xl"
                  onClick={() => window.open(todayStay.bookingUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="mr-2 size-4" />
                  Open booking
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {todayStop && (
        <NavigateButton
          coordinates={nextLeg ? (stops.find((stop) => stop.id === nextLeg.toStopId)?.coordinates ?? todayStop.coordinates) : todayStop.coordinates}
          label={nextNavigateLabel}
        />
      )}

      {borderCrossings.length > 0 && (
        <Card className="border-[color-mix(in_oklch,var(--primary)_28%,white)] bg-[color-mix(in_oklch,var(--primary)_12%,white)] px-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-600">Border crossings</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl"
                onClick={() => {
                  setAppMode("planning");
                  setActiveView("prep");
                }}
              >
                Open trip prep
              </Button>
            </div>

            <div className="space-y-3">
              {borderCrossings.map((crossing) => (
                <div key={`${crossing.fromCountry}-${crossing.toCountry}`} className="rounded-xl border border-slate-200/80 bg-white/88 px-4 py-4">
                  <p className="font-semibold text-slate-950">
                    {crossing.fromCountry} to {crossing.toCountry}
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-900">Documents:</span>{" "}
                      {crossing.rule?.documents.length ? crossing.rule.documents.join(", ") : "No document list saved yet."}
                    </p>
                    {crossing.rule?.vignetteRequired && (
                      <p>
                        <span className="font-medium text-slate-900">Vignette:</span>{" "}
                        {crossing.rule.vignetteUrl ? "Required and linked in trip prep." : "Required."}
                      </p>
                    )}
                    {crossing.rule?.borderNotes && (
                      <p>
                        <span className="font-medium text-slate-900">Border note:</span> {crossing.rule.borderNotes}
                      </p>
                    )}
                    {crossing.rule?.commonMistakes.length ? (
                      <p>
                        <span className="font-medium text-slate-900">Watch for:</span> {crossing.rule.commonMistakes.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!isRestDay ? (
        <Card className="px-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Today&apos;s drive</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{formatDriveHours(todayDriveStats.hours)} total</p>
              </div>
              <StatusPill
                label={completedAllLegs ? "Driving done" : `${completedCount}/${dayLegs.length} complete`}
                tone={completedAllLegs ? "success" : "info"}
              />
            </div>

            {nextLeg && (
              <div className="rounded-xl border border-slate-200 bg-[color-mix(in_oklch,var(--accent)_18%,white)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Next up</p>
                <p className="mt-1 text-base font-semibold text-slate-950">
                  {stops.find((stop) => stop.id === nextLeg.fromStopId)?.name} to {stops.find((stop) => stop.id === nextLeg.toStopId)?.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDriveHours(nextLeg.driveHours)} · {formatDistance(nextLeg.distanceKm)}
                </p>
                <NavigateButton
                  coordinates={stops.find((stop) => stop.id === nextLeg.toStopId)?.coordinates ?? todayStop?.coordinates ?? [0, 0]}
                  label={`Navigate to ${stops.find((stop) => stop.id === nextLeg.toStopId)?.name ?? "next stop"}`}
                  variant="secondary"
                  className="mt-3"
                />
              </div>
            )}

            <div className="space-y-3">
              {dayLegs.map((leg) => {
                const fromStop = stops.find((stop) => stop.id === leg.fromStopId);
                const toStop = stops.find((stop) => stop.id === leg.toStopId);
                const isCompleted = completedLegs.has(leg.id);

                return (
                  <div
                    key={leg.id}
                    className={`rounded-xl border px-4 py-4 transition-all ${isCompleted ? "border-emerald-200 bg-emerald-50/70 opacity-80" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-base font-semibold ${isCompleted ? "text-emerald-900 line-through decoration-emerald-600/70" : "text-slate-950"}`}>
                          {fromStop?.name} to {toStop?.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatDriveHours(leg.driveHours)} · {formatDistance(leg.distanceKm)}
                        </p>
                        {leg.countriesCrossed.length > 0 && <p className="mt-2 text-xs text-slate-500">{leg.countriesCrossed.join(" · ")}</p>}
                      </div>
                      {isCompleted && <CheckCircle2 className="mt-1 size-5 text-emerald-600" />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {toStop && <NavigateButton coordinates={toStop.coordinates} label={`Navigate to ${toStop.name}`} variant="outline" className="sm:w-auto sm:min-w-[12rem]" />}
                      <Button
                        variant={isCompleted ? "secondary" : "outline"}
                        size="lg"
                        className="h-12 rounded-xl"
                        onClick={() => toggleCompletedLeg(leg.id)}
                      >
                        {isCompleted ? "Marked done" : "Mark done"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {completedAllLegs && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                Driving is done for today. You can move straight to tonight&apos;s stay details or advance the trip when you&apos;re ready.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="px-4 py-4">
          <div className="flex items-start gap-3">
            <Sunrise className="mt-1 size-5 text-primary" />
            <div>
              <p className="text-base font-semibold text-slate-950">Rest day</p>
              <p className="mt-1 text-sm text-slate-600">No driving is planned today, so the stay and local notes take priority.</p>
            </div>
          </div>
        </Card>
      )}

      {headsUpWarnings.length > 0 && (
        <Card className={`px-4 py-4 ${toneClass(headsUpWarnings.some((warning) => warning.severity === "critical") ? "danger" : "warning")}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em]">Heads up</p>
            </div>
            <div className="space-y-3">
              {headsUpWarnings.map((warning) => (
                <div key={warning.id} className="rounded-xl border border-white/65 bg-white/58 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{warning.label}</p>
                      {warning.detail && <p className="mt-1 text-sm text-slate-700">{warning.detail}</p>}
                    </div>
                    <StatusPill label={warning.severity === "critical" ? "Needs fixing" : "Watch"} tone={warningTone(warning.severity)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {todayChecklist.length > 0 && (
        <Card className="px-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Today&apos;s checklist</p>
                <p className="mt-1 text-sm text-slate-600">Tap large rows to mark tasks done on the move.</p>
              </div>
              <StatusPill
                label={`${todayChecklist.filter((item) => item.done).length}/${todayChecklist.length}`}
                tone={todayChecklist.every((item) => item.done) ? "success" : "info"}
              />
            </div>
            <div className="space-y-3">
              {todayChecklist.map((item) => (
                <ChecklistRow key={item.id} label={item.label} checked={item.done} onToggle={() => toggleChecklistItem(item.id)} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {relevantNotes.length > 0 && (
        <Card className="px-4 py-4">
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl"
            onClick={() => setShowNotes((value) => !value)}
          >
            <div className="flex items-center gap-2">
              <BookText className="size-4 text-primary" />
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Pinned notes</p>
                <p className="mt-1 text-sm text-slate-600">{relevantNotes.length} quick references ready for the road.</p>
              </div>
            </div>
            {showNotes ? <ChevronDown className="size-5 text-slate-500" /> : <ChevronRight className="size-5 text-slate-500" />}
          </button>

          {showNotes && (
            <div className="mt-4 space-y-3">
              {relevantNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{note.title}</p>
                    {note.pinned && <StatusPill label="Pinned" tone="info" />}
                    {note.dayId === today.id && <StatusPill label="Today" tone="success" />}
                    {todayStop && note.stopId === todayStop.id && <StatusPill label={todayStop.name} tone="muted" />}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tomorrow ? (
        <Card className="px-4 py-4">
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl"
            onClick={() => setShowTomorrow((value) => !value)}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Tomorrow&apos;s preview</p>
                <p className="mt-1 text-sm text-slate-600">See what comes next before you close out the day.</p>
              </div>
            </div>
            {showTomorrow ? <ChevronDown className="size-5 text-slate-500" /> : <ChevronRight className="size-5 text-slate-500" />}
          </button>

          {showTomorrow && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm">
              <p className="font-semibold text-slate-950">
                Day {tomorrow.dayNumber} · {formatDate(tomorrow.date)}
              </p>
              <p className="mt-1 text-slate-600">
                {getDayDriveStats(tomorrow, legs).hours > 0 ? `${formatDriveHours(getDayDriveStats(tomorrow, legs).hours)} of driving` : "Rest day"}
              </p>
              <p className="mt-2 text-slate-500">
                Overnight in {stops.find((stop) => stop.id === tomorrow.overnightStopId)?.name ?? "the next stop"}.
              </p>
            </div>
          )}
        </Card>
      ) : null}

      <Button
        variant="secondary"
        size="lg"
        className="h-12 w-full rounded-xl"
        onClick={() => {
          clearCompletedLegsForDay(today.id);
          advanceExecutionDay(activeTrip.id);
        }}
      >
        Advance to next day
      </Button>
    </div>
  );
}

function deriveHeroState(day: ReturnType<typeof getCurrentExecutionDay>, warnings: ReturnType<typeof getDayWarnings>, stay: ReturnType<typeof getTripStays>[number] | undefined) {
  const hasCritical = warnings.some((warning) => warning.severity === "critical");
  const hasAttention = warnings.length > 0 || (stay && stay.status !== "booked");

  if (day.type === "rest") {
    return {
      label: "Rest day",
      tone: "info" as const,
      wrapperClass:
        "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_12%,white),color-mix(in_oklch,var(--primary)_18%,white))]",
    };
  }

  if (hasCritical) {
    return {
      label: "Needs fixing",
      tone: "danger" as const,
      wrapperClass:
        "bg-[linear-gradient(180deg,oklch(0.975_0.02_18),oklch(0.948_0.034_18))]",
    };
  }

  if (hasAttention) {
    return {
      label: "Needs attention",
      tone: "warning" as const,
      wrapperClass:
        "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--accent)_16%,white),color-mix(in_oklch,var(--accent)_24%,white))]",
    };
  }

  return {
    label: "Ready to go",
    tone: "success" as const,
    wrapperClass:
      "bg-[linear-gradient(180deg,oklch(0.982_0.018_153),oklch(0.958_0.03_153))]",
  };
}

function presentStayStatus(status: "researching" | "shortlisted" | "booked") {
  if (status === "booked") return "Booked";
  if (status === "shortlisted") return "Shortlisted";
  return "Researching";
}

function stayHeadline(stopName?: string | null, propertyName?: string) {
  if (propertyName) return propertyName;
  if (stopName) return `${stopName} stay`;
  return "Stay not chosen yet";
}

function staySubline(stay?: { status: "researching" | "shortlisted" | "booked"; checkInWindow?: string }) {
  if (!stay) return "No stay is attached yet.";
  if (stay.status === "booked") return stay.checkInWindow ? `Booked · check-in ${stay.checkInWindow}` : "Booked and ready for arrival.";
  if (stay.status === "shortlisted") return "Shortlisted, but not booked yet.";
  return "Still researching — confirm before arrival.";
}
