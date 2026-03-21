"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripChecklist,
  getTripCountryRules,
  getTripReadiness,
  getTripStays,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ProgressRing, ReadinessBar, SectionLead, StatusPill, complianceTone, getScoreTone } from "@/components/shared/ui-helpers";
import type { ChecklistStatus, CountryRule } from "@/types/trip";

export function PrepView() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const tripId = activeTrip?.id ?? "";

  const stays = getTripStays(state, tripId);
  const rules = getTripCountryRules(state, tripId);
  const checklist = getTripChecklist(state, tripId);
  const readiness = getTripReadiness(stays, rules, checklist);

  const updateCountryRuleItemStatus = useTripStore((s) => s.updateCountryRuleItemStatus);
  const updateChecklistItem = useTripStore((s) => s.updateChecklistItem);
  const setTripStatus = useTripStore((s) => s.setTripStatus);

  const [activeCountryRuleId, setActiveCountryRuleId] = useState<string | null>(rules[0]?.id ?? null);
  const [celebratingRuleItemId, setCelebratingRuleItemId] = useState<string | null>(null);

  if (!activeTrip) return null;

  const vehicleItems = checklist.filter(
    (item) => item.category === "vehicle" || item.category === "safety-kit" || item.category === "documents" || item.category === "packing"
  );
  const resolvedActiveCountryRuleId = rules.some((rule) => rule.id === activeCountryRuleId) ? activeCountryRuleId : (rules[0]?.id ?? null);
  const activeRule = rules.find((rule) => rule.id === resolvedActiveCountryRuleId) ?? null;

  const handleMarkReady = () => {
    if (readiness.overall === 100) {
      setTripStatus(activeTrip.id, "ready");
    }
  };

  const handleRuleStatusChange = (ruleId: string, itemId: string, status: ChecklistStatus) => {
    updateCountryRuleItemStatus(ruleId, itemId, status);
    if (status === "done") {
      setCelebratingRuleItemId(itemId);
      window.setTimeout(() => setCelebratingRuleItemId((current) => (current === itemId ? null : current)), 260);
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <div className="space-y-4">
          <SectionLead eyebrow="Compliance" title="Country rules" description={`${rules.length} countries, opened one at a time so you can focus on what still needs work.`} />

        {rules.length === 0 ? (
          <EmptyState
            title="No country rules loaded"
            description="Add country-specific compliance items and route notes, then this view becomes the working desk for clearing them."
          />
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {rules.map((rule) => {
                const completion = getRuleCompletion(rule);
                const isActive = resolvedActiveCountryRuleId === rule.id;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => setActiveCountryRuleId(rule.id)}
                    className={`interactive-lift flex min-w-[11rem] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      isActive ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-slate-950"}`}>{rule.country}</p>
                      <p className={`mt-1 text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                        {completion.done}/{completion.total} cleared
                      </p>
                    </div>
                    <ProgressRing
                      value={completion.percent}
                      tone={getScoreTone(completion.percent)}
                      size={38}
                      valueClassName={isActive ? "text-[10px] text-slate-900" : "text-[10px]"}
                    />
                  </button>
                );
              })}
            </div>

            {activeRule && (
              <Card className="border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Active country</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{activeRule.country}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeRule.documents.length > 0 ? `Key docs: ${activeRule.documents.join(" • ")}` : "Use this panel to close the remaining compliance tasks."}
                    </p>
                  </div>
                  <StatusPill
                    label={`${getRuleCompletion(activeRule).done}/${getRuleCompletion(activeRule).total} done`}
                    tone={getScoreTone(getRuleCompletion(activeRule).percent)}
                  />
                </div>

                <div className={`mt-5 grid gap-4 ${activeRule.items.length < 4 ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1.15fr)_18rem]"}`}>
                  <div className="space-y-3">
                    {activeRule.items.map((item) => (
                      <div key={item.id} className={`rounded-lg border border-slate-200 bg-slate-50/75 px-4 py-4 ${celebratingRuleItemId === item.id ? "check-celebrate" : ""}`}>
                        <div className="flex items-start gap-3">
                          <Select
                            value={item.status}
                            onValueChange={(value) => handleRuleStatusChange(activeRule.id, item.id, value as ChecklistStatus)}
                          >
                            <SelectTrigger className="mt-0.5 w-28 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Todo</SelectItem>
                              <SelectItem value="in-progress">In progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                              <StatusPill label={item.status} tone={complianceTone(item.status)} />
                            </div>
                            {item.detail && <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.detail}</p>}
                            {item.dueBy && <p className="mt-2 text-xs text-slate-500">Due by {item.dueBy}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Card className="border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Country notes</p>
                    <div className="mt-4 space-y-3 text-sm">
                      {activeRule.tollNotes && <InfoRow label="Tolls" value={activeRule.tollNotes} />}
                      {activeRule.borderNotes && <InfoRow label="Border" value={activeRule.borderNotes} />}
                      {activeRule.emissionZoneNotes && <InfoRow label="Emissions" value={activeRule.emissionZoneNotes} />}
                      {activeRule.speedLimitNotes && <InfoRow label="Speed limits" value={activeRule.speedLimitNotes} />}
                      {activeRule.commonMistakes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Common mistakes</p>
                          <ul className="space-y-2 text-sm text-slate-600">
                            {activeRule.commonMistakes.map((mistake) => (
                              <li key={mistake} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </Card>
            )}
          </>
        )}
        </div>

        <div className="sticky top-8 h-fit space-y-4">
          <SectionLead eyebrow="Readiness" title="Vehicle & prep" />

          <Card className="border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Overall readiness</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{readiness.overall}%</p>
              <div className="mt-3">
                <ReadinessBar label="Trip readiness" value={readiness.overall} showValue={false} />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {["vehicle", "safety-kit", "documents", "packing"].map((category) => {
                const items = vehicleItems.filter((item) => item.category === category);
                if (items.length === 0) return null;

              const done = items.filter((item) => item.done).length;

              return (
                <div key={category}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {category.replace("-", " ")} ({done}/{items.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {items.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/75 px-3 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => updateChecklistItem(item.id, { done: !item.done })}
                          className="mt-0.5 rounded border-slate-300"
                        />
                        <div>
                          <p className={item.done ? "text-slate-400 line-through" : "text-slate-900"}>{item.label}</p>
                          {item.dueBy && <p className="text-xs text-slate-500">{item.dueBy}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

            {readiness.overall === 100 ? (
              <Button size="sm" className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkReady}>
                <Check className="mr-1.5 size-4" /> Mark trip as ready
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="mt-5 w-full" disabled>
                Complete prep to mark ready ({readiness.overall}%)
              </Button>
            )}
          </Card>
        </div>
    </div>
  );
}

function getRuleCompletion(rule: CountryRule) {
  const total = rule.items.length;
  const done = rule.items.filter((item) => item.status === "done").length;
  return {
    total,
    done,
    percent: total > 0 ? Math.round((done / total) * 100) : 100,
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{value}</p>
    </div>
  );
}
