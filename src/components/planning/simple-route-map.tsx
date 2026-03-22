"use client";

import { useEffect } from "react";
import { divIcon, latLngBounds, type DivIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { Leg, Stop } from "@/types/trip";

interface SimpleRouteMapProps {
  stops: Stop[];
  legs: Leg[];
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string) => void;
  stopStateById?: Record<string, "past" | "current" | "future">;
}

function buildIcon(
  stop: Stop,
  index: number,
  isSelected: boolean,
  state: "past" | "current" | "future" | undefined
): DivIcon {
  const fallbackColors: Record<Stop["type"], string> = {
    origin: "#2851a3",
    waypoint: "#9b6c34",
    overnight: "#3f7e58",
    destination: "#8f3b37",
  };

  const stateColor =
    state === "past" ? "#3f7e58" : state === "current" ? "#2851a3" : state === "future" ? "#94a3b8" : fallbackColors[stop.type];

  const ring = isSelected ? "0 0 0 8px rgba(15,23,42,0.14)" : "0 14px 30px rgba(15,23,42,0.18)";

  return divIcon({
    className: "bg-transparent border-0",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${isSelected ? 46 : 40}px;height:${isSelected ? 46 : 40}px;border-radius:999px;border:${isSelected ? 3 : 2}px solid rgba(255,255,255,0.92);box-shadow:${ring};background:${stateColor};color:white;font-size:12px;font-weight:700;letter-spacing:0.03em;transform:translateZ(0);">${index + 1}</div>`,
    iconSize: [isSelected ? 46 : 40, isSelected ? 46 : 40],
    iconAnchor: [isSelected ? 23 : 20, isSelected ? 23 : 20],
  });
}

function FitBounds({ stops }: { stops: Stop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = latLngBounds(stops.map((stop) => [stop.coordinates[0], stop.coordinates[1]]));
    map.fitBounds(bounds.pad(0.16), { animate: false });
  }, [map, stops]);

  return null;
}

export function SimpleRouteMap({ stops, legs, selectedStopId, onSelectStop, stopStateById }: SimpleRouteMapProps) {
  const positions = stops.map((stop) => [stop.coordinates[0], stop.coordinates[1]] as [number, number]);

  return (
    <MapContainer className="h-[72vh] w-full" center={[48, 15]} zoom={6} scrollWheelZoom={false}>
      <FitBounds stops={stops} />
      <TileLayer
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {positions.length >= 2 && (
        <>
          <Polyline
            positions={positions}
            pathOptions={{
              color: "#d0b58f",
              weight: 9,
              opacity: 0.4,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Polyline
            positions={positions}
            pathOptions={{
              color: "#1f2937",
              weight: 4,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
              dashArray: legs.length > 0 ? undefined : "10 8",
            }}
          />
        </>
      )}

      {stops.map((stop, index) => {
        const isSelected = stop.id === selectedStopId;
        const stopState = stopStateById?.[stop.id];
        return (
          <Marker
            key={stop.id}
            position={[stop.coordinates[0], stop.coordinates[1]]}
            icon={buildIcon(stop, index, isSelected, stopState)}
            eventHandlers={{
              click: () => onSelectStop?.(stop.id),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
