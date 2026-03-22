"use client";

import { Check, Copy, Navigation } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function buildMapsUrl(coordinates: [number, number], label?: string) {
  const destination = `${coordinates[0]},${coordinates[1]}`;

  if (typeof navigator !== "undefined") {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod|macintosh/.test(userAgent)) {
      return `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(label ?? destination)}`;
    }
    if (/android/.test(userAgent)) {
      return `geo:${destination}?q=${destination}(${encodeURIComponent(label ?? destination)})`;
    }
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function openMapsDestination(coordinates: [number, number], label?: string) {
  const url = buildMapsUrl(coordinates, label);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function NavigateButton({
  coordinates,
  label,
  className,
  variant = "default",
}: {
  coordinates: [number, number];
  label: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <Button
      variant={variant}
      size="lg"
      className={cn("h-12 w-full justify-center rounded-xl", className)}
      onClick={() => openMapsDestination(coordinates, label)}
    >
      <Navigation className="mr-2 size-4" />
      {label}
    </Button>
  );
}

export function CopyButton({
  value,
  label = "Copy code",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className={cn("h-11 rounded-xl px-3.5", className)} onClick={handleCopy}>
      {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function ChecklistRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "interactive-lift flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        checked
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
          : "border-slate-200 bg-white text-slate-900"
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl border transition-colors",
          checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-slate-50 text-slate-400"
        )}
      >
        <Check className="size-5" />
      </span>
      <span className={cn("text-sm leading-relaxed", checked ? "line-through text-emerald-800/80" : "text-slate-800")}>{label}</span>
    </button>
  );
}
