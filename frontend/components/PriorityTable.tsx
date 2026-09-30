"use client";

import { Network } from "lucide-react";

import { RISK_CLASSES, riskColor } from "@/lib/risk";
import type { RiskSummary } from "@/lib/types";
import RiskBadge from "./RiskBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "./StateViews";

/**
 * Priority Locations — the ranked worklist.
 *
 * Rank is the structural device here because the content genuinely is an
 * ordered queue: position 1 is what an officer should deal with first. The
 * severity bar behind each row encodes the same number as the percentage, so
 * the list can be scanned without reading any digits.
 */
export default function PriorityTable({
  rows,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  onAnalyseImpact,
}: {
  rows: RiskSummary[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (locationId: string) => void;
  onAnalyseImpact: (locationId: string) => void;
}) {
  return (
    <section className="panel flex min-h-0 flex-col" aria-label="Priority locations">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-ink">Priority locations</h2>
        <span className="eyebrow">{rows ? `${rows.length} segments` : "—"}</span>
      </div>

      {loading && <LoadingBlock
          label="Scoring segments"
          rows={6}
          hint="Running the model on every road. A sleeping free-tier API can take up to a minute on the first request."
        />}
      {!loading && error && <ErrorBlock message={error} onRetry={onRetry} />}
      {!loading && !error && rows?.length === 0 && (
        <EmptyBlock message="No road segments returned for this scenario." />
      )}

      {!loading && !error && rows && rows.length > 0 && (
        <ul className="min-h-0 flex-1 divide-y divide-line/60 overflow-y-auto">
          {rows.map((row, index) => {
            const selected = row.location_id === selectedId;
            const tone = RISK_CLASSES[row.risk_level];

            return (
              <li key={row.location_id} className="group relative">
                <button
                  onClick={() => onSelect(row.location_id)}
                  aria-current={selected ? "true" : undefined}
                  className={`relative w-full py-2.5 pl-4 pr-11 text-left transition-colors ${
                    selected ? "bg-ink/[0.07]" : "hover:bg-ink/[0.04]"
                  }`}
                >
                  {/* Severity magnitude as a background bar, drawn behind the
                      text at low opacity so it informs without shouting. */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 opacity-[0.13]"
                    style={{
                      width: `${row.risk_percentage}%`,
                      backgroundColor: riskColor(row.risk_level),
                    }}
                  />
                  {/* Left rule: always shown for CRITICAL so the worst
                      segments are scannable without reading percentages. */}
                  {(selected || row.risk_level === "CRITICAL") && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: selected ? 3 : 2,
                        backgroundColor: riskColor(row.risk_level),
                      }}
                    />
                  )}

                  <div className="relative flex items-center gap-3">
                    <span className="stat w-5 shrink-0 text-2xs text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="stat text-sm font-semibold text-ink">
                          {row.location_id}
                        </span>
                        <span className="truncate text-xs text-muted">{row.segment}</span>
                      </div>
                      <p className="mt-0.5 truncate text-2xs text-faint">
                        {row.recommended_action}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className={`stat text-base font-semibold ${tone.text}`}>
                        {row.risk_percentage}%
                      </span>
                      <RiskBadge level={row.risk_level} />
                    </div>
                  </div>
                </button>

                {/* Impact shortcut. Sits outside the row button because
                    nesting interactive elements breaks keyboard navigation. */}
                <button
                  onClick={() => onAnalyseImpact(row.location_id)}
                  title={`Analyze impact for ${row.location_id}`}
                  aria-label={`Analyze impact for ${row.location_id}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 border border-line bg-panel p-1.5 text-faint opacity-0 transition-opacity hover:border-muted hover:text-ink focus:opacity-100 group-hover:opacity-100"
                >
                  <Network className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
