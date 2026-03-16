"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripStays,
  getTripBudgetLines,
  getBudgetSummary,
  formatCurrency,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionLead, StatusPill } from "@/components/shared/ui-helpers";
import type { Stay, BudgetCategory } from "@/types/trip";

export function StaysBudgetView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);

  if (!activeTrip) return null;

  const stays = getTripStays(state, activeTrip.id);
  const budgetLines = getTripBudgetLines(state, activeTrip.id);
  const summary = getBudgetSummary(stays, budgetLines);

  const updateStay = useTripStore((s) => s.updateStay);
  const removeStay = useTripStore((s) => s.removeStay);
  const addBudgetLine = useTripStore((s) => s.addBudgetLine);
  const updateBudgetLine = useTripStore((s) => s.updateBudgetLine);
  const removeBudgetLine = useTripStore((s) => s.removeBudgetLine);

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
    <div className="grid grid-cols-2 gap-8">
      {/* Left: Stays */}
      <div className="space-y-4">
        <SectionLead
          eyebrow="Accommodations"
          title="Stays"
          description={`${stays.length} night${stays.length !== 1 ? "s" : ""}`}
        />

        <div className="space-y-3">
          {stays.map((stay) => (
            <StayCard
              key={stay.id}
              stay={stay}
              onUpdate={(patch) => updateStay(stay.id, patch)}
              onRemove={() => removeStay(stay.id)}
            />
          ))}
        </div>
      </div>

      {/* Right: Budget Summary */}
      <div className="space-y-4 sticky top-8 h-fit">
        <SectionLead eyebrow="Costs" title="Budget" />

        <Card className="p-4 space-y-4">
          {/* Accommodation total */}
          <div className="border-b pb-3">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-muted-foreground">Accommodation (planned)</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(summary.accommodation.planned, activeTrip.currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Actual</span>
              <span>{formatCurrency(summary.accommodation.actual, activeTrip.currency)}</span>
            </div>
          </div>

          {/* Other budget lines by category */}
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {Object.entries(summary.byCategory).map(([cat, vals]) => (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {cat}
                </p>
                <div className="space-y-1 mb-2">
                  {budgetLines
                    .filter((l) => l.category === cat)
                    .map((line) => (
                      <div key={line.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{line.label || "(no label)"}</span>
                        <div className="flex gap-2 items-center">
                          <span>{formatCurrency(line.planned, activeTrip.currency)}</span>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => removeBudgetLine(line.id)}
                          >
                            <Trash2 className="size-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex justify-between text-sm font-semibold border-b pb-2 mb-2">
                  <span className="text-foreground">{cat} total</span>
                  <span className="text-foreground">
                    {formatCurrency(vals.planned, activeTrip.currency)}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  className="w-full text-xs"
                  onClick={() => handleAddBudgetLine(cat as BudgetCategory)}
                >
                  <Plus className="mr-1 size-3" /> Add {cat}
                </Button>
              </div>
            ))}
          </div>

          {/* Grand total */}
          <div className="border-t pt-4 space-y-1">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-foreground">Total planned</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(summary.total.planned, activeTrip.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total actual</span>
              <span>{formatCurrency(summary.total.actual, activeTrip.currency)}</span>
            </div>
            {summary.total.remaining !== 0 && (
              <div className="flex justify-between text-sm text-amber-700 font-medium pt-1">
                <span>Remaining budget</span>
                <span>{formatCurrency(summary.total.remaining, activeTrip.currency)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StayCard({
  stay,
  onUpdate,
  onRemove,
}: {
  stay: Stay;
  onUpdate: (patch: Partial<Stay>) => void;
  onRemove: () => void;
}) {
  const getBookingTone = (status: Stay["status"]): "success" | "warning" | "muted" => {
    if (status === "booked") return "success";
    if (status === "shortlisted") return "warning";
    return "muted";
  };

  const completionScore = stay.status === "booked"
    ? 100
    : stay.status === "shortlisted"
    ? 55
    : 25;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Input
          placeholder="Property name"
          value={stay.propertyName}
          onChange={(e) => onUpdate({ propertyName: e.target.value })}
          className="text-sm font-semibold"
        />
        <StatusPill label={stay.status} tone={getBookingTone(stay.status)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={stay.checkIn}
          onChange={(e) => onUpdate({ checkIn: e.target.value })}
        />
        <Input
          type="date"
          value={stay.checkOut}
          onChange={(e) => onUpdate({ checkOut: e.target.value })}
        />
      </div>

      <Input
        placeholder="Address"
        value={stay.address}
        onChange={(e) => onUpdate({ address: e.target.value })}
        className="text-xs"
      />

      <Input
        placeholder="Booking URL"
        value={stay.bookingUrl}
        onChange={(e) => onUpdate({ bookingUrl: e.target.value })}
        className="text-xs"
      />

      <Input
        placeholder="Confirmation code"
        value={stay.confirmationCode}
        onChange={(e) => onUpdate({ confirmationCode: e.target.value })}
        className="text-xs"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Planned cost</label>
          <Input
            type="number"
            value={stay.costPlanned}
            onChange={(e) => onUpdate({ costPlanned: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Actual cost</label>
          <Input
            type="number"
            value={stay.costActual}
            onChange={(e) => onUpdate({ costActual: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Completion</span>
        <span className="font-semibold text-foreground">{completionScore}%</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-red-600 hover:text-red-700"
        onClick={onRemove}
      >
        <Trash2 className="mr-1.5 size-3.5" /> Remove
      </Button>
    </Card>
  );
}
