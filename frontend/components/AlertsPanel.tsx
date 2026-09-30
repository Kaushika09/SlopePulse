"use client";

import { BellRing } from "lucide-react";

import { RISK_CLASSES, formatNumber, riskColor } from "@/lib/risk";
import type { Alert } from "@/lib/types";
import RiskBadge from "./RiskBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "./StateViews";

/**
 * Active alerts — roads scored HIGH or above under the current scenario.
 *
 * Backed entirely by the existing GET /api/alerts, which already resolves
 * impact context and the recommendation rules server-side. This is a view over
 * that endpoint, not a second alerting subsystem: the risk band, the affected
 * population and the actions are the same ones the detail panel shows.
 */
export default function AlertsPanel({
  alerts,
  loading,
  error,
  onRetry,
  onSelect,
}: {
  alerts: Alert[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (locationId: string) => void;
}) {
  const criticalCount = alerts?.filter((a) => a.risk_level === "CRITICAL").length ?? 0;

  return (
    <section className="panel flex min-h-0 flex-col" aria-label="Active alerts">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <BellRing
            className={`h-3.5 w-3.5 ${criticalCount > 0 ? "text-critical" : "text-faint"}`}
            aria-hidden
          />
          <h2 className="text-sm font-semibold tracking-tight text-ink">Active alerts</h2>
        </div>
        <span className="eyebrow">
          {alerts ? `${alerts.length} at HIGH or above` : "—"}
        </span>
      </div>

      {loading && <LoadingBlock label="Evaluating alerts" rows={3} />}
      {!loading && error && <ErrorBlock message={error} onRetry={onRetry} />}
      {!loading && !error && alerts?.length === 0 && (
        <EmptyBlock message="No roads are at HIGH risk or above under the current conditions." />
      )}

      {!loading && !error && alerts && alerts.length > 0 && (
        <ul className="min-h-0 flex-1 divide-y divide-line/60 overflow-y-auto">
          {alerts.map((alert) => {
            const tone = RISK_CLASSES[alert.risk_level];
            return (
              <li key={alert.location_id}>
                <button
                  onClick={() => onSelect(alert.location_id)}
                  className="relative w-full px-4 py-2.5 text-left transition-colors hover:bg-ink/[0.04]"
                >
                  {alert.risk_level === "CRITICAL" && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[2px]"
                      style={{ backgroundColor: riskColor(alert.risk_level) }}
                    />
                  )}

                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="stat text-sm font-semibold text-ink">
                          {alert.location_id}
                        </span>
                        <span className="truncate text-xs text-muted">{alert.segment}</span>
                      </div>
                      {/* First action only: the full list lives in the detail
                          panel, and an alert row needs the single next step. */}
                      <p className="mt-0.5 truncate text-2xs text-faint">
                        {alert.recommended_actions[0] ?? "Review segment"}
                        {alert.population_at_risk > 0 &&
                          ` · ${formatNumber(alert.population_at_risk)} people served`}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className={`stat text-base font-semibold ${tone.text}`}>
                        {alert.risk_percentage}%
                      </span>
                      <RiskBadge level={alert.risk_level} />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
