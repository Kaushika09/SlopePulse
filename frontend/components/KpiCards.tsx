"use client";

import { AlertOctagon, Route, TriangleAlert, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/risk";
import type { DashboardStats } from "@/lib/types";
import { ErrorBlock } from "./StateViews";

interface CardSpec {
  key: keyof DashboardStats | "roads";
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  /** Only alerts carry severity colour — see the colour discipline note. */
  tone?: "critical" | "high" | null;
}

function Card({ spec, loading }: { spec: CardSpec; loading: boolean }) {
  const Icon = spec.icon;
  const toneClass =
    spec.tone === "critical"
      ? "text-critical"
      : spec.tone === "high"
        ? "text-high"
        : "text-ink";

  const alarmed = spec.tone === "critical";

  return (
    <div
      className={`panel flex items-start justify-between gap-3 p-4 ${
        alarmed ? "border-critical/60 bg-critical/[0.07] slopepulse-alarm" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="eyebrow">{spec.label}</p>
        {loading ? (
          <div className="mt-2 h-8 w-16 animate-pulse rounded-sm bg-line/50" />
        ) : (
          <p className={`stat mt-1.5 text-3xl font-semibold leading-none ${toneClass}`}>
            {spec.value}
          </p>
        )}
        <p className="mt-2 truncate text-2xs text-faint">{spec.sub}</p>
      </div>
      <Icon
        className={`h-4 w-4 shrink-0 ${alarmed ? "text-critical" : "text-faint"}`}
        aria-hidden
      />
    </div>
  );
}

export default function KpiCards({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="panel">
        <ErrorBlock message={error} onRetry={onRetry} />
      </div>
    );
  }

  const cards: CardSpec[] = [
    {
      key: "critical_alerts",
      label: "Critical alerts",
      value: String(stats?.critical_alerts ?? 0),
      sub: "Roads at 76% risk or above",
      icon: AlertOctagon,
      tone: stats && stats.critical_alerts > 0 ? "critical" : null,
    },
    {
      key: "high_risk_locations",
      label: "High risk locations",
      value: String(stats?.high_risk_locations ?? 0),
      sub: "Roads between 51% and 75%",
      icon: TriangleAlert,
      tone: stats && stats.high_risk_locations > 0 ? "high" : null,
    },
    {
      key: "roads",
      label: "Roads at risk",
      value: `${stats?.roads_at_risk ?? 0}/${stats?.total_roads ?? 0}`,
      sub: "Moderate or above, of all monitored segments",
      icon: Route,
    },
    {
      key: "population_potentially_affected",
      label: "Population potentially affected",
      value: formatNumber(stats?.population_potentially_affected ?? 0),
      sub: "Residents served by high-risk roads",
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((spec) => (
        <Card key={spec.key} spec={spec} loading={loading} />
      ))}
    </div>
  );
}

/**
 * The evidence chain — the signature element of this interface.
 *
 * Section 23 of the brief asks that the product's value be *visible*, not just
 * described in the pitch. This strip lights each stage as the operator
 * completes it, so the pipeline from raw evidence to a recommended action is
 * legible on screen rather than something the presenter has to narrate.
 */
export function EvidenceChain({ stage }: { stage: number }) {
  const stages = [
    "Multi-source evidence",
    "ML risk score",
    "Priority ranking",
    "Infrastructure impact",
    "Recommended action",
  ];

  return (
    <div className="panel flex flex-wrap items-center gap-x-1 gap-y-2 px-4 py-2.5">
      {stages.map((label, index) => {
        const reached = index <= stage;
        return (
          <div key={label} className="flex items-center gap-1">
            <span
              className={`font-mono text-2xs uppercase tracking-[0.14em] transition-colors ${
                reached ? "text-ink" : "text-faint/60"
              }`}
            >
              {label}
            </span>
            {index < stages.length - 1 && (
              <span
                aria-hidden
                className={`px-1.5 text-2xs ${reached ? "text-muted" : "text-faint/40"}`}
              >
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
