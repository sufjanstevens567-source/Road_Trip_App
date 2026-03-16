"use client";

import { cn } from "@/lib/utils";

// ─── Status pill ──────────────────────────────────────────────────────────────

type Tone = "success" | "warning" | "danger" | "muted" | "info";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  danger: "bg-red-100 text-red-800 border-red-200",
  muted: "bg-slate-100 text-slate-600 border-slate-200",
  info: "bg-sky-100 text-sky-700 border-sky-200",
};

export function StatusPill({
  label,
  tone = "muted",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

// ─── Section lead ─────────────────────────────────────────────────────────────

export function SectionLead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Readiness bar ────────────────────────────────────────────────────────────

export function ReadinessBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const color =
    value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-black/8">
        <div
          className={cn("h-1.5 rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black/15 bg-white/40 px-6 py-12 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

export function toneClass(tone: Tone) {
  return cn("border", TONE_CLASS[tone]);
}

export function bookingTone(status: string): Tone {
  if (status === "booked") return "success";
  if (status === "shortlisted") return "warning";
  return "muted";
}

export function complianceTone(status: string): Tone {
  if (status === "done") return "success";
  if (status === "in-progress") return "warning";
  return "danger";
}

export function warningTone(severity: string): Tone {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "muted";
}
