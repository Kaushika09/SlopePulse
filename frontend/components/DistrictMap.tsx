"use client";

import { Fragment, useEffect, useMemo } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
// leaflet.css is imported globally in app/layout.tsx - see the note there.

import { formatNumber, riskColor, riskWeight } from "@/lib/risk";
import type {
  DistrictInfo,
  Hospital,
  LandslidePoint,
  Location,
  RiskSummary,
  School,
  Village,
} from "@/lib/types";

/**
 * District map.
 *
 * Loaded only on the client — Leaflet touches `window` at import time, so this
 * module is pulled in via next/dynamic with ssr disabled (see MapPanel).
 *
 * Facility markers are built with L.divIcon rather than image markers. Leaflet's
 * default icons resolve their PNG paths relative to the CSS file, which breaks
 * under a bundler and produces the well-known missing-marker bug; inline HTML
 * icons sidestep it entirely and let the markers follow the theme.
 */

interface Props {
  district: DistrictInfo;
  roads: Location[];
  risks: RiskSummary[];
  villages: Village[];
  hospitals: Hospital[];
  schools: School[];
  landslides: LandslidePoint[];
  selectedId: string | null;
  onSelect: (locationId: string) => void;
  showFacilities: boolean;
  showLandslides: boolean;
  /** Called when the basemap cannot load, so the panel can say so. */
  onTileError: () => void;
}

/** Small square glyph for a facility, themed to match the panels. */
function facilityIcon(letter: string, title: string) {
  return L.divIcon({
    className: "slopepulse-marker",
    html: `<div title="${title}" style="
      width:18px;height:18px;display:flex;align-items:center;justify-content:center;
      background:#121B2A;border:1px solid #3B4E6E;color:#B9C8DE;
      font-family:var(--font-plex-mono),monospace;font-size:9px;font-weight:600;
      letter-spacing:0.04em;box-shadow:0 1px 4px rgba(0,0,0,.5);
    ">${letter}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Keeps the Leaflet canvas correctly sized when its container changes. */
function ResizeHandler({ selectedId }: { selectedId: string | null }) {
  const map = useMap();

  useEffect(() => {
    // The detail panel appearing changes the map's width. Leaflet does not
    // observe that on its own and renders grey tiles until told to recompute.
    const timer = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timer);
  }, [map, selectedId]);

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

/** Pans to the selected road so map and list stay in agreement. */
function FocusSelected({
  roads,
  selectedId,
}: {
  roads: Location[];
  selectedId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedId) return;
    const road = roads.find((item) => item.id === selectedId);
    if (!road?.path?.length) return;

    map.flyToBounds(L.latLngBounds(road.path as [number, number][]), {
      padding: [70, 70],
      maxZoom: 14,
      duration: 0.6,
    });
  }, [map, roads, selectedId]);

  return null;
}

export default function DistrictMap({
  district,
  roads,
  risks,
  villages,
  hospitals,
  schools,
  landslides,
  selectedId,
  onSelect,
  showFacilities,
  showLandslides,
  onTileError,
}: Props) {
  /** Risk lookup by road id, so each polyline can find its own severity. */
  const riskById = useMemo(() => {
    const map = new Map<string, RiskSummary>();
    risks.forEach((risk) => map.set(risk.location_id, risk));
    return map;
  }, [risks]);

  const icons = useMemo(
    () => ({
      village: (name: string) => facilityIcon("V", name),
      hospital: (name: string) => facilityIcon("H", name),
      school: (name: string) => facilityIcon("S", name),
    }),
    [],
  );

  return (
    <MapContainer
      center={district.center}
      zoom={district.zoom}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl
    >
      {/* OpenStreetMap standard tiles: the most reliably reachable public
          basemap. Darkened via a CSS filter on the tile pane, so the risk
          colours remain the brightest thing on screen. */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors — simulated risk overlay'
        maxZoom={19}
        eventHandlers={{
          tileerror: () => onTileError(),
        }}
      />

      <ResizeHandler selectedId={selectedId} />
      <FocusSelected roads={roads} selectedId={selectedId} />

      {/* Historical landslide inventory, drawn underneath the roads. */}
      {showLandslides &&
        landslides.map((point) => (
          <CircleMarker
            key={point.id}
            center={point.coords}
            radius={3}
            pathOptions={{
              color: "#7C8DA8",
              weight: 1,
              fillColor: "#7C8DA8",
              fillOpacity: 0.55,
            }}
          >
            <Tooltip>
              <span className="font-mono text-2xs">
                {point.year} slide · {formatNumber(point.volume_m3)} m³ · {point.road_id}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

      {/* Road segments, coloured and weighted by current risk. */}
      {roads.map((road) => {
        const risk = riskById.get(road.id);
        const level = risk?.risk_level ?? "LOW";
        const selected = road.id === selectedId;
        const color = riskColor(level);

        return (
          <Fragment key={road.id}>
            {/* Selection halo, drawn beneath the segment itself. */}
            {(selected || level === "CRITICAL") && (
              <Polyline
                positions={road.path}
                interactive={false}
                pathOptions={{
                  color,
                  weight: riskWeight(level) + (selected ? 10 : 7),
                  opacity: selected ? 0.24 : 0.16,
                  lineCap: "round",
                }}
              />
            )}
            {/* Dark casing: separates the segment from the basemap so the
                risk colour stays legible over terrain shading. */}
            <Polyline
              positions={road.path}
              interactive={false}
              pathOptions={{
                color: "#05090F",
                weight: riskWeight(level) + 3,
                opacity: 0.8,
                lineCap: "round",
              }}
            />
            {/* Invisible wide line: a comfortable click target without making
                the drawn segment heavier. */}
            <Polyline
              positions={road.path}
              eventHandlers={{ click: () => onSelect(road.id) }}
              pathOptions={{ color, weight: 18, opacity: 0 }}
            />
            <Polyline
              positions={road.path}
              eventHandlers={{ click: () => onSelect(road.id) }}
              pathOptions={{
                color,
                weight: riskWeight(level),
                opacity: selected ? 1 : 0.9,
                lineCap: "round",
              }}
            >
              <Tooltip sticky>
                <span className="font-mono text-2xs">
                  {road.id} · {risk ? `${risk.risk_percentage}% ${risk.risk_level}` : "scoring…"}
                </span>
              </Tooltip>
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-mono text-xs font-semibold">{road.id}</p>
                  <p className="mt-0.5 text-2xs opacity-80">{road.segment}</p>
                  {risk && (
                    <p className="mt-2 font-mono text-sm" style={{ color }}>
                      {risk.risk_percentage}% {risk.risk_level}
                    </p>
                  )}
                  <button
                    onClick={() => onSelect(road.id)}
                    className="mt-2 w-full border border-[#22314A] px-2 py-1 font-mono text-2xs uppercase tracking-wider"
                  >
                    Open risk analysis
                  </button>
                </div>
              </Popup>
            </Polyline>
          </Fragment>
        );
      })}

      {showFacilities && (
        <>
          {villages.map((village) => (
            <Marker
              key={village.id}
              position={village.coords}
              icon={icons.village(village.name)}
            >
              <Tooltip>
                <span className="font-mono text-2xs">
                  {village.name} · {formatNumber(village.population)} residents
                </span>
              </Tooltip>
            </Marker>
          ))}

          {hospitals.map((hospital) => (
            <Marker
              key={hospital.id}
              position={hospital.coords}
              icon={icons.hospital(hospital.name)}
            >
              <Tooltip>
                <span className="font-mono text-2xs">
                  {hospital.name} · {hospital.beds} beds
                </span>
              </Tooltip>
            </Marker>
          ))}

          {schools.map((school) => (
            <Marker
              key={school.id}
              position={school.coords}
              icon={icons.school(school.name)}
            >
              <Tooltip>
                <span className="font-mono text-2xs">
                  {school.name} · {formatNumber(school.students)} students
                </span>
              </Tooltip>
            </Marker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
