"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Compass,
  Flag,
  Hotel,
  Route,
  ShieldCheck,
  Sparkles,
  StickyNote,
} from "lucide-react";

import { STOP_LOOKUP, TRIP_SEED } from "@/data/trip-seed";
import {
  formatCurrency,
  formatDistance,
  formatDriveHours,
  getBookingCompletion,
  getBudgetBreakdown,
  getBudgetSummary,
  getComplianceCompletion,
  getDayCompletion,
  getMovingDays,
  getNextActions,
  getRiskSummary,
  getSelectedDay,
  getTomorrowDay,
  getTotalDriveDistance,
  getTotalDriveHours,
  getUniqueStopCount,
  getVariantComparison,
  getVehicleCompletion,
  getVisibleBookings,
  getVisibleBudgetItems,
  getVisibleComplianceCountries,
  getVisibleStops,
  groupNotesByCategory,
  groupVehicleChecks,
  statusToneFromBooking,
  statusToneFromCompliance,
  statusToneFromRisk,
  statusToneFromVehicle,
} from "@/lib/trip-utils";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";
import type { AppView, NoteCategory, TripDay } from "@/types/trip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const RouteMap = dynamic(() => import("@/components/road-trip/route-map").then((mod) => mod.RouteMap), {
  ssr: false,
  loading: () => <div className="h-[560px] rounded-[2rem] bg-[color-mix(in_oklch,var(--secondary)_80%,white)]/70" />,
});

const NAV_ITEMS: Array<{ view: AppView; label: string; eyebrow: string; icon: LucideIcon }> = [
  { view: "today", label: "Today", eyebrow: "Now", icon: Compass },
  { view: "journey", label: "Journey", eyebrow: "Days", icon: Route },
  { view: "route", label: "Route", eyebrow: "Map", icon: Flag },
  { view: "stays", label: "Stays", eyebrow: "Rooms", icon: Hotel },
  { view: "prep", label: "Trip Prep", eyebrow: "Ready", icon: ShieldCheck },
  { view: "notes", label: "Notes", eyebrow: "Memory", icon: StickyNote },
];

const NOTE_CATEGORIES: NoteCategory[] = ["food", "swim-hike", "detour", "parking", "later", "general"];

function toneClass(tone: string) {
  if (tone === "success") return "border-emerald-700/15 bg-emerald-600/8 text-emerald-900";
  if (tone === "warning") return "border-amber-700/15 bg-amber-500/10 text-amber-950";
  if (tone === "danger") return "border-orange-800/15 bg-orange-700/10 text-orange-950";
  return "border-slate-700/12 bg-slate-500/8 text-slate-800";
}

function statusLabel(value: string) {
  return value.replace("-", " ");
}

function readinessLabel(value: number) {
  if (value >= 80) return "Departure-ready";
  if (value >= 62) return "Calming into shape";
  if (value >= 45) return "Still settling";
  return "Needs a stronger lock";
}

function readinessNarrative(value: number) {
  if (value >= 80) return "The route is feeling confident: most of the operational risk is already resolved and the remaining work is refinement, not rescue.";
  if (value >= 62) return "The trip has good bones. A few practical decisions still need locking, but the structure is strong and the route already feels trustworthy.";
  if (value >= 45) return "The journey logic is right, but a handful of bookings, prep items, and parking decisions still need to become concrete before the trip feels luxurious.";
  return "The route concept is strong, but too much is still open for the experience to feel calm. The next few decisions matter disproportionately.";
}

function dayAccent(day: TripDay) {
  const stop = STOP_LOOKUP[day.overnightStopId];
  if (stop.kind === "scenic") return "from-emerald-100/95 via-white to-emerald-50/70";
  if (stop.kind === "finish") return "from-orange-100/95 via-white to-amber-50/70";
  if (stop.kind === "city") return "from-sky-100/95 via-white to-indigo-50/70";
  return "from-stone-100/95 via-white to-stone-50/70";
}

function SectionLead({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
        <h2 data-display="true" className="max-w-4xl text-[clamp(2rem,3vw,3.2rem)] leading-[0.95] text-foreground">{title}</h2>
        <p className="max-w-3xl text-[0.98rem] leading-7 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusPill({ label, tone, className }: { label: string; tone: string; className?: string }) {
  return <Badge className={cn("border px-3 py-1 text-[0.68rem] tracking-[0.08em] uppercase", toneClass(tone), className)}>{label}</Badge>;
}

function ReadinessStrip({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-2.5 bg-black/5" />
    </div>
  );
}

function DesktopNavButton({ item, active, onClick }: { item: (typeof NAV_ITEMS)[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-[1.5rem] border px-4 py-3 text-left transition duration-300",
        active ? "border-black/10 bg-white/90 shadow-[0_18px_40px_-28px_rgba(35,48,84,0.45)]" : "border-transparent bg-white/0 hover:border-black/6 hover:bg-white/60"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex size-11 items-center justify-center rounded-full border border-black/8 bg-white/70 text-foreground transition", active && "bg-[color-mix(in_oklch,var(--secondary)_82%,white)]")}>
          <item.icon className="size-4" />
        </div>
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{item.eyebrow}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{item.label}</p>
        </div>
      </div>
      <ArrowRight className={cn("size-4 text-muted-foreground transition-transform duration-300", active && "translate-x-0.5 text-foreground")} />
    </button>
  );
}
function JourneyChapter({
  day,
  expanded,
  editing,
  isSelected,
  isExecution,
  onToggle,
  onSelect,
  onToggleEdit,
}: {
  day: TripDay;
  expanded: boolean;
  editing: boolean;
  isSelected: boolean;
  isExecution: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onToggleEdit: () => void;
}) {
  const { toggleChecklistItem, updateDayText, toggleRiskResolved, setExecutionDayId } = useTripStore();
  const stop = STOP_LOOKUP[day.overnightStopId];
  const completion = getDayCompletion(day);
  const openRisks = day.risks.filter((risk) => !risk.resolved);

  return (
    <article className={cn("overflow-hidden rounded-[2rem] border border-black/7 bg-[linear-gradient(180deg,rgba(255,252,247,0.94),rgba(255,255,255,0.88))] shadow-[0_26px_80px_-42px_rgba(36,45,76,0.4)] animate-in fade-in slide-in-from-bottom-3 duration-500", isSelected && "border-black/12 shadow-[0_30px_90px_-46px_rgba(31,45,86,0.46)]")}>
      <div className={cn("h-2 bg-gradient-to-r", dayAccent(day))} />
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[220px_minmax(0,1fr)_320px] xl:px-7">
        <div className="space-y-4 xl:border-r xl:border-black/6 xl:pr-6">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Day {day.dayNumber}</span>
              <span>{day.dateLabel}</span>
            </div>
            <StatusPill label={stop.markerLabel} tone={stop.kind === "scenic" ? "success" : stop.kind === "finish" ? "danger" : "muted"} />
            {isExecution ? <StatusPill label="Current anchor" tone="danger" /> : null}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{day.overnightLabel}</p>
            <p className="mt-1 text-lg font-medium text-foreground">{stop.name}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{stop.summary}</p>
          </div>
          <div className="rounded-[1.5rem] border border-black/6 bg-white/60 p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Chapter confidence</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{completion}%</p>
            <p className="mt-1 text-sm text-muted-foreground">{completion >= 75 ? "Locked" : completion >= 50 ? "Settling" : "Still shaping"}</p>
          </div>
          <Button variant={isExecution ? "secondary" : "outline"} size="sm" onClick={() => setExecutionDayId(day.id)}>
            {isExecution ? "Execution day in use" : "Use as execution day"}
          </Button>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h3 data-display="true" className="text-[clamp(1.5rem,2.2vw,2.4rem)] leading-tight text-foreground">{day.routeLabel}</h3>
              <p className="max-w-3xl text-[1rem] leading-7 text-foreground/88">{day.theme}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={onSelect}>Focus</Button>
              <Button variant={editing ? "secondary" : "outline"} size="sm" onClick={onToggleEdit}>{editing ? "Done editing" : "Edit chapter"}</Button>
              <Button variant="outline" size="sm" onClick={onToggle}>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}{expanded ? "Hide details" : "Open details"}</Button>
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{day.routeNotes}</p>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-black/6 bg-white/60 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Drive</p><p className="mt-2 text-xl font-medium text-foreground">{formatDriveHours(day.driveHours)}</p><p className="text-sm text-muted-foreground">{formatDistance(day.driveDistanceKm)}</p></div>
            <div className="rounded-[1.4rem] border border-black/6 bg-white/60 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Stay</p><p className="mt-2 text-xl font-medium text-foreground">{day.overnightLabel}</p><p className="text-sm text-muted-foreground">{day.accommodationName}</p></div>
            <div className="rounded-[1.4rem] border border-black/6 bg-white/60 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Parking logic</p><p className="mt-2 text-sm leading-6 text-foreground/86">{day.parkingStrategy}</p></div>
          </div>

          <div className="flex flex-wrap gap-2">{day.highlights.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.6rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_72%,white)]/55 p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Checklist</p>
              <div className="mt-4 space-y-3">
                {day.checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 rounded-[1.2rem] border border-black/6 bg-white/70 px-3 py-2.5">
                    <Checkbox checked={item.done} onCheckedChange={() => toggleChecklistItem(day.id, item.id)} />
                    <span className={cn("text-sm", item.done && "line-through text-muted-foreground")}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-black/6 bg-white/66 p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Open risks</p>
              <div className="mt-4 space-y-3">
                {openRisks.length ? openRisks.map((risk) => (
                  <button key={risk.id} type="button" onClick={() => toggleRiskResolved(day.id, risk.id)} className={cn("w-full rounded-[1.2rem] border px-3 py-3 text-left text-sm transition", toneClass(statusToneFromRisk(risk.severity)))}>
                    <span className="font-medium">{risk.label}</span>
                    <span className="mt-1 block text-xs leading-5">{risk.detail}</span>
                  </button>
                )) : <div className="rounded-[1.2rem] border border-emerald-700/15 bg-emerald-600/8 px-3 py-3 text-sm text-emerald-900">This chapter has no unresolved risks right now.</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:border-l xl:border-black/6 xl:pl-6">
          <div className="rounded-[1.6rem] border border-black/6 bg-white/62 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Tolls and legal next</p><p className="mt-3 text-sm leading-6 text-foreground/86">{day.tolls.join(" • ")}</p></div>
          <div className="rounded-[1.6rem] border border-black/6 bg-white/62 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Reminders</p><div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{day.reminders.map((item) => <p key={item}>{item}</p>)}</div></div>
          <div className="rounded-[1.6rem] border border-black/6 bg-white/62 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Activity shape</p><div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{day.activityIdeas.map((item) => <p key={item}>{item}</p>)}</div></div>
        </div>
      </div>

      {expanded ? <div className="border-t border-dashed border-black/8 bg-[linear-gradient(180deg,rgba(255,252,248,0.55),rgba(255,255,255,0.8))] px-6 py-6 xl:px-7"><div className="grid gap-4 xl:grid-cols-3"><div className="space-y-3 rounded-[1.6rem] border border-black/6 bg-white/76 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Accommodation</p>{editing ? <><Input value={day.accommodationName} onChange={(event) => updateDayText(day.id, "accommodationName", event.target.value)} /><Textarea className="min-h-28" value={day.accommodationDetails} onChange={(event) => updateDayText(day.id, "accommodationDetails", event.target.value)} /></> : <><p className="text-base font-medium text-foreground">{day.accommodationName}</p><p className="text-sm leading-7 text-muted-foreground">{day.accommodationDetails}</p></>}</div><div className="space-y-3 rounded-[1.6rem] border border-black/6 bg-white/76 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Parking detail</p>{editing ? <Textarea className="min-h-32" value={day.parkingDetails} onChange={(event) => updateDayText(day.id, "parkingDetails", event.target.value)} /> : <p className="text-sm leading-7 text-muted-foreground">{day.parkingDetails}</p>}</div><div className="space-y-3 rounded-[1.6rem] border border-black/6 bg-white/76 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Planner notes</p>{editing ? <Textarea className="min-h-32" value={day.notes} onChange={(event) => updateDayText(day.id, "notes", event.target.value)} /> : <p className="text-sm leading-7 text-muted-foreground">{day.notes}</p>}</div></div></div> : null}
    </article>
  );
}

function StayCard({ booking, editing, onToggleEdit }: { booking: (ReturnType<typeof getVisibleBookings>)[number]; editing: boolean; onToggleEdit: () => void }) {
  const { updateBooking } = useTripStore();
  const stop = STOP_LOOKUP[booking.stopId];
  const tone = statusToneFromBooking(booking.status);

  return (
    <article className="rounded-[1.9rem] border border-black/7 bg-[linear-gradient(180deg,rgba(255,252,248,0.94),rgba(255,255,255,0.86))] p-6 shadow-[0_22px_70px_-40px_rgba(36,45,76,0.38)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><StatusPill label={statusLabel(booking.status)} tone={tone} /><StatusPill label={booking.parkingIncluded ? "Parking solved" : "Parking not locked"} tone={booking.parkingIncluded ? "success" : "warning"} /></div>
          <h3 data-display="true" className="text-[clamp(1.35rem,2vw,2rem)] leading-tight text-foreground">{booking.city}</h3>
          <p className="text-sm text-muted-foreground">{booking.dateLabel}</p>
        </div>
        <Button variant={editing ? "secondary" : "outline"} size="sm" onClick={onToggleEdit}>{editing ? "Done" : "Edit stay"}</Button>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          {editing ? <><Input value={booking.propertyName} onChange={(event) => updateBooking(booking.id, "propertyName", event.target.value)} /><div className="grid gap-3 md:grid-cols-2"><select className={cn("rounded-full border px-3 py-2 text-sm", toneClass(tone))} value={booking.status} onChange={(event) => updateBooking(booking.id, "status", event.target.value)}><option value="missing">Missing</option><option value="researching">Researching</option><option value="shortlist">Shortlist</option><option value="booked">Booked</option></select><Input value={booking.checkInWindow} onChange={(event) => updateBooking(booking.id, "checkInWindow", event.target.value)} /></div><div className="flex items-center gap-3 rounded-[1.2rem] border border-black/6 bg-white/76 px-4 py-3"><Checkbox checked={booking.parkingIncluded} onCheckedChange={(checked) => updateBooking(booking.id, "parkingIncluded", Boolean(checked))} /><span className="text-sm text-foreground">Parking included</span></div><Textarea className="min-h-28" value={booking.notes} onChange={(event) => updateBooking(booking.id, "notes", event.target.value)} /><div className="grid gap-3 md:grid-cols-2"><Input value={booking.cancellationPolicy} onChange={(event) => updateBooking(booking.id, "cancellationPolicy", event.target.value)} /><Input value={booking.confirmationCode} onChange={(event) => updateBooking(booking.id, "confirmationCode", event.target.value)} placeholder="Confirmation code" /></div></> : <><div><p className="text-lg font-medium text-foreground">{booking.propertyName}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{booking.notes}</p></div><div className="grid gap-3 md:grid-cols-2"><div className="rounded-[1.3rem] border border-black/6 bg-white/72 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Cancellation</p><p className="mt-2 text-sm leading-6 text-foreground/86">{booking.cancellationPolicy}</p></div><div className="rounded-[1.3rem] border border-black/6 bg-white/72 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Check-in</p><p className="mt-2 text-sm leading-6 text-foreground/86">{booking.checkInWindow}</p></div></div></>}
        </div>
        <div className="space-y-4 rounded-[1.7rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_70%,white)]/55 p-5">
          <div><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Place logic</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{stop.summary}</p></div>
          <div><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Parking bias</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{stop.parkingBias}</p></div>
          {booking.confirmationCode ? <div><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Confirmation</p><p className="mt-2 text-sm font-medium text-foreground">{booking.confirmationCode}</p></div> : null}
        </div>
      </div>
    </article>
  );
}

function NoteSheet({ note, editing, onToggleEdit }: { note: (typeof TRIP_SEED.notes)[number]; editing: boolean; onToggleEdit: () => void }) {
  const { updateNote } = useTripStore();
  const linkedStop = note.linkedStopId ? STOP_LOOKUP[note.linkedStopId] : null;

  return (
    <article className="rounded-[1.7rem] border border-black/7 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(255,255,255,0.86))] p-5 shadow-[0_20px_60px_-40px_rgba(36,45,76,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"> <StatusPill label={statusLabel(note.category)} tone="muted" /> {note.pinned ? <StatusPill label="Pinned" tone="warning" /> : null} {linkedStop ? <StatusPill label={linkedStop.name} tone={linkedStop.kind === "scenic" ? "success" : "muted"} /> : null}</div>
          {editing ? <Input value={note.title} onChange={(event) => updateNote(note.id, "title", event.target.value)} /> : <h3 className="text-lg font-medium text-foreground">{note.title}</h3>}
        </div>
        <Button variant={editing ? "secondary" : "outline"} size="sm" onClick={onToggleEdit}>{editing ? "Done" : "Edit"}</Button>
      </div>
      <div className="mt-4">
        {editing ? <><Textarea className="min-h-28" value={note.body} onChange={(event) => updateNote(note.id, "body", event.target.value)} /><label className="mt-3 flex items-center gap-3 text-sm text-muted-foreground"><Checkbox checked={note.pinned} onCheckedChange={(checked) => updateNote(note.id, "pinned", Boolean(checked))} />Keep pinned in the desk view</label></> : <p className="text-sm leading-7 text-muted-foreground">{note.body}</p>}
      </div>
    </article>
  );
}

export function RoadTripApp() {
  const store = useTripStore();
  const [bookingFilter, setBookingFilter] = useState<"all" | "open" | "booked" | "parking">("all");
  const [noteDraft, setNoteDraft] = useState({ category: "general" as NoteCategory, title: "", body: "" });
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const visibleBookings = useMemo(() => getVisibleBookings(store.bookings, store.routeVariant), [store.bookings, store.routeVariant]);
  const visibleCountries = useMemo(() => getVisibleComplianceCountries(store.complianceCountries, store.routeVariant), [store.complianceCountries, store.routeVariant]);
  const visibleBudget = useMemo(() => getVisibleBudgetItems(store.budgetItems, store.routeVariant), [store.routeVariant, store.budgetItems]);
  const visibleStops = useMemo(() => getVisibleStops(store.routeVariant), [store.routeVariant]);

  const selectedDay = getSelectedDay(store.days, store.selectedDayId);
  const currentDay = getSelectedDay(store.days, store.executionDayId);
  const tomorrow = getTomorrowDay(store.days, store.executionDayId);
  const selectedStop = STOP_LOOKUP[selectedDay.overnightStopId];
  const currentStop = STOP_LOOKUP[currentDay.overnightStopId];
  const tomorrowStop = STOP_LOOKUP[tomorrow.overnightStopId];
  const selectedViaStops = (selectedDay.viaStopIds ?? []).map((stopId) => STOP_LOOKUP[stopId]);

  const totalHours = getTotalDriveHours(store.days);
  const movingDays = getMovingDays(store.days);
  const totalDistance = getTotalDriveDistance(store.days);
  const budgetSummary = getBudgetSummary(visibleBudget);
  const bookingCompletion = getBookingCompletion(visibleBookings);
  const complianceCompletion = getComplianceCompletion(visibleCountries);
  const vehicleCompletion = getVehicleCompletion(store.vehicleChecks);
  const readinessAverage = Math.round((bookingCompletion + complianceCompletion + vehicleCompletion) / 3);
  const nextActions = getNextActions(store);
  const unresolvedRisks = getRiskSummary(store.days);
  const variantComparison = getVariantComparison(store.routeVariant);
  const budgetBreakdown = getBudgetBreakdown(visibleBudget);
  const groupedVehicleChecks = groupVehicleChecks(store.vehicleChecks);
  const notesByCategory = groupNotesByCategory(store.notes);
  const pinnedNotes = store.notes.filter((note) => note.pinned);
  const routePhilosophy = store.notes.find((note) => note.title === "Route philosophy") ?? pinnedNotes[0];
  const prepActions = visibleCountries.flatMap((country) => country.items.filter((item) => item.status === "needs-action"));
  const filteredBookings = visibleBookings.filter((booking) => bookingFilter === "open" ? booking.status !== "booked" : bookingFilter === "booked" ? booking.status === "booked" : bookingFilter === "parking" ? !booking.parkingIncluded : true);

  const renderToday = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionLead eyebrow="Desk view" title="A calmer desk for the route, not a dashboard wall of data." description="The desktop experience now prioritizes the current chapter, the next move, and the few decisions that still control whether the trip feels luxurious or merely organized." />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden bg-[linear-gradient(140deg,rgba(255,251,245,0.96),rgba(255,255,255,0.9))]"><CardContent className="px-7 py-7"><div className="flex flex-wrap items-center gap-2"><StatusPill label="Current chapter" tone="muted" /><StatusPill label={currentStop.name} tone={currentStop.kind === "scenic" ? "success" : "muted"} /></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-4"><div><p className="text-[0.72rem] uppercase tracking-[0.26em] text-muted-foreground">Execution day</p><h3 data-display="true" className="mt-2 text-[clamp(2.2rem,4vw,4rem)] leading-[0.92] text-foreground">{currentDay.routeLabel}</h3><p className="mt-4 max-w-2xl text-[1rem] leading-7 text-foreground/88">{currentDay.theme}</p></div><p className="max-w-2xl text-sm leading-7 text-muted-foreground">{currentDay.routeNotes}</p><div className="flex flex-wrap gap-2"><StatusPill label={formatDriveHours(currentDay.driveHours)} tone="muted" /><StatusPill label={formatDistance(currentDay.driveDistanceKm)} tone="muted" /><StatusPill label={currentDay.overnightLabel} tone="success" /></div></div><div className="rounded-[1.8rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_74%,white)]/70 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Place spotlight</p><h4 className="mt-3 text-xl font-medium text-foreground">{currentStop.name}</h4><p className="mt-2 text-sm leading-7 text-muted-foreground">{currentStop.summary}</p><Separator className="my-4 bg-black/6" /><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Parking bias</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{currentStop.parkingBias}</p></div></div></CardContent></Card>
        <Card className="bg-[linear-gradient(180deg,rgba(255,254,250,0.95),rgba(255,255,255,0.9))]"><CardHeader><CardDescription>Departure confidence</CardDescription><CardTitle className="text-[2rem] tracking-tight">{readinessLabel(readinessAverage)}</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-7 text-muted-foreground">{readinessNarrative(readinessAverage)}</p><ReadinessStrip label="Stays" value={bookingCompletion} /><ReadinessStrip label="Trip prep" value={complianceCompletion} /><ReadinessStrip label="Vehicle" value={vehicleCompletion} /><div className="rounded-[1.6rem] border border-black/6 bg-white/68 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Open pressure points</p><div className="mt-3 flex items-center gap-3"><CircleAlert className="size-4 text-orange-800" /><p className="text-sm text-foreground">{nextActions.length} active decisions and {unresolvedRisks.length} unresolved route risks.</p></div></div></CardContent></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr_0.86fr]"><Card><CardHeader><CardDescription>Tomorrow</CardDescription><CardTitle className="text-[1.9rem]">{tomorrow.routeLabel}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-7 text-muted-foreground">{tomorrow.theme}</p><div className="flex flex-wrap gap-2"><StatusPill label={formatDriveHours(tomorrow.driveHours)} tone="muted" /><StatusPill label={formatDistance(tomorrow.driveDistanceKm)} tone="muted" /><StatusPill label={tomorrowStop.name} tone={tomorrowStop.kind === "scenic" ? "success" : "muted"} /></div><div className="rounded-[1.5rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_72%,white)]/58 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Arrival logic</p><p className="mt-2 text-sm leading-7 text-foreground/86">{tomorrow.parkingStrategy}</p></div></CardContent></Card><Card><CardHeader><CardDescription>Journey line</CardDescription><CardTitle className="text-[1.9rem]">A direct corridor with carefully chosen chapters.</CardTitle></CardHeader><CardContent><ol className="space-y-3">{store.days.map((day) => <li key={day.id} className="flex items-start gap-3"><div className="mt-1 size-2.5 rounded-full bg-[color-mix(in_oklch,var(--primary)_88%,white)]" /><div><button type="button" onClick={() => store.setSelectedDayId(day.id)} className="text-left text-sm font-medium text-foreground hover:text-[color-mix(in_oklch,var(--primary)_92%,black)]">Day {day.dayNumber}: {day.routeLabel}</button><p className="text-xs text-muted-foreground">{day.dateLabel} • {formatDriveHours(day.driveHours)} • {day.overnightLabel}</p></div></li>)}</ol></CardContent></Card><Card><CardHeader><CardDescription>Priority decisions</CardDescription><CardTitle className="text-[1.9rem]">The few things still shaping the feel of the trip.</CardTitle></CardHeader><CardContent className="space-y-3">{nextActions.slice(0, 4).map((action) => <div key={action.id} className={cn("rounded-[1.4rem] border px-4 py-4 text-sm", toneClass(action.tone))}><p className="font-medium">{action.title}</p><p className="mt-2 text-xs leading-6">{action.detail}</p></div>)}</CardContent></Card></div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]"><Card><CardHeader><CardDescription>Route philosophy</CardDescription><CardTitle className="text-[1.9rem]">Why this route feels coherent.</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-7 text-muted-foreground">{routePhilosophy?.body ?? TRIP_SEED.routeSummary}</p><div className="grid gap-3 md:grid-cols-3"><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Trip days</p><p className="mt-2 text-2xl font-semibold text-foreground">{store.days.length}</p><p className="text-sm text-muted-foreground">{getUniqueStopCount(store.routeVariant)} major stops</p></div><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Drive time</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatDriveHours(totalHours)}</p><p className="text-sm text-muted-foreground">{movingDays.length} meaningful driving days</p></div><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Distance</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatDistance(totalDistance)}</p><p className="text-sm text-muted-foreground">with a cleaner Serbia bridge stop</p></div></div></CardContent></Card><Card><CardHeader><CardDescription>Risks still open</CardDescription><CardTitle className="text-[1.9rem]">What still needs calming down.</CardTitle></CardHeader><CardContent className="space-y-3">{unresolvedRisks.slice(0, 5).map((risk) => <div key={risk.id} className={cn("rounded-[1.4rem] border px-4 py-4 text-sm", toneClass(statusToneFromRisk(risk.severity)))}><p className="font-medium">Day {risk.dayNumber}: {risk.title}</p><p className="mt-2 text-xs leading-6">{risk.detail}</p></div>)}</CardContent></Card></div>
    </div>
  );

  const renderJourney = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionLead eyebrow="Journey" title="Read the trip as a sequence of chapters, not a stack of admin cards." description="Each day should feel like a deliberate part of the journey, with the practical layer present when you need it and quiet when you do not." action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={store.expandAllDays}>Open all chapters</Button><Button variant="ghost" size="sm" onClick={store.collapseAllDays}>Collapse all</Button></div>} />
      <Card className="bg-[linear-gradient(135deg,rgba(255,251,244,0.96),rgba(244,250,246,0.82))]"><CardContent className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Selected corridor</p><p className="mt-2 text-lg font-medium text-foreground">{TRIP_SEED.routeVariants[store.routeVariant].impactSummary}</p></div><p className="max-w-xl text-sm leading-7 text-muted-foreground">Comparing against {variantComparison.alternative.label} changes the route by {formatDriveHours(Math.abs(variantComparison.driveDeltaHours))} and {Math.abs(variantComparison.distanceDeltaKm)} km.</p></CardContent></Card>
      <div className="space-y-5">{store.days.map((day) => <JourneyChapter key={day.id} day={day} expanded={store.expandedDayIds.includes(day.id)} editing={editingDayId === day.id} isSelected={store.selectedDayId === day.id} isExecution={store.executionDayId === day.id} onToggle={() => store.toggleExpandedDay(day.id)} onSelect={() => { store.setSelectedDayId(day.id); store.setActiveView("journey"); }} onToggleEdit={() => setEditingDayId((current) => current === day.id ? null : day.id)} />)}</div>
    </div>
  );

  const renderRoute = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionLead eyebrow="Route" title="The map should explain the journey, not merely trace it." description="This view keeps the spatial logic and the route story together: why the legs break where they do, where the pressure sits, and what each chapter adds to the whole trip." />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card><CardHeader><CardDescription>Selected leg</CardDescription><CardTitle className="text-[2rem]">{selectedDay.routeLabel}</CardTitle></CardHeader><CardContent className="space-y-5 text-sm text-muted-foreground"><p className="leading-7">{selectedDay.routeNotes}</p><div className="flex flex-wrap gap-2"><StatusPill label={formatDriveHours(selectedDay.driveHours)} tone="muted" /><StatusPill label={formatDistance(selectedDay.driveDistanceKm)} tone="muted" /><StatusPill label={selectedDay.overnightLabel} tone="success" />{selectedViaStops.map((stop) => <StatusPill key={stop.id} label={`Via ${stop.name}`} tone="warning" />)}</div><div className="rounded-[1.6rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_72%,white)]/58 p-5"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Destination character</p><p className="mt-2 text-lg font-medium text-foreground">{selectedStop.name}</p><p className="mt-2 leading-7">{selectedStop.summary}</p><p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Parking bias</p><p className="mt-2 leading-7">{selectedStop.parkingBias}</p></div><Separator className="bg-black/6" /><div className="space-y-2">{store.days.map((day) => <button key={day.id} type="button" onClick={() => store.setSelectedDayId(day.id)} className={cn("flex w-full items-center justify-between rounded-[1.3rem] border px-4 py-3 text-left text-sm transition", store.selectedDayId === day.id ? "border-black/10 bg-white/90" : "border-black/6 bg-white/58 hover:bg-white/80")}><span>Day {day.dayNumber}: {day.routeLabel}</span><ArrowRight className="size-4" /></button>)}</div></CardContent></Card>
        <Card className="overflow-hidden p-0"><CardContent className="p-3"><RouteMap stops={visibleStops} days={store.days} selectedDayId={store.selectedDayId} onSelectDay={store.setSelectedDayId} /></CardContent></Card>
      </div>
    </div>
  );

  const renderStays = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionLead eyebrow="Stays" title="Keep the accommodation layer elegant, confident, and budget-aware." description="This workspace is where the route becomes real: stays, parking confidence, cancellation safety, and the spending decisions that shape the feel of the trip." action={<div className="flex gap-2">{(["all", "open", "booked", "parking"] as const).map((filter) => <Button key={filter} variant={bookingFilter === filter ? "secondary" : "outline"} size="sm" onClick={() => setBookingFilter(filter)}>{filter === "all" ? "All stays" : filter === "open" ? "Needs work" : filter === "booked" ? "Booked" : "Parking weak"}</Button>)}</div>} />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"><Card><CardHeader><CardDescription>Stay confidence</CardDescription><CardTitle className="text-[2rem]">{bookingCompletion}% of the stay layer feels locked.</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Selected route</p><p className="mt-2 text-lg font-medium text-foreground">{TRIP_SEED.routeVariants[store.routeVariant].shortLabel}</p></div><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Planned spend</p><p className="mt-2 text-lg font-medium text-foreground">{formatCurrency(budgetSummary.planned)}</p></div><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Tracked so far</p><p className="mt-2 text-lg font-medium text-foreground">{formatCurrency(budgetSummary.actual)}</p></div></CardContent></Card><Card><CardHeader><CardDescription>Spend outlook</CardDescription><CardTitle className="text-[2rem]">{formatCurrency(budgetSummary.remaining)} still uncommitted.</CardTitle></CardHeader><CardContent className="space-y-4">{Array.from(budgetBreakdown.entries()).map(([category, values]) => <div key={category} className="space-y-2"><div className="flex items-center justify-between text-sm text-muted-foreground"><span className="capitalize">{category}</span><span>{formatCurrency(values.actual)} / {formatCurrency(values.planned)}</span></div><Progress value={values.planned ? Math.min((values.actual / values.planned) * 100, 100) : 0} className="h-2.5 bg-black/5" /></div>)}</CardContent></Card></div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><div className="space-y-5">{filteredBookings.map((booking) => <StayCard key={booking.id} booking={booking} editing={editingBookingId === booking.id} onToggleEdit={() => setEditingBookingId((current) => current === booking.id ? null : booking.id)} />)}</div><Card><CardHeader><CardDescription>Budget desk</CardDescription><CardTitle className="text-[2rem]">Adjust the spend plan without leaving the stay workflow.</CardTitle></CardHeader><CardContent className="space-y-3">{visibleBudget.map((item) => <div key={item.id} className="grid gap-3 rounded-[1.4rem] border border-black/6 bg-white/68 p-4 md:grid-cols-[1fr_120px_120px]"><div><p className="font-medium text-foreground">{item.label}</p><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.category}</p></div><Input type="number" value={String(item.planned)} onChange={(event) => store.updateBudgetItem(item.id, "planned", Number(event.target.value))} /><Input type="number" value={String(item.actual)} onChange={(event) => store.updateBudgetItem(item.id, "actual", Number(event.target.value))} /></div>)}</CardContent></Card></div>
    </div>
  );

  const renderPrep = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionLead eyebrow="Trip prep" title="Turn legal, vehicle, and arrival details into quiet confidence." description="A premium travel experience is mostly invisible preparation. This desk keeps the practical layer readable without letting it dominate the product." />
      <div className="grid gap-6 xl:grid-cols-3"><Card><CardHeader><CardDescription>Trip prep readiness</CardDescription><CardTitle className="text-[2rem]">{complianceCompletion}% legal and border confidence.</CardTitle></CardHeader><CardContent><ReadinessStrip label="Country and document prep" value={complianceCompletion} /></CardContent></Card><Card><CardHeader><CardDescription>Vehicle readiness</CardDescription><CardTitle className="text-[2rem]">{vehicleCompletion}% vehicle and roadside confidence.</CardTitle></CardHeader><CardContent><ReadinessStrip label="Vehicle and kit" value={vehicleCompletion} /></CardContent></Card><Card><CardHeader><CardDescription>Open blockers</CardDescription><CardTitle className="text-[2rem]">{prepActions.length} prep actions still need an owner.</CardTitle></CardHeader><CardContent><p className="text-sm leading-7 text-muted-foreground">Munich, Ljubljana, Belgrade, and Sofia still concentrate most of the practical exposure. This screen exists to make those risks finite.</p></CardContent></Card></div>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"><div className="space-y-5">{visibleCountries.map((country) => <Card key={country.id}><CardHeader><CardDescription>{country.country}</CardDescription><CardTitle className="text-[1.8rem]">{country.summary}</CardTitle></CardHeader><CardContent className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]"><div className="space-y-3">{country.items.map((item) => <div key={item.id} className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-medium text-foreground">{item.label}</p><select className={cn("rounded-full border px-3 py-2 text-sm", toneClass(statusToneFromCompliance(item.status)))} value={item.status} onChange={(event) => store.updateComplianceItemStatus(country.id, item.id, event.target.value as typeof item.status)}><option value="needs-action">Needs action</option><option value="watch">Watch</option><option value="ready">Ready</option></select></div><p className="mt-3 text-sm leading-7 text-muted-foreground">{item.detail}</p>{item.dueBy ? <p className="mt-3 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Due {item.dueBy}</p> : null}</div>)}</div><div className="space-y-4 rounded-[1.7rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_72%,white)]/55 p-5 text-sm leading-7 text-muted-foreground"><div><p className="text-[0.68rem] uppercase tracking-[0.22em]">Parking strategy</p><p className="mt-2">{country.parkingStrategy}</p></div><div><p className="text-[0.68rem] uppercase tracking-[0.22em]">Documents</p><p className="mt-2">{country.documents.join(" • ")}</p></div><div><p className="text-[0.68rem] uppercase tracking-[0.22em]">Common mistakes</p><p className="mt-2">{country.commonMistakes.join(" • ")}</p></div><div><p className="text-[0.68rem] uppercase tracking-[0.22em]">Border note</p><p className="mt-2">{country.borderNotes}</p></div></div></CardContent></Card>)}</div><div className="space-y-5">{Object.entries(groupedVehicleChecks).map(([group, items]) => <Card key={group}><CardHeader><CardDescription>{group}</CardDescription><CardTitle className="text-[1.8rem] capitalize">{group} readiness</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-medium text-foreground">{item.label}</p><select className={cn("rounded-full border px-3 py-2 text-sm", toneClass(statusToneFromVehicle(item.status)))} value={item.status} onChange={(event) => store.updateVehicleCheck(item.id, event.target.value as typeof item.status)}><option value="todo">Todo</option><option value="watch">Watch</option><option value="done">Done</option></select></div><Textarea className="mt-3 min-h-24" value={item.note} onChange={(event) => store.updateVehicleCheck(item.id, item.status, event.target.value)} /></div>)}</CardContent></Card>)}</div></div>
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionLead eyebrow="Notes" title="Keep the memory layer curated, legible, and close to the journey." description="Notes should feel like remembered travel intelligence: the small details that make the route smoother, more local, and more human." />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]"><Card><CardHeader><CardDescription>Quick capture</CardDescription><CardTitle className="text-[2rem]">Add a note without breaking the travel rhythm.</CardTitle></CardHeader><CardContent className="space-y-3"><select className="rounded-full border border-black/10 bg-white/76 px-4 py-2.5 text-sm" value={noteDraft.category} onChange={(event) => setNoteDraft((current) => ({ ...current, category: event.target.value as NoteCategory }))}>{NOTE_CATEGORIES.map((category) => <option key={category} value={category}>{statusLabel(category)}</option>)}</select><Input placeholder="Title" value={noteDraft.title} onChange={(event) => setNoteDraft((current) => ({ ...current, title: event.target.value }))} /><Textarea className="min-h-28" placeholder="What should the future version of you remember here?" value={noteDraft.body} onChange={(event) => setNoteDraft((current) => ({ ...current, body: event.target.value }))} /><Button onClick={() => { if (!noteDraft.title.trim() || !noteDraft.body.trim()) return; store.addNote(noteDraft); setNoteDraft({ category: "general", title: "", body: "" }); }}>Save note</Button></CardContent></Card><Card><CardHeader><CardDescription>Pinned intelligence</CardDescription><CardTitle className="text-[2rem]">The notes worth surfacing even when you are moving fast.</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{pinnedNotes.slice(0, 4).map((note) => <div key={note.id} className="rounded-[1.4rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_74%,white)]/52 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">{statusLabel(note.category)}</p><p className="mt-2 font-medium text-foreground">{note.title}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{note.body}</p></div>)}</CardContent></Card></div>
      <div className="grid gap-6 xl:grid-cols-3">{Object.entries(notesByCategory).map(([category, items]) => <Card key={category}><CardHeader><CardDescription>{statusLabel(category)}</CardDescription><CardTitle className="text-[1.7rem]">{items.length} notes</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((note) => <NoteSheet key={note.id} note={note} editing={editingNoteId === note.id} onToggleEdit={() => setEditingNoteId((current) => current === note.id ? null : note.id)} />)}</CardContent></Card>)}</div>
    </div>
  );

  const mainView = { today: renderToday(), journey: renderJourney(), route: renderRoute(), stays: renderStays(), prep: renderPrep(), notes: renderNotes() }[store.activeView];

  return (
    <div className="min-h-screen pb-24 text-foreground xl:pb-10">
      <div className="mx-auto max-w-[1720px] px-4 py-5 lg:px-7 xl:px-8">
        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)_320px]">
          <aside className="hidden xl:block"><div className="sticky top-5 space-y-4"><Card className="bg-[linear-gradient(180deg,rgba(255,251,244,0.95),rgba(255,255,255,0.88))]"><CardHeader><CardDescription className="uppercase tracking-[0.22em]">Grand tour desk</CardDescription><CardTitle data-display="true" className="text-[2.1rem] leading-[0.92]">Road Trip Operating System</CardTitle><CardDescription className="max-w-sm leading-7">{TRIP_SEED.routeSummary}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-[1.6rem] border border-black/6 bg-white/64 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Route</p><p className="mt-2 text-sm font-medium text-foreground">{TRIP_SEED.subtitle}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{TRIP_SEED.travelWindow} • {TRIP_SEED.travelers}</p><p className="text-sm text-muted-foreground">{TRIP_SEED.carLabel}</p></div><div className="space-y-2">{NAV_ITEMS.map((item) => <DesktopNavButton key={item.view} item={item} active={store.activeView === item.view} onClick={() => store.setActiveView(item.view)} />)}</div></CardContent></Card><Card><CardHeader><CardDescription>Route variants</CardDescription><CardTitle className="text-[1.5rem]">Lock the travel tone deliberately.</CardTitle></CardHeader><CardContent className="space-y-3">{(["bohinj", "bled"] as const).map((variant) => <button key={variant} type="button" onClick={() => store.setRouteVariant(variant)} className={cn("w-full rounded-[1.4rem] border px-4 py-4 text-left transition", store.routeVariant === variant ? "border-black/10 bg-white/88" : "border-black/6 bg-white/52 hover:bg-white/78")}><p className="font-medium text-foreground">{TRIP_SEED.routeVariants[variant].label}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{TRIP_SEED.routeVariants[variant].summary}</p></button>)}<Button variant="outline" className="w-full" onClick={store.resetTrip}>Reset trip to seed</Button></CardContent></Card></div></aside>
          <main className="space-y-6"><Card className="bg-[linear-gradient(180deg,rgba(255,254,250,0.96),rgba(255,255,255,0.92))] animate-in fade-in slide-in-from-bottom-3 duration-500"><CardContent className="grid gap-5 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr] xl:px-7"><div className="space-y-3"><p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Desktop release</p><h1 data-display="true" className="text-[clamp(2.4rem,4vw,4.6rem)] leading-[0.92] text-foreground">A more natural, coherent travel companion for the Luxembourg to Sofia drive.</h1><p className="max-w-3xl text-[1rem] leading-8 text-muted-foreground">The product now treats the route like a designed journey: fewer dashboard habits, more chapter logic, stronger continuity, and a quieter operational layer underneath.</p></div><div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1"><div className="rounded-[1.6rem] border border-black/6 bg-white/70 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Current view</p><p className="mt-2 text-lg font-medium text-foreground">{NAV_ITEMS.find((item) => item.view === store.activeView)?.label}</p></div><div className="rounded-[1.6rem] border border-black/6 bg-white/70 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Selected route</p><p className="mt-2 text-lg font-medium text-foreground">{TRIP_SEED.routeVariants[store.routeVariant].shortLabel}</p></div><div className="rounded-[1.6rem] border border-black/6 bg-white/70 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Overall readiness</p><p className="mt-2 text-lg font-medium text-foreground">{readinessAverage}%</p></div></div></CardContent></Card>{mainView}</main>
          <aside className="hidden xl:block"><div className="sticky top-5 space-y-4"><Card><CardHeader><CardDescription>Continuity ledger</CardDescription><CardTitle className="text-[1.5rem]">Stay oriented even when the trip changes shape.</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><div className="rounded-[1.4rem] border border-black/6 bg-[color-mix(in_oklch,var(--secondary)_72%,white)]/56 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em]">Selected chapter</p><p className="mt-2 font-medium text-foreground">{selectedDay.routeLabel}</p><p className="mt-2 leading-6">{selectedDay.theme}</p></div><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em]">Execution anchor</p><p className="mt-2 font-medium text-foreground">{currentDay.routeLabel}</p><p className="mt-2 leading-6">{formatDriveHours(currentDay.driveHours)} • {formatDistance(currentDay.driveDistanceKm)}</p></div><div className="rounded-[1.4rem] border border-black/6 bg-white/66 p-4"><p className="text-[0.68rem] uppercase tracking-[0.22em]">Selected scenic logic</p><p className="mt-2 font-medium text-foreground">{TRIP_SEED.routeVariants[store.routeVariant].label}</p><p className="mt-2 leading-6">{TRIP_SEED.routeVariants[store.routeVariant].tradeoff}</p></div></CardContent></Card><Card><CardHeader><CardDescription>Next actions</CardDescription><CardTitle className="text-[1.5rem]">The work that still matters.</CardTitle></CardHeader><CardContent className="space-y-3">{nextActions.map((action) => <div key={action.id} className={cn("rounded-[1.2rem] border px-4 py-4 text-sm", toneClass(action.tone))}><p className="font-medium">{action.title}</p><p className="mt-2 text-xs leading-6">{action.detail}</p></div>)}</CardContent></Card><Card><CardHeader><CardDescription>Trust layer</CardDescription><CardTitle className="text-[1.5rem]">Why the route already feels more grounded.</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-7 text-muted-foreground"><div className="flex items-start gap-3 rounded-[1.2rem] border border-black/6 bg-white/66 p-4"><CheckCircle2 className="mt-0.5 size-4 text-emerald-800" /><p>The trip is seeded from one coherent source of truth, so the product now reads as a designed route rather than a stitched set of notes.</p></div><div className="flex items-start gap-3 rounded-[1.2rem] border border-black/6 bg-white/66 p-4"><Sparkles className="mt-0.5 size-4 text-[color-mix(in_oklch,var(--accent)_80%,black)]" /><p>Desktop emphasis now follows the trip phase: current day, tomorrow, stays, and prep work each have their own place and weight.</p></div><div className="flex items-start gap-3 rounded-[1.2rem] border border-black/6 bg-white/66 p-4"><AlertTriangle className="mt-0.5 size-4 text-orange-800" /><p>{unresolvedRisks.length} unresolved risks remain, which is why the desk still foregrounds parking, booking, and border details instead of pretending everything is already solved.</p></div></CardContent></Card></div></aside>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/8 bg-white/90 px-3 py-2 backdrop-blur xl:hidden"><div className="flex gap-2 overflow-x-auto pb-1">{NAV_ITEMS.map((item) => <button key={item.view} type="button" onClick={() => store.setActiveView(item.view)} className={cn("flex min-w-[88px] shrink-0 flex-col items-center gap-1 rounded-[1.2rem] px-3 py-2 text-[11px]", store.activeView === item.view ? "bg-[color-mix(in_oklch,var(--secondary)_72%,white)] text-foreground" : "text-muted-foreground")}><item.icon className="size-4" />{item.label}</button>)}</div></div>
    </div>
  );
}

