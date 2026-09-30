"use client";

import { ArrowRight, FileCheck2, X } from "lucide-react";

import { RISK_CLASSES } from "@/lib/risk";
import type { ReportResponse } from "@/lib/types";

/**
 * Result of a submitted field report.
 *
 * This is the FIELD REPORT -> NEW EVIDENCE -> UPDATED RISK loop made explicit.
 * The before and after figures come straight from the API response, so the
 * arrow between them represents an actual re-run of the model on a changed
 * feature vector — not a UI animation over the same number.
 */
export default function ReportResultBanner({
  result,
  onDismiss,
  onExplain,
}: {
  result: ReportResponse;
  onDismiss: () => void;
  onExplain: () => void;
}) {
  const before = result.risk_before;
  const after = result.risk_after;
  const changed = result.risk_change !== 0;
  const toneAfter = RISK_CLASSES[after.risk_level];
  const toneBefore = RISK_CLASSES[before.risk_level];

  return (
    <div
      role="status"
      aria-live="polite"
      className="panel flex flex-wrap items-center gap-x-5 gap-y-3 border-l-2 border-l-ink/40 px-4 py-3"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">
            Report {result.report.id} recorded for {result.report.location_id}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{result.message}</p>
        </div>
      </div>

      {/* Evidence change */}
      <div className="flex items-center gap-2 border border-line px-3 py-1.5">
        <span className="eyebrow">Crack reports</span>
        <span className="stat text-sm text-muted">{result.crack_reports_before}</span>
        <ArrowRight className="h-3 w-3 text-faint" aria-hidden />
        <span className="stat text-sm font-semibold text-ink">
          {result.crack_reports_after}
        </span>
      </div>

      {/* Risk change */}
      <div className="flex items-center gap-2 border border-line px-3 py-1.5">
        <span className="eyebrow">Risk</span>
        <span className={`stat text-sm ${toneBefore.text} opacity-70`}>
          {before.risk_percentage}%
        </span>
        <ArrowRight className="h-3 w-3 text-faint" aria-hidden />
        <span className={`stat text-sm font-semibold ${toneAfter.text}`}>
          {after.risk_percentage}%
        </span>
        <span className={`font-mono text-2xs uppercase tracking-[0.12em] ${toneAfter.text}`}>
          {after.risk_level}
        </span>
        {changed && (
          <span className="stat text-2xs text-muted">
            {result.risk_change > 0 ? "+" : ""}
            {result.risk_change} pts
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onExplain}
          className="border border-line px-2.5 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-muted transition-colors hover:border-muted hover:text-ink"
        >
          Why did this change?
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss report result"
          className="border border-line p-1.5 text-faint transition-colors hover:border-muted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
