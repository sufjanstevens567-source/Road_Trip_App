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
      return "oklch(0.42 0.08 232)";
    case "scenic":
      return "oklch(0.62 0.09 150)";
    case "practical":
      return "oklch(0.72 0.07 74)";
    case "finish":
      return "oklch(0.58 0.15 38)";
    default:
      return "oklch(0.33 0.03 246)";
  }
}

function buildIcon(stop: RouteStop): DivIcon {
  return divIcon({
    className: "bg-transparent border-0",
    html: `<div style="display:flex;height:44px;width:44px;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(255,255,255,.92);box-shadow:0 18px 42px rgba(31,38,67,.22);background:${markerColor(stop.kind)};color:rgba(255,250,242,.98);font-size:11px;font-weight:700;letter-spacing:.03em;">${stop.markerLabel}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function FitBounds({ stops }: { stops: RouteStop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = latLngBounds(stops.map((stop) => stop.coordinates));
    map.fitBounds(bounds.pad(0.2));
  }, [map, stops]);

  return null;
}

export function RouteMap({ stops, days, selectedDayId, onSelectDay }: RouteMapProps) {
  const polylines = days.map((day) => ({
    id: day.id,
    positions: [day.startStopId, ...(day.viaStopIds ?? []), day.endStopId].map((stopId) => STOP_LOOKUP[stopId].coordinates),
  }));

  return (
    <MapContainer className="h-[560px] w-full rounded-[2rem]" center={[47.5, 17.5]} zoom={6} scrollWheelZoom={false}>
      <FitBounds stops={stops} />
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {polylines.map((polyline) => {
        const active = polyline.id === selectedDayId;
        return (
          <Polyline
            key={polyline.id}
            positions={polyline.positions}
            pathOptions={{
              color: active ? "#284B75" : "#938f87",
              weight: active ? 7 : 4,
              opacity: active ? 0.92 : 0.48,
              lineCap: "round",
              lineJoin: "round",
              dashArray: active ? undefined : "10 14",
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
