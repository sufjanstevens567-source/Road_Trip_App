"use client";

import { useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import {
  formatCurrency,
  formatDate,
  getActiveTrip,
  getBudgetSummary,
  getTripBudgetLines,
  getTripStays,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SectionLead, StatusPill, bookingTone } from "@/components/shared/ui-helpers";
import type { BudgetCategory, BudgetLine, Stay } from "@/types/trip";

export function StaysBudgetView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const tripId = activeTrip?.id ?? "";

  const stays = getTripStays(state, tripId);
  const budgetLines = getTripBudgetLines(state, tripId);
  const summary = getBudgetSummary(stays, budgetLines);

  const updateStay = useTripStore((s) => s.updateStay);
  const removeStay = useTripStore((s) => s.removeStay);
  const addBudgetLine = useTripStore((s) => s.addBudgetLine);
  const updateBudgetLine = useTripStore((s) => s.updateBudgetLine);
  const removeBudgetLine = useTripStore((s) => s.removeBudgetLine);
  const bookedCount = stays.filter((stay) => stay.status === "booked").length;
  const researchingCount = stays.filter((stay) => stay.status !== "booked").length;
  const parkingIncludedCount = stays.filter((stay) => stay.parkingIncluded).length;

  if (!activeTrip) return null;

  const handleAddBudgetLine = (category: BudgetCategory) => {
    addBudgetLine({
      tripId: activeTrip.id,
      category,
      label: "",
      planned: 0,
      actual: 0,
    });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_22rem]">
      <div className="space-y-4">
        <SectionLead
          eyebrow="Accommodations"
          title="Stays"
          description={`${stays.length} stay${stays.length !== 1 ? "s" : ""} arranged as scan-first booking cards.`}
        />

        <Card className="border-slate-200 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryHero label="Booked" value={`${bookedCount}`} caption={`${stays.length} total stays`} />
            <SummaryHero label="Open" value={`${researchingCount}`} caption="still being researched" />
            <SummaryHero label="Parking" value={`${parkingIncludedCount}`} caption="already confirmed" />
          </div>
        </Card>

        <div className="space-y-4">
          {stays.length === 0 ? (
            <EmptyState
              title="No stays added yet"
              description="Once a stop becomes an overnight anchor, its stay card will show up here for quick scanning and editing."
            />
          ) : (
            stays.map((stay) => (
              <StayCard
                key={stay.id}
                stay={stay}
                currency={activeTrip.currency}
                onSave={(patch) => updateStay(stay.id, patch)}
                onRemove={() => removeStay(stay.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="sticky top-8 h-fit space-y-4">
        <SectionLead eyebrow="Costs" title="Budget" />

        <Card className="border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Accommodation</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Planned</p>
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {formatCurrency(summary.accommodation.planned, activeTrip.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Actual</p>
                <p className="text-[1.35rem] font-semibold text-slate-900">
                  {formatCurrency(summary.accommodation.actual, activeTrip.currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {Object.entries(summary.byCategory).map(([category, values]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{category}</p>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(values.planned, activeTrip.currency)}
                  </span>
                </div>

                {budgetLines
                  .filter((line) => line.category === category)
                  .map((line) => (
                    <BudgetLineRow
                      key={line.id}
                      line={line}
                      currency={activeTrip.currency}
                      onSave={(patch) => updateBudgetLine(line.id, patch)}
                      onDelete={() => removeBudgetLine(line.id)}
                    />
                  ))}

                <Button
                  variant="outline"
                  size="xs"
                  className="w-full"
                  onClick={() => handleAddBudgetLine(category as BudgetCategory)}
                >
                  <Plus className="mr-1 size-3" /> Add {category}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Total planned</span>
              <span className="text-2xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(summary.total.planned, activeTrip.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total actual</span>
              <span className="text-[1.1rem] font-semibold text-slate-900">
                {formatCurrency(summary.total.actual, activeTrip.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Remaining</span>
              <span className={`text-[1.35rem] font-semibold tracking-tight ${summary.total.remaining < 0 ? "text-rose-700" : "text-slate-900"}`}>
                {formatCurrency(summary.total.remaining, activeTrip.currency)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StayCard({
  stay,
  currency,
  onSave,
  onRemove,
}: {
  stay: Stay;
  currency: string;
  onSave: (patch: Partial<Stay>) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(stay);

  const saveDraft = () => {
    onSave({
      propertyName: draft.propertyName,
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      address: draft.address,
      bookingUrl: draft.bookingUrl,
      status: draft.status,
      confirmationCode: draft.confirmationCode,
      parkingIncluded: draft.parkingIncluded,
      parkingNotes: draft.parkingNotes,
      checkInWindow: draft.checkInWindow,
      cancellationPolicy: draft.cancellationPolicy,
      costPlanned: draft.costPlanned,
      costActual: draft.costActual,
      notes: draft.notes,
    });
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraft(stay);
    setIsEditing(false);
  };

  return (
    <Card className="interactive-lift border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-semibold tracking-tight text-slate-950">{stay.propertyName || "Unnamed stay"}</h3>
            <StatusPill label={presentStayStatus(stay.status)} tone={bookingTone(stay.status)} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{formatStayDates(stay.checkIn, stay.checkOut)}</p>
          {stay.address && <p className="mt-2 text-sm leading-relaxed text-slate-600">{stay.address}</p>}
        </div>

        <Button
          variant={isEditing ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            if (!isEditing) setDraft(stay);
            setIsEditing((current) => !current);
          }}
        >
          <Pencil className="mr-1.5 size-3.5" /> {isEditing ? "Editing" : "Edit"}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Planned cost" value={formatCurrency(stay.costPlanned, currency)} />
        <SummaryTile label="Parking" value={stay.parkingIncluded ? "Included" : "Check details"} tone={stay.parkingIncluded ? "success" : "warning"} />
        <SummaryTile label="Confirmation" value={stay.confirmationCode || "Missing"} tone={stay.confirmationCode ? "success" : "warning"} />
      </div>

      {stay.bookingUrl && !isEditing && (
        <div className="mt-4">
          <a
            href={stay.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            Open booking link
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}

      {isEditing && (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
          <div className="space-y-4">
            <GroupHeading title="Booking" />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Property name">
                <Input value={draft.propertyName} onChange={(e) => setDraft({ ...draft, propertyName: e.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as Stay["status"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="researching">Researching</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Check-in">
                <Input type="date" value={draft.checkIn} onChange={(e) => setDraft({ ...draft, checkIn: e.target.value })} />
              </Field>
              <Field label="Check-out">
                <Input type="date" value={draft.checkOut} onChange={(e) => setDraft({ ...draft, checkOut: e.target.value })} />
              </Field>
              <Field label="Planned cost">
                <Input type="number" value={draft.costPlanned} onChange={(e) => setDraft({ ...draft, costPlanned: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Actual cost">
                <Input type="number" value={draft.costActual} onChange={(e) => setDraft({ ...draft, costActual: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Confirmation code">
                <Input value={draft.confirmationCode} onChange={(e) => setDraft({ ...draft, confirmationCode: e.target.value })} />
              </Field>
              <Field label="Booking URL">
                <Input value={draft.bookingUrl} onChange={(e) => setDraft({ ...draft, bookingUrl: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4">
            <GroupHeading title="Logistics" />
            <Field label="Address">
              <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Check-in window">
                <Input value={draft.checkInWindow} onChange={(e) => setDraft({ ...draft, checkInWindow: e.target.value })} />
              </Field>
              <Field label="Cancellation policy">
                <Input value={draft.cancellationPolicy} onChange={(e) => setDraft({ ...draft, cancellationPolicy: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={draft.parkingIncluded}
                onChange={(e) => setDraft({ ...draft, parkingIncluded: e.target.checked })}
                className="rounded border-slate-300"
              />
              Parking included
            </label>
            <Field label="Parking notes">
              <Textarea value={draft.parkingNotes} onChange={(e) => setDraft({ ...draft, parkingNotes: e.target.value })} className="min-h-20" />
            </Field>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4">
            <GroupHeading title="Notes" />
            <Field label="General notes">
              <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="min-h-24" />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveDraft}>
              Save changes
            </Button>
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="ml-auto text-rose-700 hover:text-rose-800" onClick={onRemove}>
              <Trash2 className="mr-1.5 size-3.5" /> Remove stay
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function BudgetLineRow({
  line,
  currency,
  onSave,
  onDelete,
}: {
  line: BudgetLine;
  currency: string;
  onSave: (patch: Partial<BudgetLine>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(line.label);
  const [draftPlanned, setDraftPlanned] = useState(line.planned);

  if (isEditing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
        <div className="space-y-2">
          <Input value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} />
          <Input type="number" value={draftPlanned} onChange={(e) => setDraftPlanned(parseFloat(e.target.value) || 0)} />
          <div className="flex gap-2">
            <Button
              size="xs"
              onClick={() => {
                onSave({ label: draftLabel, planned: draftPlanned });
                setIsEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setDraftLabel(line.label);
                setDraftPlanned(line.planned);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraftLabel(line.label);
        setDraftPlanned(line.planned);
        setIsEditing(true);
      }}
      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm transition-colors hover:border-slate-300 hover:bg-white"
    >
      <span className="text-left text-slate-600">{line.label || "Unlabelled line"}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-900">{formatCurrency(line.planned, currency)}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3 text-rose-600" />
        </Button>
      </div>
    </button>
  );
}

function SummaryTile({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "muted";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={
            tone === "success" ? "size-2 rounded-full bg-emerald-500" : tone === "warning" ? "size-2 rounded-full bg-amber-500" : "size-2 rounded-full bg-slate-300"
          }
        />
        <p className="text-sm font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function SummaryHero({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{caption}</p>
    </div>
  );
}

function GroupHeading({ title }: { title: string }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function formatStayDates(checkIn: string, checkOut: string) {
  if (!checkIn && !checkOut) return "Dates not set yet";
  if (!checkIn || !checkOut) return [checkIn || "TBD", checkOut || "TBD"].join(" → ");
  return `${formatDate(checkIn)} → ${formatDate(checkOut)}`;
}

function presentStayStatus(status: Stay["status"]) {
  if (status === "booked") return "Booked";
  if (status === "shortlisted") return "Shortlisted";
  return "Researching";
}
