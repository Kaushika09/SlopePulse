"use client";

import { Activity, Mountain, RotateCcw, Siren } from "lucide-react";
import type { Health, Scenario, ScenarioId } from "@/lib/types";

/**
 * Command-centre header.
 *
 * Carries three things an operator needs permanently visible: what they are
 * looking at, whether the system is actually live, and which weather scenario
 * the numbers on screen belong to.
 */
export default function Header({
  health,
  scenarios,
  scenario,
  onScenarioChange,
  districtName,
  onReportHazard,
  onResetSession,
}: {
  health: Health | null;
  scenarios: Scenario[];
  scenario: ScenarioId;
  onScenarioChange: (next: ScenarioId) => void;
  districtName?: string;
  onReportHazard: () => void;
  onResetSession: () => void;
}) {
  const online = health?.model_loaded && health?.district_loaded;

  return (
    <header className="sticky top-0 z-[1100] border-b border-line bg-base/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-panel">
            <Mountain className="h-4 w-4 text-muted" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold leading-none tracking-tight text-ink">
                SlopePulse
              </h1>
              <span className="border border-line px-1.5 py-0.5 font-mono text-2xs uppercase tracking-[0.12em] text-faint">
                Prototype • Simulated Data
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              AI Landslide Early Warning &amp; Response
              {districtName ? ` — ${districtName}` : ""}
            </p>
          </div>
        </div>

        {/* Scenario switcher + status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="eyebrow hidden sm:inline">Conditions</span>
            <div
              className="flex border border-line"
              role="group"
              aria-label="Weather scenario"
            >
              {scenarios.map((option) => {
                const active = option.id === scenario;
                return (
                  <button
                    key={option.id}
                    onClick={() => onScenarioChange(option.id)}
                    aria-pressed={active}
                    title={option.description}
                    className={`px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] transition-colors ${
                      active
                        ? "bg-ink/10 text-ink"
                        : "text-faint hover:bg-ink/5 hover:text-muted"
                    }`}
                  >
                    {option.id}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={onReportHazard}
            className="inline-flex items-center gap-1.5 border border-muted bg-ink/10 px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink/20"
          >
            <Siren className="h-3 w-3" aria-hidden />
            Report hazard
          </button>

          <button
            onClick={onResetSession}
            title="Clear submitted reports and restore original crack counts"
            aria-label="Reset demo session"
            className="border border-line p-1.5 text-faint transition-colors hover:border-muted hover:text-ink"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
          </button>

          <div
            className="flex items-center gap-1.5 border border-line px-2 py-1.5"
            title={health?.model_algorithm ?? "Checking API"}
          >
            <Activity
              className={`h-3 w-3 ${online ? "text-low" : "text-critical"}`}
              aria-hidden
            />
            <span className="font-mono text-2xs uppercase tracking-[0.12em] text-muted">
              {online ? "API live" : health ? "Degraded" : "Connecting"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
