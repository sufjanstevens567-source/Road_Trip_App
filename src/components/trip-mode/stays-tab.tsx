"use client";

import { Copy, MapPin } from "lucide-react";
import { useState } from "react";
import { useTripStore } from "@/store/trip-store";
import {
  getActiveTrip,
  getTripStays,
} from "@/lib/trip-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLead, StatusPill } from "@/components/shared/ui-helpers";
import type { Stay } from "@/types/trip";

export function StaysTab() {
  const state = useTripStore();
  const activeTrip = getActiveTrip(state);
  const [expandedStayId, setExpandedStayId] = useState<string | null>(null);

  if (!activeTrip) return null;

  const stays = getTripStays(state, activeTrip.id);

  const getTripStops = (tripId: string) => {
    const stops = state.stops.filter((s) => s.tripId === tripId).sort((a, b) => a.position - b.position);
    return stops;
  };

  const stops = getTripStops(activeTrip.id);

  const getStayTone = (status: Stay["status"]): "success" | "warning" | "muted" => {
    if (status === "booked") return "success";
    if (status === "shortlisted") return "warning";
    return "muted";
  };

  return (
    <div className="space-y-4">
      <SectionLead
        eyebrow="Accommodations"
        title="Stays"
        description={`${stays.length} night${stays.length !== 1 ? "s" : ""}`}
      />

      <div className="space-y-2">
        {stays.map((stay) => {
          const stopName = stops.find((s) => s.id === stay.stopId)?.name || "Unknown";
          const isExpanded = expandedStayId === stay.id;

          return (
            <Card
              key={stay.id}
              className="overflow-hidden cursor-pointer hover:border-sky-300 transition-colors"
              onClick={() =>
                setExpandedStayId(isExpanded ? null : stay.id)
              }
            >
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{stopName}</p>
                    <p className="text-xs text-muted-foreground">
                      {stay.checkIn} → {stay.checkOut}
                    </p>
                  </div>
                  <StatusPill label={stay.status} tone={getStayTone(stay.status)} />
                </div>

                {isExpanded && (
                  <div className="border-t pt-3 space-y-3">
                    {stay.propertyName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Property</p>
                        <p className="text-sm font-medium text-foreground">
                          {stay.propertyName}
                        </p>
                      </div>
                    )}

                    {stay.address && (
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm text-foreground">{stay.address}</p>
                      </div>
                    )}

                    {stay.confirmationCode && (
                      <div>
                        <p className="text-xs text-muted-foreground">Confirmation</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-slate-100 px-2 py-1 rounded font-mono text-xs text-foreground">
                            {stay.confirmationCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(stay.confirmationCode);
                            }}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {stay.parkingNotes && (
                      <div>
                        <p className="text-xs text-muted-foreground">Parking</p>
                        <p className="text-sm text-foreground">{stay.parkingNotes}</p>
                      </div>
                    )}

                    {stay.bookingUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(stay.bookingUrl, "_blank");
                        }}
                      >
                        <MapPin className="mr-1.5 size-3.5" /> Open booking
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
