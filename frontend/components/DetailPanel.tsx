"use client";

import { X } from "lucide-react";

import type { ImpactAnalysis, RiskDetail } from "@/lib/types";
import ImpactPanel from "./ImpactPanel";
import LocationDetail from "./LocationDetail";
import RiskBadge from "./RiskBadge";

export type DetailTab = "risk" | "impact";

/**
 * Detail surface for one road.
 *
 * Risk analysis and impact analysis share a panel because they answer two
 * halves of the same question — how likely is failure, and what does failure
 * cost. Tabs keep the layout stable so the map never resizes when an operator
 * switches between them.
 */
export default function DetailPanel({
  locationId,
  detail,
  detailLoading,
  detailError,
  onDetailRetry,
  impact,
  impactLoading,
  impactError,
  onImpactRetry,
  tab,
  onTabChange,
  onClose,
}: {
  locationId: string;
  detail: RiskDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onDetailRetry: () => void;
  impact: ImpactAnalysis | null;
  impactLoading: boolean;
  impactError: string | null;
  onImpactRetry: () => void;
  tab: DetailTab;
  onTabChange: (next: DetailTab) => void;
  onClose: () => void;
}) {
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "risk", label: "Risk analysis" },
    { id: "impact", label: "Impact analysis" },
  ];

  return (
    <section
      className="panel flex min-h-0 flex-col"
      aria-label={`Analysis for ${locationId}`}
    >
      <div className="border-b border-line">
        <div className="flex items-start justify-between gap-3 px-4 pt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="stat text-base font-semibold text-ink">{locationId}</h2>
              {detail && <RiskBadge level={detail.risk_level} size="lg" />}
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              {detail?.segment ?? "Loading segment…"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close analysis"
            className="shrink-0 border border-line p-1.5 text-faint transition-colors hover:border-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="mt-3 flex px-4" role="tablist" aria-label="Analysis view">
          {tabs.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(item.id)}
                className={`-mb-px border-b-2 px-3 py-2 font-mono text-2xs uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-faint hover:text-muted"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel">
        {tab === "risk" ? (
          <LocationDetail
            detail={detail}
            loading={detailLoading}
            error={detailError}
            onRetry={onDetailRetry}
          />
        ) : (
          <ImpactPanel
            impact={impact}
            loading={impactLoading}
            error={impactError}
            onRetry={onImpactRetry}
            recommendedActions={detail?.recommended_actions ?? []}
          />
        )}
      </div>
    </section>
  );
}
