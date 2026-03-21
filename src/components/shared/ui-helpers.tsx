"use client";

import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "muted" | "info";

const TONE_CLASS: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  muted: "border-slate-200 bg-slate-100 text-slate-600",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

const TONE_DOT_CLASS: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  muted: "bg-slate-300",
  info: "bg-sky-500",
};

const TONE_TRACK_CLASS: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  muted: "bg-slate-400",
  info: "bg-sky-500",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE_CLASS[tone],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_DOT_CLASS[tone])} />
      {label}
    </span>
  );
}

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
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ReadinessBar({
  label,
  value,
  showValue = true,
  className,
}: {
  label: string;
  value: number;
  showValue?: boolean;
  className?: string;
}) {
  const tone = getScoreTone(value);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {showValue && <span className="font-medium text-slate-700">{value}%</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200">
        <div className={cn("h-1.5 rounded-full transition-all", TONE_TRACK_CLASS[tone])} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function MiniReadinessBar({
  label,
  value,
  detail,
  emphasized = false,
}: {
  label: string;
  value: number;
  detail: string;
  emphasized?: boolean;
}) {
  const tone = getScoreTone(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-700">{label}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
        </div>
        <ProgressRing value={value} tone={tone} size={emphasized ? 42 : 34} valueClassName={emphasized ? "text-[11px]" : "text-[10px]"} />
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-200">
        <div className={cn("h-1.5 rounded-full transition-all", TONE_TRACK_CLASS[tone])} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  tone,
  size = 42,
  stroke = 4,
  className,
  valueClassName,
}: {
  value: number;
  tone?: Tone;
  size?: number;
  stroke?: number;
  className?: string;
  valueClassName?: string;
}) {
  const resolvedTone = tone ?? getScoreTone(value);
  const fill = progressFill(resolvedTone);
  const track = "rgba(148, 163, 184, 0.2)";
  const inner = Math.max(size - stroke * 2, 10);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${fill} ${value * 3.6}deg, ${track} 0deg)`,
        }}
      />
      <div
        className="absolute rounded-full bg-white"
        style={{
          inset: stroke,
          width: inner,
          height: inner,
        }}
      />
      <div className={cn("absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-700", valueClassName)}>
        {value}%
      </div>
    </div>
  );
}

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
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function toneClass(tone: Tone) {
  return cn("border", TONE_CLASS[tone]);
}

export function toneDotClass(tone: Tone) {
  return TONE_DOT_CLASS[tone];
}

export function getScoreTone(value: number): Tone {
  if (value >= 80) return "success";
  if (value >= 45) return "warning";
  return "danger";
}

export function bookingTone(status: string): Tone {
  if (status === "booked") return "success";
  if (status === "shortlisted" || status === "researching") return "warning";
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

function progressFill(tone: Tone) {
  if (tone === "success") return "#3f7e58";
  if (tone === "warning") return "#c68731";
  if (tone === "danger") return "#ca5b57";
  if (tone === "info") return "#4b7cc7";
  return "#94a3b8";
}
