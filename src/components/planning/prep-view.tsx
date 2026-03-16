"use client";

import { Check } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripCountryRules,
  getTripChecklist,
  getTripReadiness,
  getTripStays,
  getVehicleCompletion,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionLead, ReadinessBar } from "@/components/shared/ui-helpers";
import type { ChecklistStatus } from "@/types/trip";

export function PrepView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);

  if (!activeTrip) return null;

  const stays = getTripStays(state, activeTrip.id);
  const rules = getTripCountryRules(state, activeTrip.id);
  const checklist = getTripChecklist(state, activeTrip.id);
  const readiness = getTripReadiness(stays, rules, checklist);
  const vehicleCompletion = getVehicleCompletion(checklist);

  const updateCountryRuleItemStatus = useTripStore((s) => s.updateCountryRuleItemStatus);
  const updateChecklistItem = useTripStore((s) => s.updateChecklistItem);
  const setTripStatus = useTripStore((s) => s.setTripStatus);

  const vehicleItems = checklist.filter(
    (c) => c.category === "vehicle" || c.category === "safety-kit" || c.category === "documents" || c.category === "packing"
  );

  const handleMarkReady = () => {
    if (readiness.overall === 100) {
      setTripStatus(activeTrip.id, "ready");
    }
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: Country Rules */}
      <div className="space-y-4">
        <SectionLead
          eyebrow="Compliance"
          title="Country Rules"
          description={`${rules.length} countries`}
        />

        <div className="space-y-3">
          {rules.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <p>No country rules loaded. Add them in the wizard or manually.</p>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} className="p-4 space-y-3">
                <h3 className="font-semibold text-foreground">{rule.country}</h3>

                <div className="space-y-2">
                  {rule.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Select
                        value={item.status}
                        onValueChange={(val) =>
                          updateCountryRuleItemStatus(rule.id, item.id, val as ChecklistStatus)
                        }
                      >
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">Todo</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <div>
                        <p className="text-foreground">{item.label}</p>
                        {item.detail && (
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Right: Vehicle & Checklists */}
      <div className="space-y-4 sticky top-8 h-fit">
        <SectionLead eyebrow="Readiness" title="Vehicle & Prep" />

        <Card className="p-4 space-y-4">
          {/* Readiness scores */}
          <div className="space-y-3">
            <ReadinessBar label="Bookings" value={readiness.bookings} />
            <ReadinessBar label="Compliance" value={readiness.compliance} />
            <ReadinessBar label="Vehicle & prep" value={vehicleCompletion} />
            <div className="border-t pt-3">
              <ReadinessBar label="Overall readiness" value={readiness.overall} />
            </div>
          </div>

          {/* Checklist items by category */}
          <div className="border-t pt-4 space-y-4">
            {["vehicle", "safety-kit", "documents", "packing"].map((cat) => {
              const items = vehicleItems.filter((c) => c.category === cat);
              if (items.length === 0) return null;

              const done = items.filter((c) => c.done).length;

              return (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {cat.replace("-", " ")} ({done}/{items.length})
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            updateChecklistItem(item.id, { done: !item.done })
                          }
                          className="rounded border-slate-300"
                        />
                        <span
                          className={
                            item.done
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }
                        >
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mark ready button */}
          {readiness.overall === 100 ? (
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleMarkReady}
            >
              <Check className="mr-1.5 size-4" /> Mark trip as ready
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full" disabled>
              Complete prep to mark ready ({readiness.overall}%)
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
