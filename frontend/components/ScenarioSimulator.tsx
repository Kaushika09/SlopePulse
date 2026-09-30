"use client";

import { useEffect, useState } from "react";
import { CloudRain, Droplets, Loader2 } from "lucide-react";

import { apiPost } from "@/lib/api";
import { RISK_CLASSES, riskColor } from "@/lib/risk";
import type { RiskLevel, Scenario, ScenarioId, SimulateResponse } from "@/lib/types";

/**
 * Scenario Simulator.
 *
 * Switching a scenario does NOT reformat numbers already in the browser. It
 * sends the scenario to POST /api/simulate, the backend rebuilds each road's
 * feature vector from that scenario's rainfall and soil moisture, and the
 * XGBoost model scores it again. Every percentage on screen is a fresh
 * prediction — which is why the progression strip below can legitimately be
 * pointed at during a demo.
 */

const ORDER: ScenarioId[] = ["NORMAL", "HEAVY", "EXTREME"];

interface Progression {
  scenario: ScenarioId;
  percentage: number;
  level: RiskLevel;
}

/**
 * Scores one road under all three scenarios so the operator can see where a
 * segment is heading, not just where it is now.
 */
function useProgression(locationId: string | null, refreshKey: number) {
  const [data, setData] = useState<Progression[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      ORDER.map((scenario) =>
        apiPost<SimulateResponse>("/api/simulate", {
          scenario,
          location_id: locationId,
        }),
      ),
    )
      .then((responses) => {
        if (cancelled) return;
        setData(
          responses.map((response, index) => ({
            scenario: ORDER[index],
            percentage: response.results[0]?.risk_percentage ?? 0,
            level: response.results[0]?.risk_level ?? "LOW",
          })),
        );
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, refreshKey]);

  return { data, loading, error };
}

export default function ScenarioSimulator({
  scenarios,
  active,
  onChange,
  selectedId,
  refreshKey = 0,
}: {
  scenarios: Scenario[];
  active: ScenarioId;
  onChange: (next: ScenarioId) => void;
  selectedId: string | null;
  /** Bump to re-run the projections, e.g. after a field report changes evidence. */
  refreshKey?: number;
}) {
  const progression = useProgression(selectedId, refreshKey);

  return (
    <section className="panel" aria-label="Scenario simulation">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Scenario simulation
          </h2>
          <p className="mt-0.5 text-2xs text-faint">
            Changing conditions re-runs the model on the server — no stored results
          </p>
        </div>
        <span className="eyebrow">Normal → Heavy → Extreme</span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* Scenario cards: the environmental inputs the model will receive. */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {scenarios.map((option) => {
            const isActive = option.id === active;
            return (
              <button
                key={option.id}
                onClick={() => onChange(option.id)}
                aria-pressed={isActive}
                className={`border p-3 text-left transition-colors ${
                  isActive
                    ? "border-muted bg-ink/[0.07]"
                    : "border-line hover:border-muted/60 hover:bg-ink/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-2xs uppercase tracking-[0.14em] ${
                      isActive ? "text-ink" : "text-faint"
                    }`}
                  >
                    {option.id}
                  </span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden />
                  )}
                </div>

                <p className="mt-1.5 text-xs font-medium text-ink">{option.label}</p>
                <p className="mt-1 text-2xs leading-relaxed text-faint">
                  {option.description}
                </p>

                <dl className="mt-2.5 space-y-1 border-t border-line pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1 text-2xs text-muted">
                      <CloudRain className="h-3 w-3" aria-hidden />
                      Rain 24h
                    </dt>
                    <dd className="stat text-2xs text-ink">{option.rainfall_24h} mm</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1 text-2xs text-muted">
                      <CloudRain className="h-3 w-3" aria-hidden />
                      Rain 72h
                    </dt>
                    <dd className="stat text-2xs text-ink">{option.rainfall_72h} mm</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1 text-2xs text-muted">
                      <Droplets className="h-3 w-3" aria-hidden />
                      Soil moisture
                    </dt>
                    <dd className="stat text-2xs text-ink">{option.soil_moisture}%</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>

        {/* Progression for the selected road. */}
        <div className="border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">
              {selectedId ? `${selectedId} across scenarios` : "Segment projection"}
            </p>
            {progression.loading && (
              <Loader2 className="h-3 w-3 animate-spin text-faint" aria-hidden />
            )}
          </div>

          {!selectedId && (
            <p className="mt-3 text-2xs leading-relaxed text-faint">
              Select a road to see how its risk moves from normal conditions through
              to an extreme rainfall event.
            </p>
          )}

          {progression.error && (
            <p className="mt-3 text-2xs leading-relaxed text-critical">
              {progression.error}
            </p>
          )}

          {progression.data && (
            <ul className="mt-3 space-y-2.5">
              {progression.data.map((step) => {
                const isActive = step.scenario === active;
                const tone = RISK_CLASSES[step.level];
                return (
                  <li key={step.scenario}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`font-mono text-2xs uppercase tracking-[0.12em] ${
                          isActive ? "text-ink" : "text-faint"
                        }`}
                      >
                        {step.scenario}
                      </span>
                      <span className={`stat text-xs font-semibold ${tone.text}`}>
                        {step.percentage}%
                        <span className="ml-1.5 text-2xs font-normal">{step.level}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-line/60">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${step.percentage}%`,
                          backgroundColor: riskColor(step.level),
                          opacity: isActive ? 1 : 0.5,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
