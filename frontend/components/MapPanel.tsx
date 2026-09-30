"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Layers, MapPin } from "lucide-react";

import { RISK_COLORS, RISK_ORDER } from "@/lib/risk";
import type {
  DistrictInfo,
  Hospital,
  LandslidePoint,
  Location,
  RiskSummary,
  School,
  Village,
} from "@/lib/types";
import { ErrorBlock } from "./StateViews";

/**
 * Leaflet reads `window` during module evaluation, so the map is imported
 * dynamically with SSR disabled. Without this the Next build fails at the
 * prerender step.
 */
const DistrictMap = dynamic(() => import("./DistrictMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-panel/40">
      <div className="flex items-center gap-2 text-muted">
        <MapPin className="h-4 w-4 animate-pulse" aria-hidden />
        <span className="font-mono text-2xs uppercase tracking-[0.14em]">
          Loading district map…
        </span>
      </div>
    </div>
  ),
});

export default function MapPanel({
  district,
  roads,
  risks,
  villages,
  hospitals,
  schools,
  landslides,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
}: {
  district: DistrictInfo | null;
  roads: Location[];
  risks: RiskSummary[];
  villages: Village[];
  hospitals: Hospital[];
  schools: School[];
  landslides: LandslidePoint[];
  selectedId: string | null;
  onSelect: (locationId: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [showFacilities, setShowFacilities] = useState(true);
  const [showLandslides, setShowLandslides] = useState(true);
  const [tileError, setTileError] = useState(false);

  // Roads and markers are drawn from API data and stay usable even if the
  // basemap is unreachable, so this is a notice rather than an error state.
  const handleTileError = useCallback(() => setTileError(true), []);

  return (
    <section className="panel relative flex min-h-[60vh] flex-col sm:min-h-[420px] lg:h-full lg:min-h-0" aria-label="District map">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">District map</h2>
          <p className="mt-0.5 text-2xs text-faint">
            {district?.name ?? "Loading district"} — simulated terrain
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-faint" aria-hidden />
          <button
            onClick={() => setShowFacilities((value) => !value)}
            aria-pressed={showFacilities}
            className={`border px-2 py-1 font-mono text-2xs uppercase tracking-[0.12em] transition-colors ${
              showFacilities
                ? "border-line bg-ink/10 text-ink"
                : "border-line/60 text-faint hover:text-muted"
            }`}
          >
            Facilities
          </button>
          <button
            onClick={() => setShowLandslides((value) => !value)}
            aria-pressed={showLandslides}
            className={`border px-2 py-1 font-mono text-2xs uppercase tracking-[0.12em] transition-colors ${
              showLandslides
                ? "border-line bg-ink/10 text-ink"
                : "border-line/60 text-faint hover:text-muted"
            }`}
          >
            Past slides
          </button>
        </div>
      </div>

      <div className="relative min-h-[380px] flex-1">
        {error && !district ? (
          <ErrorBlock message={error} onRetry={onRetry} />
        ) : district ? (
          <div className="absolute inset-0">
            <DistrictMap
              district={district}
              roads={roads}
              risks={risks}
              villages={villages}
              hospitals={hospitals}
              schools={schools}
              landslides={landslides}
              selectedId={selectedId}
              onSelect={onSelect}
              showFacilities={showFacilities}
              showLandslides={showLandslides}
              onTileError={handleTileError}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-2xs uppercase tracking-[0.14em] text-faint">
              {loading ? "Loading district map…" : "No map data"}
            </span>
          </div>
        )}

        {tileError && (
          <div className="pointer-events-none absolute right-3 top-3 z-[1000] border border-moderate/40 bg-base/92 px-2.5 py-1.5">
            <p className="text-2xs text-muted">
              Basemap tiles unavailable — roads and facilities still shown.
            </p>
          </div>
        )}

        {/* Legend. Sits above the Leaflet panes but below the sticky header. */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000]">
          <div className="pointer-events-auto border border-line bg-base/92 px-3 py-2 backdrop-blur">
            <p className="eyebrow mb-1.5">Risk level</p>
            <ul className="space-y-1">
              {RISK_ORDER.map((level) => (
                <li key={level} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-0.5 w-5"
                    style={{ backgroundColor: RISK_COLORS[level] }}
                  />
                  <span className="font-mono text-2xs uppercase tracking-[0.1em] text-muted">
                    {level}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 hidden border-t border-line pt-1.5 sm:block">
              <p className="font-mono text-2xs text-faint">V village · H hospital · S school</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
