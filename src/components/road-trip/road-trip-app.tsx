"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ArrowRight, CarFront, ChevronDown, ChevronUp, CircleAlert, Flag, Hotel, MapPinned, Route, ShieldAlert, ShieldCheck, StickyNote, Wallet } from "lucide-react";

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

const RouteMap = dynamic(() => import("@/components/road-trip/route-map").then((mod) => mod.RouteMap), { ssr: false, loading: () => <div className="h-[420px] rounded-[1.75rem] bg-muted/60" /> });

const NAV_ITEMS: { view: AppView; label: string; icon: typeof Route }[] = [
  { view: "overview", label: "Overview", icon: Route },
  { view: "itinerary", label: "Itinerary", icon: MapPinned },
  { view: "compliance", label: "Compliance", icon: ShieldAlert },
  { view: "map", label: "Route / Map", icon: Flag },
  { view: "bookings", label: "Bookings", icon: Hotel },
  { view: "budget", label: "Budget", icon: Wallet },
  { view: "readiness", label: "Readiness", icon: CarFront },
  { view: "notes", label: "Notes", icon: StickyNote },
];

const NOTE_CATEGORIES: NoteCategory[] = ["food", "swim-hike", "detour", "parking", "later", "general"];

function toneClass(tone: string) {
  if (tone === "success") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-800";
  if (tone === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-800";
  if (tone === "danger") return "border-orange-700/20 bg-orange-700/10 text-orange-800";
  return "border-slate-500/20 bg-slate-500/10 text-slate-700";
}

function statusLabel(value: string) {
  return value.replace("-", " ");
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="bg-white/85 ring-black/6">
      <CardHeader className="pb-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <Badge className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", toneClass(tone))}>{label}</Badge>;
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[oklch(0.24_0.02_255)]">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function DayCard({ day, expanded, isSelected, isExecution, onToggle, onSelect }: { day: TripDay; expanded: boolean; isSelected: boolean; isExecution: boolean; onToggle: () => void; onSelect: () => void }) {
  const { toggleChecklistItem, updateDayText, toggleRiskResolved, setExecutionDayId } = useTripStore();
  const stop = STOP_LOOKUP[day.overnightStopId];
  const completion = getDayCompletion(day);
  return (
    <Card className={cn("overflow-visible border border-transparent bg-white/88 shadow-sm ring-black/6 transition hover:-translate-y-0.5", isSelected && "border-[oklch(0.46_0.12_230/0.22)] ring-[oklch(0.46_0.12_230/0.18)]")}>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <span>Day {day.dayNumber}</span><span>{day.dateLabel}</span><StatusPill label={stop.markerLabel} tone={stop.kind === "city" ? "muted" : stop.kind === "scenic" ? "success" : "warning"} />{isExecution ? <StatusPill label="Current day" tone="danger" /> : null}
            </div>
            <CardTitle className="text-xl text-[oklch(0.24_0.02_255)]">{day.routeLabel}</CardTitle>
            <CardDescription className="max-w-3xl text-sm">{day.theme}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2"><StatusPill label={`${completion}% planned`} tone={completion > 74 ? "success" : completion > 44 ? "warning" : "danger"} /><Button variant="outline" size="sm" onClick={onSelect}>Focus day</Button><Button variant="ghost" size="sm" onClick={onToggle}>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-[oklch(0.98_0.01_85)] p-3"><p className="text-xs text-muted-foreground">Drive</p><p className="mt-1 font-medium">{formatDriveHours(day.driveHours)}</p><p className="text-xs text-muted-foreground">{formatDistance(day.driveDistanceKm)}</p></div>
          <div className="rounded-2xl bg-[oklch(0.98_0.01_85)] p-3"><p className="text-xs text-muted-foreground">Sleep</p><p className="mt-1 font-medium">{day.overnightLabel}</p><p className="text-xs text-muted-foreground">{day.accommodationName}</p></div>
          <div className="rounded-2xl bg-[oklch(0.98_0.01_85)] p-3"><p className="text-xs text-muted-foreground">Parking</p><p className="mt-1 text-sm font-medium">{day.parkingStrategy}</p></div>
          <div className="rounded-2xl bg-[oklch(0.98_0.01_85)] p-3"><p className="text-xs text-muted-foreground">Tolls / legal next</p><p className="mt-1 text-sm font-medium">{day.tolls.join(" • ")}</p></div>
        </div>
        <Progress value={completion} className="h-2" />
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Highlights</p><div className="flex flex-wrap gap-2">{day.highlights.map((item) => <Badge key={item} variant="secondary" className="rounded-full">{item}</Badge>)}</div></div>
            <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Checklist</p><div className="space-y-2">{day.checklist.map((item) => <label key={item.id} className="flex items-center gap-3 rounded-2xl border border-black/6 bg-[oklch(0.99_0.003_90)] px-3 py-2"><Checkbox checked={item.done} onCheckedChange={() => toggleChecklistItem(day.id, item.id)} /><span className={cn("text-sm", item.done && "text-muted-foreground line-through")}>{item.label}</span></label>)}</div></div>
          </div>
          <div className="space-y-3">
            <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Risks</p><div className="space-y-2">{day.risks.map((risk) => <button key={risk.id} type="button" onClick={() => toggleRiskResolved(day.id, risk.id)} className={cn("w-full rounded-2xl border px-3 py-2 text-left text-sm", toneClass(statusToneFromRisk(risk.severity)), risk.resolved && "opacity-55")}>{risk.label}<span className="mt-1 block text-xs">{risk.detail}</span></button>)}</div></div>
            <div className="rounded-2xl border border-black/6 bg-[oklch(0.99_0.003_90)] p-3"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Execution mode</p><p className="mt-1 text-sm text-muted-foreground">Use this day as the current context for the Tomorrow panel.</p><Button variant={isExecution ? "secondary" : "outline"} size="sm" className="mt-3" onClick={() => setExecutionDayId(day.id)}>{isExecution ? "Current day in use" : "Use as current day"}</Button></div>
          </div>
        </div>
        {expanded ? <div className="grid gap-4 border-t border-dashed border-black/8 pt-4 lg:grid-cols-2"><div className="space-y-3"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Route notes</p><p className="text-sm text-muted-foreground">{day.routeNotes}</p></div><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Accommodation details</p><Input value={day.accommodationName} onChange={(event) => updateDayText(day.id, "accommodationName", event.target.value)} /><Textarea className="mt-2 min-h-24" value={day.accommodationDetails} onChange={(event) => updateDayText(day.id, "accommodationDetails", event.target.value)} /></div></div><div className="space-y-3"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Parking details</p><Textarea className="min-h-24" value={day.parkingDetails} onChange={(event) => updateDayText(day.id, "parkingDetails", event.target.value)} /></div><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Planner notes</p><Textarea className="min-h-32" value={day.notes} onChange={(event) => updateDayText(day.id, "notes", event.target.value)} /></div></div></div> : null}
      </CardContent>
    </Card>
  );
}

export function RoadTripApp() {
  const store = useTripStore();
  const [bookingFilter, setBookingFilter] = useState<"all" | "open" | "booked" | "parking">("all");
  const [noteDraft, setNoteDraft] = useState({ category: "general" as NoteCategory, title: "", body: "" });
  const visibleBookings = useMemo(() => getVisibleBookings(store.bookings, store.routeVariant), [store.bookings, store.routeVariant]);
  const visibleCountries = useMemo(() => getVisibleComplianceCountries(store.complianceCountries, store.routeVariant), [store.complianceCountries, store.routeVariant]);
  const visibleBudget = useMemo(() => getVisibleBudgetItems(store.budgetItems, store.routeVariant), [store.budgetItems, store.routeVariant]);
  const visibleStops = useMemo(() => getVisibleStops(store.routeVariant), [store.routeVariant]);
  const selectedDay = getSelectedDay(store.days, store.selectedDayId);
  const selectedViaStops = (selectedDay.viaStopIds ?? []).map((stopId) => STOP_LOOKUP[stopId]);
  const tomorrow = getTomorrowDay(store.days, store.executionDayId);
  const totalHours = getTotalDriveHours(store.days);
  const movingDays = getMovingDays(store.days);
  const totalDistance = getTotalDriveDistance(store.days);
  const budgetSummary = getBudgetSummary(visibleBudget);
  const bookingCompletion = getBookingCompletion(visibleBookings);
  const complianceCompletion = getComplianceCompletion(visibleCountries);
  const vehicleCompletion = getVehicleCompletion(store.vehicleChecks);
  const nextActions = getNextActions(store);
  const unresolvedRisks = getRiskSummary(store.days);
  const variantComparison = getVariantComparison(store.routeVariant);
  const budgetBreakdown = getBudgetBreakdown(visibleBudget);
  const groupedVehicleChecks = groupVehicleChecks(store.vehicleChecks);
  const notesByCategory = groupNotesByCategory(store.notes);
  const filteredBookings = visibleBookings.filter((booking) => bookingFilter === "open" ? booking.status !== "booked" : bookingFilter === "booked" ? booking.status === "booked" : bookingFilter === "parking" ? !booking.parkingIncluded : true);

  const renderOverview = () => (
    <div className="space-y-6">
      <SectionHeader title="Command center" description="Immediate visibility into the trip's next decisions, tomorrow's shape, and what could still produce friction or fines." />
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricTile label="Trip days" value={`${store.days.length}`} hint={`${getUniqueStopCount(store.routeVariant)} route stops in current route`} /><MetricTile label="Total drive time" value={formatDriveHours(totalHours)} hint={`${formatDistance(totalDistance)} across the route`} /><MetricTile label="Avg moving day" value={formatDriveHours(totalHours / Math.max(movingDays.length, 1))} hint={`${movingDays.length} meaningful driving days`} /><MetricTile label="Budget planned" value={formatCurrency(budgetSummary.planned)} hint={`${formatCurrency(budgetSummary.actual)} tracked so far`} /></div><Card className="bg-[linear-gradient(135deg,oklch(0.98_0.006_90),oklch(0.94_0.02_225/0.55))] ring-[oklch(0.46_0.12_230/0.1)]"><CardHeader><CardDescription>Tomorrow</CardDescription><CardTitle className="text-2xl">{tomorrow.routeLabel}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>{tomorrow.theme}</p><div className="flex flex-wrap gap-2"><StatusPill label={formatDriveHours(tomorrow.driveHours)} tone="muted" /><StatusPill label={formatDistance(tomorrow.driveDistanceKm)} tone="muted" /><StatusPill label={tomorrow.overnightLabel} tone="success" /></div><p className="text-sm text-[oklch(0.24_0.02_255)]">{tomorrow.parkingStrategy}</p></CardContent></Card></div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><Card className="bg-white/88 ring-black/6"><CardHeader><CardDescription>Readiness snapshot</CardDescription><CardTitle className="text-xl">What is solved vs still exposed</CardTitle></CardHeader><CardContent className="space-y-4">{[{ label: "Bookings", value: bookingCompletion }, { label: "Compliance", value: complianceCompletion }, { label: "Vehicle", value: vehicleCompletion }].map((item) => <div key={item.label} className="space-y-2"><div className="flex items-center justify-between text-sm"><span>{item.label}</span><span className="font-medium">{item.value}%</span></div><Progress value={item.value} className="h-2" /></div>)}<div className="rounded-2xl bg-[oklch(0.98_0.01_85)] p-4 text-sm text-muted-foreground"><p className="font-medium text-[oklch(0.24_0.02_255)]">Current route: {TRIP_SEED.routeVariants[store.routeVariant].label}</p><p className="mt-1">{TRIP_SEED.routeVariants[store.routeVariant].impactSummary}</p></div></CardContent></Card><Card className="bg-white/88 ring-black/6"><CardHeader><CardDescription>Route timeline</CardDescription><CardTitle className="text-xl">Curated flow of the trip</CardTitle></CardHeader><CardContent><ol className="space-y-3">{store.days.map((day) => <li key={day.id} className="flex items-start gap-3"><div className="mt-1 size-2.5 rounded-full bg-[oklch(0.46_0.12_230)]" /><div><p className="text-sm font-medium text-[oklch(0.24_0.02_255)]">Day {day.dayNumber}: {day.routeLabel}</p><p className="text-xs text-muted-foreground">{day.dateLabel} • {formatDriveHours(day.driveHours)} • {day.overnightLabel}</p></div></li>)}</ol></CardContent></Card></div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"><Card className="bg-white/88 ring-black/6"><CardHeader><CardDescription>Next critical actions</CardDescription><CardTitle className="text-xl">Close these before the route starts breathing easier</CardTitle></CardHeader><CardContent className="space-y-2">{nextActions.map((action) => <div key={action.id} className={cn("rounded-2xl border px-3 py-3 text-sm", toneClass(action.tone))}><p className="font-medium">{action.title}</p><p className="mt-1 text-xs">{action.detail}</p></div>)}</CardContent></Card><Card className="bg-white/88 ring-black/6"><CardHeader><CardDescription>Unresolved risks</CardDescription><CardTitle className="text-xl">Things that could still produce friction or fines</CardTitle></CardHeader><CardContent className="space-y-2">{unresolvedRisks.slice(0, 6).map((risk) => <div key={risk.id} className={cn("rounded-2xl border px-3 py-3 text-sm", toneClass(statusToneFromRisk(risk.severity)))}><p className="font-medium">Day {risk.dayNumber}: {risk.title}</p><p className="mt-1 text-xs">{risk.detail}</p></div>)}</CardContent></Card></div>
    </div>
  );

  const renderItinerary = () => (
    <div className="space-y-5">
      <SectionHeader title="Daily planner" description="This is the operational spine of the trip: where you sleep, how hard tomorrow is, what legal prep is next, and where the friction still sits." action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={store.expandAllDays}>Expand all</Button><Button variant="outline" size="sm" onClick={store.collapseAllDays}>Collapse all</Button></div>} />
      <Card className="bg-[linear-gradient(135deg,oklch(0.985_0.004_95),oklch(0.94_0.02_145/0.45))] ring-black/6"><CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Route comparison</p><p className="mt-1 font-medium text-[oklch(0.24_0.02_255)]">Comparing against {variantComparison.alternative.label} shifts the Slovenia chapter and changes the route by {formatDriveHours(Math.abs(variantComparison.driveDeltaHours))} and {Math.abs(variantComparison.distanceDeltaKm)} km.</p></div><p className="max-w-lg text-sm text-muted-foreground">{variantComparison.alternative.impactSummary}</p></CardContent></Card>
      <div className="space-y-4">{store.days.map((day) => <DayCard key={day.id} day={day} expanded={store.expandedDayIds.includes(day.id)} isSelected={store.selectedDayId === day.id} isExecution={store.executionDayId === day.id} onToggle={() => store.toggleExpandedDay(day.id)} onSelect={() => { store.setSelectedDayId(day.id); store.setActiveView("itinerary"); }} />)}</div>
    </div>
  );

  const renderMap = () => (
    <div className="space-y-5">
      <SectionHeader title="Route and spatial context" description="Use the map to follow the revised corridor, inspect transfer days, and see where city-risk logic changes across borders." />
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card className="bg-white/88 ring-black/6"><CardHeader><CardDescription>Selected leg</CardDescription><CardTitle className="text-xl">{selectedDay.routeLabel}</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><p>{selectedDay.routeNotes}</p><div className="flex flex-wrap gap-2"><StatusPill label={formatDriveHours(selectedDay.driveHours)} tone="muted" /><StatusPill label={formatDistance(selectedDay.driveDistanceKm)} tone="muted" /><StatusPill label={selectedDay.overnightLabel} tone="success" />{selectedViaStops.map((stop) => <StatusPill key={stop.id} label={`Via ${stop.name}`} tone="warning" />)}</div><div className="rounded-2xl border border-black/6 bg-[oklch(0.99_0.003_90)] p-3"><p className="font-medium text-[oklch(0.24_0.02_255)]">{STOP_LOOKUP[selectedDay.endStopId].name}</p><p className="mt-1">{STOP_LOOKUP[selectedDay.endStopId].summary}</p><p className="mt-2 text-xs">{STOP_LOOKUP[selectedDay.endStopId].parkingBias}</p></div><Separator /><div className="space-y-2">{store.days.map((day) => <button key={day.id} type="button" onClick={() => store.setSelectedDayId(day.id)} className={cn("flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm", store.selectedDayId === day.id ? "border-[oklch(0.46_0.12_230/0.22)] bg-[oklch(0.46_0.12_230/0.08)]" : "border-black/6 bg-[oklch(0.99_0.003_90)]")}><span>Day {day.dayNumber}: {day.routeLabel}</span><ArrowRight className="size-4" /></button>)}</div></CardContent></Card>
        <RouteMap stops={visibleStops} days={store.days} selectedDayId={store.selectedDayId} onSelectDay={store.setSelectedDayId} />
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-5">
      <SectionHeader title="Compliance and fine avoidance" description="Practical guidance by country and stop. The goal is a calm trip, not legal surprises." />
      <div className="grid gap-4 md:grid-cols-3">{[{ label: "Compliance readiness", value: `${complianceCompletion}%`, icon: ShieldCheck }, { label: "Open legal actions", value: `${visibleCountries.flatMap((country) => country.items).filter((item) => item.status === "needs-action").length}`, icon: CircleAlert }, { label: "City fine focus", value: "Munich / Belgrade / Sofia", icon: ShieldAlert }].map((metric) => <Card key={metric.label} className="bg-white/88 ring-black/6"><CardContent className="flex items-center gap-3 py-4"><metric.icon className="size-5 text-[oklch(0.46_0.12_230)]" /><div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p><p className="text-xl font-semibold">{metric.value}</p></div></CardContent></Card>)}</div>
      <div className="space-y-4">{visibleCountries.map((country) => <Card key={country.id} className="bg-white/88 ring-black/6"><CardHeader><CardDescription>{country.country}</CardDescription><CardTitle className="text-xl">{country.summary}</CardTitle></CardHeader><CardContent className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]"><div className="space-y-3">{country.items.map((item) => <div key={item.id} className="rounded-2xl border border-black/6 bg-[oklch(0.99_0.003_90)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-[oklch(0.24_0.02_255)]">{item.label}</p><select className={cn("rounded-xl border px-2 py-1 text-sm", toneClass(statusToneFromCompliance(item.status)))} value={item.status} onChange={(event) => store.updateComplianceItemStatus(country.id, item.id, event.target.value as typeof item.status)}><option value="needs-action">Needs action</option><option value="watch">Watch</option><option value="ready">Ready</option></select></div><p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>{item.dueBy ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">Due: {item.dueBy}</p> : null}</div>)}</div><div className="space-y-3 rounded-[1.5rem] border border-black/6 bg-[oklch(0.985_0.004_95)] p-4 text-sm text-muted-foreground"><div><p className="text-xs uppercase tracking-[0.18em]">Parking strategy</p><p className="mt-1">{country.parkingStrategy}</p></div><div><p className="text-xs uppercase tracking-[0.18em]">Documents</p><p className="mt-1">{country.documents.join(" • ")}</p></div><div><p className="text-xs uppercase tracking-[0.18em]">Common mistakes</p><p className="mt-1">{country.commonMistakes.join(" • ")}</p></div><div><p className="text-xs uppercase tracking-[0.18em]">Border note</p><p className="mt-1">{country.borderNotes}</p></div></div></CardContent></Card>)}</div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-5">
      <SectionHeader title="Bookings workspace" description="Track what is booked, what still needs attention, and where parking or cancellation terms could still hurt you." action={<div className="flex gap-2">{(["all", "open", "booked", "parking"] as const).map((filter) => <Button key={filter} variant={bookingFilter === filter ? "secondary" : "outline"} size="sm" onClick={() => setBookingFilter(filter)}>{filter === "all" ? "All" : filter === "open" ? "Needs attention" : filter === "booked" ? "Booked" : "No parking"}</Button>)}</div>} />
      <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/6 bg-white/88 lg:block"><table className="w-full text-left text-sm"><thead className="bg-[oklch(0.985_0.004_95)] text-muted-foreground"><tr>{["Stop", "Dates", "Property", "Status", "Parking", "Check-in", "Confirmation"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{filteredBookings.map((booking) => <tr key={booking.id} className="border-t border-black/6 align-top"><td className="px-4 py-4"><p className="font-medium text-[oklch(0.24_0.02_255)]">{booking.city}</p><p className="mt-1 text-xs text-muted-foreground">{booking.notes}</p></td><td className="px-4 py-4 text-muted-foreground">{booking.dateLabel}</td><td className="px-4 py-4"><Input value={booking.propertyName} onChange={(event) => store.updateBooking(booking.id, "propertyName", event.target.value)} /></td><td className="px-4 py-4"><select className={cn("rounded-xl border px-2 py-1 text-sm", toneClass(statusToneFromBooking(booking.status)))} value={booking.status} onChange={(event) => store.updateBooking(booking.id, "status", event.target.value)}><option value="missing">Missing</option><option value="researching">Researching</option><option value="shortlist">Shortlist</option><option value="booked">Booked</option></select></td><td className="px-4 py-4"><label className="flex items-center gap-2"><Checkbox checked={booking.parkingIncluded} onCheckedChange={(checked) => store.updateBooking(booking.id, "parkingIncluded", Boolean(checked))} /><span>{booking.parkingIncluded ? "Included" : "Not included"}</span></label></td><td className="px-4 py-4"><Input value={booking.checkInWindow} onChange={(event) => store.updateBooking(booking.id, "checkInWindow", event.target.value)} /></td><td className="px-4 py-4"><Input value={booking.confirmationCode} onChange={(event) => store.updateBooking(booking.id, "confirmationCode", event.target.value)} placeholder="Placeholder" /></td></tr>)}</tbody></table></div>
      <div className="space-y-3 lg:hidden">{filteredBookings.map((booking) => <Card key={booking.id} className="bg-white/88 ring-black/6"><CardHeader><CardDescription>{booking.dateLabel}</CardDescription><CardTitle className="text-lg">{booking.city}</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={booking.propertyName} onChange={(event) => store.updateBooking(booking.id, "propertyName", event.target.value)} /><div className="grid gap-3 sm:grid-cols-2"><select className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" value={booking.status} onChange={(event) => store.updateBooking(booking.id, "status", event.target.value)}><option value="missing">Missing</option><option value="researching">Researching</option><option value="shortlist">Shortlist</option><option value="booked">Booked</option></select><Input value={booking.checkInWindow} onChange={(event) => store.updateBooking(booking.id, "checkInWindow", event.target.value)} /></div><label className="flex items-center gap-2"><Checkbox checked={booking.parkingIncluded} onCheckedChange={(checked) => store.updateBooking(booking.id, "parkingIncluded", Boolean(checked))} /><span className="text-sm">Parking included</span></label><Textarea className="min-h-24" value={booking.notes} onChange={(event) => store.updateBooking(booking.id, "notes", event.target.value)} /></CardContent></Card>)}</div>
    </div>
  );

  const renderBudget = () => (
    <div className="space-y-5">
      <SectionHeader title="Budget and burn" description="Simple editable planning vs actual tracking, with no decorative charts hiding the useful numbers." />
      <div className="grid gap-4 md:grid-cols-3"><MetricTile label="Planned" value={formatCurrency(budgetSummary.planned)} hint="Current selected route total" /><MetricTile label="Actual / committed" value={formatCurrency(budgetSummary.actual)} hint="Deposits, parking, and early spend" /><MetricTile label="Remaining" value={formatCurrency(budgetSummary.remaining)} hint="Useful trip buffer still available" /></div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><div className="space-y-3">{visibleBudget.map((item) => <Card key={item.id} size="sm" className="bg-white/88 ring-black/6"><CardContent className="grid gap-3 py-3 md:grid-cols-[1fr_120px_120px]"><div><p className="font-medium text-[oklch(0.24_0.02_255)]">{item.label}</p><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.category}</p></div><Input type="number" value={String(item.planned)} onChange={(event) => store.updateBudgetItem(item.id, "planned", Number(event.target.value))} /><Input type="number" value={String(item.actual)} onChange={(event) => store.updateBudgetItem(item.id, "actual", Number(event.target.value))} /></CardContent></Card>)}</div><Card className="bg-white/88 ring-black/6"><CardHeader><CardDescription>Category roll-up</CardDescription><CardTitle className="text-xl">Planned vs actual by budget area</CardTitle></CardHeader><CardContent className="space-y-3">{Array.from(budgetBreakdown.entries()).map(([category, values]) => <div key={category} className="rounded-2xl border border-black/6 bg-[oklch(0.99_0.003_90)] p-3"><div className="flex items-center justify-between"><p className="font-medium capitalize text-[oklch(0.24_0.02_255)]">{category}</p><p className="text-xs text-muted-foreground">{formatCurrency(values.actual)} / {formatCurrency(values.planned)}</p></div><Progress value={values.planned ? Math.min((values.actual / values.planned) * 100, 100) : 0} className="mt-2 h-2" /></div>)}</CardContent></Card></div>
    </div>
  );

  const renderReadiness = () => (
    <div className="space-y-5">
      <SectionHeader title="Vehicle, packing, and readiness" description="A real pre-departure checklist for a summer cross-border drive, not just decorative status chips." />
      <div className="grid gap-4 xl:grid-cols-2">{Object.entries(groupedVehicleChecks).map(([group, items]) => <Card key={group} className="bg-white/88 ring-black/6"><CardHeader><CardDescription>{group}</CardDescription><CardTitle className="text-xl capitalize">{group} readiness</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-black/6 bg-[oklch(0.99_0.003_90)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-[oklch(0.24_0.02_255)]">{item.label}</p><select className={cn("rounded-xl border px-2 py-1 text-sm", toneClass(statusToneFromVehicle(item.status)))} value={item.status} onChange={(event) => store.updateVehicleCheck(item.id, event.target.value as typeof item.status)}><option value="todo">Todo</option><option value="watch">Watch</option><option value="done">Done</option></select></div><Textarea className="mt-2 min-h-20" value={item.note} onChange={(event) => store.updateVehicleCheck(item.id, item.status, event.target.value)} /></div>)}</CardContent></Card>)}</div>
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-5">
      <SectionHeader title="Notes and idea space" description="Capture restaurant ideas, swim spots, detours, parking intel, and later-to-book reminders without losing them in chat or tabs." />
      <Card className="bg-white/88 ring-black/6"><CardHeader><CardDescription>Add a note</CardDescription><CardTitle className="text-xl">Quick capture</CardTitle></CardHeader><CardContent className="grid gap-3 lg:grid-cols-[180px_1fr_1fr_auto]"><select className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" value={noteDraft.category} onChange={(event) => setNoteDraft((current) => ({ ...current, category: event.target.value as NoteCategory }))}>{NOTE_CATEGORIES.map((category) => <option key={category} value={category}>{statusLabel(category)}</option>)}</select><Input placeholder="Title" value={noteDraft.title} onChange={(event) => setNoteDraft((current) => ({ ...current, title: event.target.value }))} /><Input placeholder="Short note" value={noteDraft.body} onChange={(event) => setNoteDraft((current) => ({ ...current, body: event.target.value }))} /><Button onClick={() => { if (!noteDraft.title.trim() || !noteDraft.body.trim()) return; store.addNote(noteDraft); setNoteDraft({ category: "general", title: "", body: "" }); }}>Add note</Button></CardContent></Card>
      <div className="grid gap-4 xl:grid-cols-3">{Object.entries(notesByCategory).map(([category, items]) => <Card key={category} className="bg-white/88 ring-black/6"><CardHeader><CardDescription>{statusLabel(category)}</CardDescription><CardTitle className="text-xl">{items.length} notes</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((note) => <div key={note.id} className="rounded-2xl border border-black/6 bg-[oklch(0.99_0.003_90)] p-3"><div className="flex items-center justify-between gap-2"><Input value={note.title} onChange={(event) => store.updateNote(note.id, "title", event.target.value)} /><label className="flex items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={note.pinned} onCheckedChange={(checked) => store.updateNote(note.id, "pinned", Boolean(checked))} /><span>Pinned</span></label></div><Textarea className="mt-2 min-h-24" value={note.body} onChange={(event) => store.updateNote(note.id, "body", event.target.value)} /></div>)}</CardContent></Card>)}</div>
    </div>
  );

  const mainView = { overview: renderOverview(), itinerary: renderItinerary(), map: renderMap(), compliance: renderCompliance(), bookings: renderBookings(), budget: renderBudget(), readiness: renderReadiness(), notes: renderNotes() }[store.activeView];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.985_0.02_95),transparent_34%),linear-gradient(180deg,oklch(0.985_0.004_95),oklch(0.965_0.006_95))] pb-24 text-[oklch(0.24_0.02_255)]">
      <div className="mx-auto max-w-[1580px] px-4 py-4 lg:px-6"><div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_300px]"><aside className="hidden xl:block"><Card className="sticky top-4 bg-[oklch(0.975_0.006_90)] ring-black/6"><CardHeader><CardDescription className="uppercase tracking-[0.18em]">Road Trip OS</CardDescription><CardTitle className="text-2xl">{TRIP_SEED.subtitle}</CardTitle><CardDescription>{TRIP_SEED.routeSummary}</CardDescription></CardHeader><CardContent className="space-y-2">{NAV_ITEMS.map((item) => <button key={item.view} type="button" onClick={() => store.setActiveView(item.view)} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition", store.activeView === item.view ? "bg-[oklch(0.46_0.12_230/0.12)] text-[oklch(0.24_0.02_255)]" : "hover:bg-white")}><item.icon className="size-4" />{item.label}</button>)}</CardContent></Card></aside><main className="space-y-4"><Card className="bg-white/90 ring-black/6"><CardContent className="flex flex-col gap-4 py-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trip command center</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{TRIP_SEED.title}</h1><p className="mt-2 text-sm text-muted-foreground">{TRIP_SEED.travelWindow} • {TRIP_SEED.travelers} • {TRIP_SEED.carLabel}</p></div><div className="flex flex-wrap gap-2">{(["bohinj", "bled"] as const).map((variant) => <Button key={variant} variant={store.routeVariant === variant ? "secondary" : "outline"} onClick={() => store.setRouteVariant(variant)}>{TRIP_SEED.routeVariants[variant].label}</Button>)}<Button variant="outline" onClick={store.resetTrip}>Reset trip</Button></div></div><div className="grid gap-3 md:grid-cols-3"><div className="rounded-[1.5rem] bg-[oklch(0.985_0.004_95)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Bookings</p><p className="mt-1 text-2xl font-semibold">{bookingCompletion}%</p></div><div className="rounded-[1.5rem] bg-[oklch(0.985_0.004_95)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Compliance</p><p className="mt-1 text-2xl font-semibold">{complianceCompletion}%</p></div><div className="rounded-[1.5rem] bg-[oklch(0.985_0.004_95)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Vehicle</p><p className="mt-1 text-2xl font-semibold">{vehicleCompletion}%</p></div></div></CardContent></Card>{mainView}</main><aside className="hidden xl:block"><Card className="sticky top-4 bg-white/88 ring-black/6"><CardHeader><CardDescription>Next actions</CardDescription><CardTitle className="text-xl">Operational side rail</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-2xl bg-[oklch(0.985_0.004_95)] p-3"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Selected day</p><p className="mt-1 font-medium">{selectedDay.routeLabel}</p><p className="mt-1 text-xs text-muted-foreground">{selectedDay.theme}</p></div>{nextActions.map((action) => <div key={action.id} className={cn("rounded-2xl border px-3 py-3 text-sm", toneClass(action.tone))}><p className="font-medium">{action.title}</p><p className="mt-1 text-xs">{action.detail}</p></div>)}<Separator /><div className="rounded-2xl bg-[oklch(0.985_0.004_95)] p-3"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tomorrow</p><p className="mt-1 font-medium">{tomorrow.routeLabel}</p><p className="mt-1 text-xs text-muted-foreground">{formatDriveHours(tomorrow.driveHours)} • {formatDistance(tomorrow.driveDistanceKm)}</p><p className="mt-2 text-xs">{tomorrow.parkingStrategy}</p></div></CardContent></Card></aside></div></div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/8 bg-white/95 px-3 py-2 backdrop-blur xl:hidden"><div className="grid grid-cols-4 gap-2">{NAV_ITEMS.slice(0, 4).map((item) => <button key={item.view} type="button" onClick={() => store.setActiveView(item.view)} className={cn("flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px]", store.activeView === item.view ? "bg-[oklch(0.46_0.12_230/0.12)] text-[oklch(0.24_0.02_255)]" : "text-muted-foreground")}><item.icon className="size-4" />{item.label}</button>)}</div></div>
    </div>
  );
}




