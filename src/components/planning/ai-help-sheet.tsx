"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Shield, Sparkles } from "lucide-react";
import {
  AI_ALWAYS_INCLUDED_SECTIONS,
  AI_HELP_GOALS,
  AI_OPTIONAL_SHARE_SECTIONS,
  AI_SHARE_SECTIONS,
  buildAiExportBundle,
  buildAiPreviewSummary,
  type AiHelpGoalId,
  type AiShareSection,
} from "@/lib/ai-export";
import { useTripStore } from "@/store/trip-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/shared/ui-helpers";

const MAX_GOALS = 3;
const DEFAULT_OPTIONAL_SECTIONS: AiShareSection[] = AI_OPTIONAL_SHARE_SECTIONS.map((section) => section.id);

export function AiHelpSheet({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [open, setOpen] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<AiHelpGoalId[]>([]);
  const [specificRequest, setSpecificRequest] = useState("");
  const [includedSections, setIncludedSections] = useState<AiShareSection[]>(DEFAULT_OPTIONAL_SECTIONS);
  const [includeSensitiveDetails, setIncludeSensitiveDetails] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const preview = useMemo(
    () =>
      buildAiPreviewSummary({
        goals: selectedGoals,
        specificRequest,
        includedSections,
        includeSensitiveDetails,
      }),
    [selectedGoals, specificRequest, includedSections, includeSensitiveDetails]
  );

  function toggleGoal(goalId: AiHelpGoalId) {
    setStatusMessage(null);
    setSelectedGoals((current) => {
      if (current.includes(goalId)) {
        return current.filter((id) => id !== goalId);
      }

      if (current.length >= MAX_GOALS) {
        setStatusMessage("Choose up to 3 areas so the AI stays focused.");
        return current;
      }

      return [...current, goalId];
    });
  }

  function toggleIncludedSection(sectionId: AiShareSection) {
    setIncludedSections((current) =>
      current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]
    );
  }

  async function handleCopy() {
    if (selectedGoals.length === 0) return;
    setIsCopying(true);
    setStatusMessage(null);

    try {
      const bundle = buildAiExportBundle(useTripStore.getState(), tripId, {
        goals: selectedGoals,
        specificRequest,
        includedSections,
        includeSensitiveDetails,
      });
      await copyText(bundle.markdown);
      setStatusMessage("Trip details copied and ready to paste into AI.");
    } catch {
      setStatusMessage("We couldn't copy the trip details. Please try again.");
    } finally {
      setIsCopying(false);
    }
  }

  function handleDownload() {
    if (selectedGoals.length === 0) return;
    setIsDownloading(true);
    setStatusMessage(null);

    try {
      const bundle = buildAiExportBundle(useTripStore.getState(), tripId, {
        goals: selectedGoals,
        specificRequest,
        includedSections,
        includeSensitiveDetails,
      });
      downloadFile(`${bundle.filenameBase}-trip-context.json`, bundle.json, "application/json");
      setStatusMessage("Trip details downloaded.");
    } catch {
      setStatusMessage("We couldn't download the trip details. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="secondary" size="sm" className="shadow-[0_18px_45px_-30px_rgba(38,66,120,0.75)]" />
        }
      >
        <Sparkles className="mr-1.5 size-3.5" />
        Get AI Help
      </SheetTrigger>
      <SheetContent side="right" className="w-full border-l border-slate-200/90 bg-white sm:max-w-[46rem]">
        <SheetHeader className="border-b border-slate-200/80 bg-white px-7 py-6">
          <div className="space-y-3">
            <StatusPill label={tripName} tone="info" />
            <div className="space-y-1.5">
              <SheetTitle className="text-[2rem] font-semibold tracking-tight text-slate-950">Get help with this trip</SheetTitle>
              <SheetDescription className="max-w-xl text-sm leading-relaxed text-slate-600">
                Choose what you want help with and we&apos;ll prepare your trip details for ChatGPT or another AI tool.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.88),rgba(243,246,250,0.96))] px-7 py-7">
          <div className="space-y-5">
            <section className="space-y-4 rounded-[1.6rem] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">What do you want help with?</p>
                <p className="text-sm text-slate-600">Choose up to 3 areas so the AI stays focused on the advice you actually want.</p>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {AI_HELP_GOALS.map((item) => {
                  const isSelected = selectedGoals.includes(item.id);
                  const limitReached = !isSelected && selectedGoals.length >= MAX_GOALS;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleGoal(item.id)}
                      disabled={limitReached}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_45px_-26px_rgba(15,23,42,0.55)]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      } ${limitReached ? "cursor-not-allowed opacity-45" : "interactive-lift"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-950"}`}>{item.label}</p>
                          <p className={`text-sm leading-relaxed ${isSelected ? "text-slate-200" : "text-slate-600"}`}>{item.description}</p>
                        </div>
                        {isSelected && <Check className="mt-0.5 size-4 shrink-0 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 rounded-[1.6rem] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.2)]">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Anything specific?</p>
                <p className="text-sm text-slate-600">Optional, but this helps the AI give more useful recommendations.</p>
              </div>
              <Textarea
                value={specificRequest}
                onChange={(event) => setSpecificRequest(event.target.value)}
                placeholder="Example: Help me reduce long driving days without changing the overall character of the trip."
                className="min-h-32 rounded-[1.25rem] border-slate-200 bg-slate-50/55 px-4 py-3"
              />
            </section>

            <section className="space-y-4 rounded-[1.6rem] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.2)]">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">What should we share?</p>
                <p className="text-sm text-slate-600">Route and itinerary stay on by default. Add or remove the extra context you want the AI to see.</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Always included</p>
                <div className="flex flex-wrap gap-2">
                  {AI_ALWAYS_INCLUDED_SECTIONS.map((sectionId) => (
                    <span
                      key={sectionId}
                      className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {sectionLabel(sectionId)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Optional</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AI_OPTIONAL_SHARE_SECTIONS.map((section) => {
                    const isSelected = includedSections.includes(section.id);
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => toggleIncludedSection(section.id)}
                        className={`rounded-[1.15rem] border px-4 py-4 text-left transition-all ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_45px_-26px_rgba(15,23,42,0.5)]"
                            : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                        } interactive-lift`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-950"}`}>{section.label}</p>
                            <p className={`text-sm leading-relaxed ${isSelected ? "text-slate-200" : "text-slate-600"}`}>{section.description}</p>
                          </div>
                          {isSelected && <Check className="mt-0.5 size-4 shrink-0 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-[1.15rem] border border-slate-200 bg-slate-50/65 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeSensitiveDetails}
                  onChange={(event) => setIncludeSensitiveDetails(event.target.checked)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span>
                  <span className="font-medium text-slate-900">Include booking references and personal notes</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Leave this off for a safer export. Turn it on only if you want the AI to see booking links, confirmation codes, and freeform notes.
                  </span>
                </span>
              </label>
            </section>

            <section className="space-y-4 rounded-[1.6rem] border border-sky-200/90 bg-[linear-gradient(180deg,rgba(237,246,255,0.9),rgba(229,241,255,0.94))] px-5 py-5 shadow-[0_20px_45px_-36px_rgba(59,130,246,0.4)]">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-sky-700" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">AI preview</p>
              </div>
              <div className="space-y-2 text-sm leading-relaxed text-slate-700">
                <p>{preview.focusLine}</p>
                <p>{preview.includeLine}</p>
                <p>{preview.sensitiveLine}</p>
                {preview.noteLine && <p>{preview.noteLine}</p>}
              </div>
              {preview.taskLines.length > 0 && (
                <ul className="space-y-2 text-sm text-slate-600">
                  {preview.taskLines.map((task) => (
                    <li key={task} className="flex gap-2">
                      <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-sky-600" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        <SheetFooter className="border-t border-slate-200/80 bg-white px-7 py-5">
          <div className="space-y-3">
            {statusMessage && <p className="text-sm text-slate-600">{statusMessage}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={() => void handleCopy()} disabled={selectedGoals.length === 0 || isCopying}>
                <Copy className="mr-1.5 size-3.5" />
                {isCopying ? "Copying..." : "Copy for AI"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={selectedGoals.length === 0 || isDownloading}>
                <Download className="mr-1.5 size-3.5" />
                {isDownloading ? "Preparing..." : "Download trip details"}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sectionLabel(sectionId: AiShareSection) {
  return AI_SHARE_SECTIONS.find((section) => section.id === sectionId)?.label ?? sectionId;
}
