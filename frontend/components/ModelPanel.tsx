"use client";

import { Cpu } from "lucide-react";

import type { ModelMetrics } from "@/lib/types";
import { ErrorBlock, LoadingBlock } from "./StateViews";

/**
 * Model performance.
 *
 * Every figure is read from GET /api/model, which serves the metrics written
 * by ml/train_model.py at training time. Nothing here is hard-coded, so if the
 * model is retrained the panel follows automatically — and a judge asking
 * "where do these numbers come from?" has a traceable answer.
 *
 * Kept deliberately small: it exists to support technical credibility during a
 * presentation, not to compete with the operational panels above it.
 */

/**
 * NOTE: this wording was supplied verbatim in the brief. "NER data" is very
 * likely a typo for landslide/labelled inventory data — see the handover notes.
 */
const DISCLAIMER =
  "Prototype model trained on simulated/historical-style data. Metrics are " +
  "indicative and require validation with locally labelled NER data.";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-2.5 py-2">
      <p className="eyebrow leading-tight">{label}</p>
      <p className="stat mt-1 text-lg font-semibold leading-none text-ink">{value}</p>
    </div>
  );
}

/** API returns proportions (0.8458); the UI shows percentages. */
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ModelPanel({
  metrics,
  loading,
  error,
  onRetry,
}: {
  metrics: ModelMetrics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="panel flex flex-col" aria-label="Model performance">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-faint" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Model performance
          </h2>
        </div>
        {metrics && (
          <span className="eyebrow">{metrics.algorithm}</span>
        )}
      </div>

      {loading && <LoadingBlock label="Loading model metrics" rows={2} />}
      {!loading && error && <ErrorBlock message={error} onRetry={onRetry} />}

      {!loading && !error && metrics && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Accuracy" value={pct(metrics.accuracy)} />
            <Metric label="Precision" value={pct(metrics.precision)} />
            <Metric label="Recall" value={pct(metrics.recall)} />
            <Metric label="F1 score" value={pct(metrics.f1)} />
            <Metric label="ROC AUC" value={pct(metrics.roc_auc)} />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <p className="text-2xs text-faint">
              Held-out test set:{" "}
              <span className="stat text-muted">{metrics.n_test}</span> of{" "}
              <span className="stat text-muted">{metrics.n_total}</span> records
            </p>
            <p className="text-2xs text-faint">
              Alert threshold:{" "}
              <span className="stat text-muted">{metrics.decision_threshold}</span>
            </p>
          </div>

          <p className="mt-3 border-t border-line pt-2.5 text-2xs leading-relaxed text-faint">
            {DISCLAIMER}
          </p>
        </div>
      )}
    </section>
  );
}
