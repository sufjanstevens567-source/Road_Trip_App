"use client";

import { useEffect } from "react";
import { divIcon, latLngBounds, type DivIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { Stop, Leg } from "@/types/trip";

interface SimpleRouteMapProps {
  stops: Stop[];
  legs: Leg[];
}

function buildIcon(stop: Stop): DivIcon {
  const colors: Record<Stop["type"], string> = {
    origin: "#1e40af",
    waypoint: "#7c3aed",
    overnight: "#059669",
    destination: "#dc2626",
  };

  return divIcon({
    className: "bg-transparent border-0",
    html: `<div style="display:flex;height:40px;width:40px;align-items:center;justify-content:center;border-radius:999px;border:2px solid white;box-shadow:0 10px 25px rgba(0,0,0,0.2);background:${colors[stop.type]};color:white;font-size:12px;font-weight:600;">${stop.name.charAt(0)}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function FitBounds({ stops }: { stops: Stop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = latLngBounds(
      stops.map((stop) => [stop.coordinates[0], stop.coordinates[1]])
    );
    map.fitBounds(bounds.pad(0.15));
  }, [map, stops]);

  return null;
}

export function SimpleRouteMap({ stops, legs }: SimpleRouteMapProps) {
  // Build polyline from stops in order
  const positions = stops.map((s) => [s.coordinates[0], s.coordinates[1]] as [number, number]);

  return (
    <MapContainer
      className="h-96 w-full"
      center={[48, 15]}
      zoom={6}
      scrollWheelZoom={false}
    >
      <FitBounds stops={stops} />
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: "#3b82f6",
            weight: 3,
            opacity: 0.7,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}
      {stops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.coordinates[0], stop.coordinates[1]]}
          icon={buildIcon(stop)}
        />
      ))}
    </MapContainer>
  );
}
