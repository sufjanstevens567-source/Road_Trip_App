"use client";

import { useEffect } from "react";
import { divIcon, latLngBounds, type DivIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

import { STOP_LOOKUP } from "@/data/trip-seed";
import type { RouteStop, TripDay } from "@/types/trip";

interface RouteMapProps {
  stops: RouteStop[];
  days: TripDay[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
}

function markerColor(kind: RouteStop["kind"]) {
  switch (kind) {
    case "city":
      return "oklch(0.46 0.12 230)";
    case "scenic":
      return "oklch(0.68 0.14 145)";
    case "practical":
      return "oklch(0.63 0.11 75)";
    case "finish":
      return "oklch(0.52 0.17 30)";
    default:
      return "oklch(0.38 0.02 260)";
  }
}

function buildIcon(stop: RouteStop): DivIcon {
  return divIcon({
    className: "bg-transparent border-0",
    html: `<div style="display:flex;height:40px;width:40px;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(255,255,255,.8);box-shadow:0 10px 24px rgba(15,23,42,.16);background:${markerColor(stop.kind)};color:white;font-size:10px;font-weight:600;">${stop.markerLabel}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function FitBounds({ stops }: { stops: RouteStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = latLngBounds(stops.map((stop) => stop.coordinates));
    map.fitBounds(bounds.pad(0.28));
  }, [map, stops]);
  return null;
}

export function RouteMap({ stops, days, selectedDayId, onSelectDay }: RouteMapProps) {
  const polylines = days.map((day) => ({
    id: day.id,
    positions: [day.startStopId, ...(day.viaStopIds ?? []), day.endStopId].map((stopId) => STOP_LOOKUP[stopId].coordinates),
  }));

  return (
    <MapContainer className="h-[420px] w-full rounded-[1.75rem]" center={[47.5, 17.5]} zoom={6} scrollWheelZoom={false}>
      <FitBounds stops={stops} />
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {polylines.map((polyline) => {
        const active = polyline.id === selectedDayId;
        return (
          <Polyline
            key={polyline.id}
            positions={polyline.positions}
            pathOptions={{
              color: active ? "#22577A" : "#7f8e95",
              weight: active ? 6 : 4,
              opacity: active ? 0.9 : 0.55,
              lineCap: "round",
              lineJoin: "round",
              dashArray: active ? undefined : "8 10",
            }}
            eventHandlers={{ click: () => onSelectDay(polyline.id) }}
          />
        );
      })}
      {stops.map((stop) => {
        const linkedDay =
          days.find((day) => day.endStopId === stop.id) ??
          days.find((day) => day.viaStopIds?.includes(stop.id)) ??
          days.find((day) => day.startStopId === stop.id);
        return (
          <Marker
            key={stop.id}
            position={stop.coordinates}
            icon={buildIcon(stop)}
            eventHandlers={linkedDay ? { click: () => onSelectDay(linkedDay.id) } : undefined}
          />
        );
      })}
    </MapContainer>
  );
}
