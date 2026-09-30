"use client";

import { RISK_CLASSES, riskColor } from "@/lib/risk";
import type { EnvironmentalEvidence, RiskDetail } from "@/lib/types";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "./StateViews";

/**
 * Risk detail for one road segment.
 *
 * Every value here comes from GET /api/risk/{id} — nothing is computed or
 * hard-coded in the browser, so what the operator reads is exactly what the
 * model produced.
 */

/** Display ranges for the evidence bars. Purely for scaling the bar width. */
const EVIDENCE_SCALE: Record<
  keyof Omit<EnvironmentalEvidence, "land_cover">,
  { label: string; unit: string; max: number }
> = {
  rainfall_24h: { label: "Rainfall 24h", unit: "mm", max: 250 },
  rainfall_72h: { label: "Rainfall 72h", unit: "mm", max: 500 },
  slope: { label: "Slope", unit: "°", max: 60 },
  soil_moisture: { label: "Soil moisture", unit: "%", max: 100 },
  historical_landslides: { label: "Historical landslides", unit: "", max: 15 },
  crack_reports: { label: "Crack reports", unit: "", max: 10 },
  elevation: { label: "Elevation", unit: "m", max: 3000 },
};

function EvidenceBar({
  label,
  value,
  unit,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  max: number;
}) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xs text-muted">{label}</span>
        <span className="stat text-xs font-medium text-ink">
          {value}
          {unit && <span className="ml-0.5 text-faint">{unit}</span>}
        </span>
      </div>
      {/* Neutral bars: these are raw measurements, not severity judgements,
          so they must not borrow the risk palette. */}
      <div className="mt-1 h-1 w-full bg-line/60">
        <div className="h-full bg-muted/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function LocationDetail({
  detail,
  loading,
  error,
  onRetry,
}: {
  detail: RiskDetail | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) return <LoadingBlock label="Running model" rows={7} />;
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />;
  if (!detail) {
    return (
      <EmptyBlock message="Select a road on the map or in the priority list to see its risk analysis." />
    );
  }

  const tone = RISK_CLASSES[detail.risk_level];
  const color = riskColor(detail.risk_level);

  return (
    <div className="space-y-5 p-4">
        {/* Score */}
        <div className="flex items-end gap-4">
          <div>
            <p className="eyebrow">Risk score</p>
            <p className={`stat text-5xl font-semibold leading-none ${tone.text}`}>
              {detail.risk_percentage}
              <span className="text-2xl">%</span>
            </p>
          </div>
          <div className="flex-1 pb-1">
            <div className="h-1.5 w-full bg-line/60">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${detail.risk_percentage}%`, backgroundColor: color }}
              />
            </div>
            <p className="mt-1.5 text-2xs text-faint">
              {detail.model} · {detail.scenario} conditions
            </p>
          </div>
        </div>

        {/* Evidence */}
        <div>
          <p className="eyebrow mb-2.5">Environmental evidence</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {(Object.keys(EVIDENCE_SCALE) as (keyof typeof EVIDENCE_SCALE)[]).map((key) => (
              <EvidenceBar
                key={key}
                label={EVIDENCE_SCALE[key].label}
                value={detail.evidence[key]}
                unit={EVIDENCE_SCALE[key].unit}
                max={EVIDENCE_SCALE[key].max}
              />
            ))}
          </div>
          <p className="mt-2.5 text-2xs text-faint">
            Land cover: <span className="text-muted">{detail.evidence.land_cover}</span>
          </p>
        </div>

        {/* Why risky */}
        <div>
          <p className="eyebrow mb-2.5">Why is this location risky?</p>
          <ul className="space-y-2">
            {detail.top_drivers.map((driver) => (
              <li key={driver.feature}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-ink">{driver.label}</span>
                  <span className="stat text-2xs text-muted">
                    {driver.contribution_pct}%
                  </span>
                </div>
                <div className="mt-1 h-1 w-full bg-line/60">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(100, driver.contribution_pct)}%`,
                      backgroundColor: color,
                      opacity: 0.75,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {/* Stated plainly: these are not SHAP values and must never be
              presented as if they were. */}
          <p className="mt-2.5 text-2xs leading-relaxed text-faint">
            {detail.explanation_note} Method: {detail.explanation_method}.
          </p>
        </div>

        {/* Actions — the point of the whole screen, so it gets a boxed
            treatment and a rule in the segment's risk colour rather than
            trailing off the bottom as a plain list. */}
        <div
          className="border-l-2 bg-ink/[0.04] p-3"
          style={{ borderLeftColor: color }}
        >
          <p className="eyebrow mb-2.5">Recommended actions</p>
          <ul className="space-y-1.5">
            {detail.recommended_actions.map((action) => (
              <li key={action} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 h-1 w-1 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs leading-relaxed text-ink">{action}</span>
              </li>
            ))}
          </ul>
        </div>
    </div>
  );
}
