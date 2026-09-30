"use client";

import {
  Building2,
  GraduationCap,
  Home,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatNumber, riskColor } from "@/lib/risk";
import type { ImpactAnalysis, ImpactNode } from "@/lib/types";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "./StateViews";

/**
 * Impact Analysis — the question a risk score alone cannot answer:
 * if this road fails, who loses access to what?
 *
 * Counts and dependencies come from GET /api/impact/{id}, which resolves the
 * deterministic road-to-infrastructure map on the server. The panel renders
 * the relationship as a tree so the dependency is legible at a glance rather
 * than buried in a table.
 */

const NODE_ICONS: Record<ImpactNode["type"], LucideIcon> = {
  village: Home,
  hospital: Building2,
  school: GraduationCap,
  supply_route: Truck,
};

const NODE_LABELS: Record<ImpactNode["type"], string> = {
  village: "Village",
  hospital: "Hospital",
  school: "School",
  supply_route: "Supply route",
};

function CountTile({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="border border-line px-2.5 py-2">
      <p className="eyebrow leading-tight">{label}</p>
      <p
        className={`stat mt-1 font-semibold leading-none ${
          emphasis ? "text-xl text-ink" : "text-lg text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function ImpactPanel({
  impact,
  loading,
  error,
  onRetry,
  recommendedActions,
}: {
  impact: ImpactAnalysis | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  recommendedActions: string[];
}) {
  if (loading) return <LoadingBlock label="Resolving dependencies" rows={6} />;
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />;
  if (!impact) {
    return <EmptyBlock message="Select a road to analyse what its failure would cut off." />;
  }

  const color = riskColor(impact.risk_level);
  const nothingAffected = impact.nodes.length === 0;

  return (
    <div className="space-y-5 p-4">
      {/* Headline consequence */}
      <div>
        <p className="eyebrow">If {impact.location_id} fails</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink">{impact.summary}</p>
      </div>

      {nothingAffected ? (
        <p className="text-xs leading-relaxed text-muted">
          No settlements or facilities depend solely on this segment. A failure here
          would disrupt traffic but not isolate anyone in the modelled network.
        </p>
      ) : (
        <>
          {/* Counts */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CountTile label="Villages" value={String(impact.villages_affected)} />
            <CountTile label="Hospitals" value={String(impact.hospitals_affected)} />
            <CountTile label="Schools" value={String(impact.schools_affected)} />
            <CountTile label="Supply routes" value={String(impact.supply_routes_disrupted)} />
          </div>

          {/* Population — the number that turns a score into a decision, so it
              gets its own emphasis rather than sitting in the grid above. */}
          <div
            className="flex items-center gap-3 border px-3 py-2.5"
            style={{ borderColor: `${color}55`, backgroundColor: `${color}12` }}
          >
            <Users className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="stat text-2xl font-semibold leading-none text-ink">
                {formatNumber(impact.population_isolated)}
              </p>
              <p className="mt-1 text-2xs text-muted">
                people potentially isolated
                {impact.hospital_beds_cut_off > 0 &&
                  ` · ${impact.hospital_beds_cut_off} hospital beds cut off`}
                {impact.students_affected > 0 &&
                  ` · ${formatNumber(impact.students_affected)} students`}
              </p>
            </div>
          </div>

          {/* Supply corridors: called out separately because a severed supply
              route is a district-level logistics problem, not just a local one. */}
          {impact.supply_routes_disrupted > 0 && (
            <div>
              <p className="eyebrow mb-2">Supply corridors disrupted</p>
              <ul className="space-y-1.5">
                {impact.nodes
                  .filter((node) => node.type === "supply_route")
                  .map((node) => (
                    <li
                      key={node.id}
                      className="flex items-center gap-2 border border-line px-2.5 py-2"
                    >
                      <Truck className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                      <span className="flex-1 truncate text-xs text-ink">{node.name}</span>
                      <span className="stat text-2xs uppercase tracking-[0.1em] text-muted">
                        {node.detail}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Dependency tree */}
          <div>
            <p className="eyebrow mb-2.5">Dependent infrastructure</p>
            <div className="border-l border-line pl-0">
              <div className="flex items-center gap-2 pb-1 pl-3">
                <span
                  aria-hidden
                  className="-ml-[13px] h-2 w-2 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="stat text-sm font-semibold text-ink">
                  {impact.location_id}
                </span>
                <span className="text-2xs text-faint">{impact.name}</span>
              </div>

              <ul>
                {impact.nodes.map((node) => {
                  const Icon = NODE_ICONS[node.type];
                  return (
                    <li key={`${node.type}-${node.id}`} className="relative pl-3">
                      {/* Elbow connector drawn in CSS rather than as an image
                          so it inherits the border colour and scales cleanly. */}
                      <span
                        aria-hidden
                        className="absolute left-0 top-0 h-[15px] w-3 border-b border-l border-line"
                      />
                      <div className="flex items-center gap-2 py-1 pl-1">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                        <span className="text-xs text-ink">{node.name}</span>
                        <span className="text-2xs text-faint">
                          {NODE_LABELS[node.type]} · {node.detail}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Actions repeated here on purpose: an officer reading the impact tab is
          deciding what to do, and should not have to switch tabs to find out. */}
      {recommendedActions.length > 0 && (
        <div className="border-l-2 bg-ink/[0.04] p-3" style={{ borderLeftColor: color }}>
          <p className="eyebrow mb-2.5">Recommended actions</p>
          <ul className="space-y-1.5">
            {recommendedActions.map((action) => (
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
      )}
    </div>
  );
}
