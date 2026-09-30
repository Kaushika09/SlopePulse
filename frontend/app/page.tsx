"use client";

import { useCallback, useMemo, useState } from "react";

import AlertsPanel from "@/components/AlertsPanel";
import DetailPanel, { type DetailTab } from "@/components/DetailPanel";
import HazardReportForm from "@/components/HazardReportForm";
import Header from "@/components/Header";
import KpiCards, { EvidenceChain } from "@/components/KpiCards";
import MapPanel from "@/components/MapPanel";
import ModelPanel from "@/components/ModelPanel";
import PriorityTable from "@/components/PriorityTable";
import ReportResultBanner from "@/components/ReportResultBanner";
import ScenarioSimulator from "@/components/ScenarioSimulator";
import { API_BASE, API_URL_CONFIGURED, apiPost, useApi } from "@/lib/api";
import type {
  DashboardStats,
  DistrictInfo,
  Alert,
  Health,
  Hospital,
  ImpactAnalysis,
  LandslidePoint,
  Location,
  ModelMetrics,
  ReportResponse,
  RiskDetail,
  RiskSummary,
  Scenario,
  ScenarioId,
  School,
  Village,
} from "@/lib/types";

/**
 * Command Center.
 *
 * Every figure on this page is fetched from the FastAPI backend. Nothing is
 * hard-coded: change the scenario and the browser asks the API to re-score the
 * district, which re-runs the model server-side.
 */
export default function CommandCenter() {
  const [scenario, setScenario] = useState<ScenarioId>("NORMAL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("risk");
  const [reportOpen, setReportOpen] = useState(false);
  const [lastReport, setLastReport] = useState<ReportResponse | null>(null);
  /** Incremented whenever server-side evidence changes, to invalidate derived views. */
  const [evidenceVersion, setEvidenceVersion] = useState(0);

  // Static reference data — fetched once.
  const health = useApi<Health>("/api/health");
  const scenarios = useApi<Scenario[]>("/api/scenarios");
  const district = useApi<DistrictInfo>("/api/district");
  const roads = useApi<Location[]>("/api/locations");
  const villages = useApi<Village[]>("/api/villages");
  const hospitals = useApi<Hospital[]>("/api/hospitals");
  const schools = useApi<School[]>("/api/schools");
  const landslides = useApi<LandslidePoint[]>("/api/landslides");
  const model = useApi<ModelMetrics>("/api/model");

  // Scenario-dependent data — refetched whenever the scenario changes.
  const risks = useApi<RiskSummary[]>(`/api/risk?scenario=${scenario}`);
  const stats = useApi<DashboardStats>(`/api/stats?scenario=${scenario}`);
  const alerts = useApi<Alert[]>(`/api/alerts?scenario=${scenario}`);

  // Detail and impact are only requested when something is selected.
  const detail = useApi<RiskDetail>(
    selectedId ? `/api/risk/${selectedId}?scenario=${scenario}` : null,
  );
  const impact = useApi<ImpactAnalysis>(
    selectedId ? `/api/impact/${selectedId}?scenario=${scenario}` : null,
  );

  /** Selecting from map or list always opens on risk first. */
  const selectLocation = useCallback((locationId: string) => {
    setSelectedId(locationId);
    setTab("risk");
  }, []);

  /**
   * A submitted report changes a road's crack_reports on the server, so every
   * scenario-dependent view has to be refetched: the ranking, the KPI cards,
   * the stored terrain, and the open analysis panels. Refetching rather than
   * patching local state keeps the browser from ever holding a risk number the
   * model did not produce.
   */
  const handleReportSubmitted = useCallback(
    (result: ReportResponse) => {
      setLastReport(result);
      setEvidenceVersion((version) => version + 1);
      setSelectedId(result.report.location_id);
      setTab("risk");
      risks.reload();
      stats.reload();
      alerts.reload();
      roads.reload();
      detail.reload();
      impact.reload();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Clears session reports so the demo can be run again from a clean slate. */
  const resetSession = useCallback(async () => {
    try {
      await apiPost("/api/reports/reset", {});
    } catch {
      /* Non-fatal: the reload below will still show current server state. */
    }
    setLastReport(null);
    setEvidenceVersion((version) => version + 1);
    risks.reload();
    stats.reload();
    alerts.reload();
    roads.reload();
    detail.reload();
    impact.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "Analyze impact" jumps straight to the impact tab. */
  const analyseImpact = useCallback((locationId: string) => {
    setSelectedId(locationId);
    setTab("impact");
  }, []);

  /**
   * Evidence-chain progress. Stage advances as the operator moves through the
   * pipeline, so the product's logic is visible rather than narrated.
   */
  const chainStage = useMemo(() => {
    if (tab === "impact" && impact.data) return 4;
    if (detail.data) return 3;
    if (risks.data) return 2;
    if (roads.data) return 1;
    return 0;
  }, [tab, impact.data, detail.data, risks.data, roads.data]);

  const apiUnreachable = health.error !== null;

  // A deployed build with no NEXT_PUBLIC_API_URL points at the visitor's own
  // machine. Diagnose that specifically rather than letting it look like an
  // outage.
  const misconfigured =
    !API_URL_CONFIGURED && process.env.NODE_ENV === "production";

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        health={health.data}
        scenarios={scenarios.data ?? []}
        scenario={scenario}
        onScenarioChange={setScenario}
        districtName={district.data?.name}
        onReportHazard={() => setReportOpen(true)}
        onResetSession={resetSession}
      />

      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-3 px-4 py-4 lg:px-6">
        {/* A dead backend is the single most likely demo failure, so it gets
            an explicit banner naming the URL that failed. */}
        {misconfigured && (
          <div className="border border-moderate/40 bg-moderate/10 px-4 py-3">
            <p className="text-sm font-medium text-ink">API URL not configured</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              This build has no NEXT_PUBLIC_API_URL, so it is falling back to{" "}
              <code className="stat text-ink">{API_BASE}</code>, which points at
              your own machine. Set NEXT_PUBLIC_API_URL to the backend URL in
              Vercel → Settings → Environment Variables, then redeploy.
            </p>
          </div>
        )}

        {apiUnreachable && !misconfigured && (
          <div className="border border-critical/40 bg-critical/10 px-4 py-3">
            <p className="text-sm font-medium text-ink">Backend not reachable</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {health.error} Currently pointing at{" "}
              <code className="stat text-ink">{API_BASE}</code>. Start the API with{" "}
              <code className="stat text-ink">uvicorn backend.main:app --port 8000</code>{" "}
              or set NEXT_PUBLIC_API_URL.
            </p>
          </div>
        )}

        <KpiCards
          stats={stats.data}
          loading={stats.loading}
          error={stats.error}
          onRetry={stats.reload}
        />

        {lastReport && (
          <ReportResultBanner
            result={lastReport}
            onDismiss={() => setLastReport(null)}
            onExplain={() => {
              setSelectedId(lastReport.report.location_id);
              setTab("risk");
            }}
          />
        )}

        <EvidenceChain stage={chainStage} />

        <ScenarioSimulator
          scenarios={scenarios.data ?? []}
          active={scenario}
          onChange={setScenario}
          selectedId={selectedId}
          refreshKey={evidenceVersion}
        />

        {/* Map + worklist. On wide screens the map dominates and the list sits
            beside it; below lg everything stacks in reading order. */}
        <div
          className={`grid min-h-0 gap-3 ${
            selectedId
              ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.95fr)]"
              : "lg:grid-cols-[minmax(0,1.9fr)_minmax(340px,0.75fr)]"
          }`}
        >
          <div className="min-h-0 lg:h-[calc(100vh-300px)] lg:min-h-[560px]">
            <MapPanel
              district={district.data}
              roads={roads.data ?? []}
              risks={risks.data ?? []}
              villages={villages.data ?? []}
              hospitals={hospitals.data ?? []}
              schools={schools.data ?? []}
              landslides={landslides.data ?? []}
              selectedId={selectedId}
              onSelect={selectLocation}
              loading={district.loading}
              error={district.error}
              onRetry={district.reload}
            />
          </div>

          <div className="flex min-h-0 flex-col gap-3 lg:h-[calc(100vh-300px)] lg:min-h-[560px]">
            {selectedId ? (
              <>
                <div className="min-h-[520px] flex-[1.75] lg:min-h-0">
                  <DetailPanel
                    locationId={selectedId}
                    detail={detail.data}
                    detailLoading={detail.loading}
                    detailError={detail.error}
                    onDetailRetry={detail.reload}
                    impact={impact.data}
                    impactLoading={impact.loading}
                    impactError={impact.error}
                    onImpactRetry={impact.reload}
                    tab={tab}
                    onTabChange={setTab}
                    onClose={() => setSelectedId(null)}
                  />
                </div>
                <div className="min-h-0 flex-1">
                  <PriorityTable
                    rows={risks.data}
                    loading={risks.loading}
                    error={risks.error}
                    onRetry={risks.reload}
                    selectedId={selectedId}
                    onSelect={selectLocation}
                    onAnalyseImpact={analyseImpact}
                  />
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1">
                <PriorityTable
                  rows={risks.data}
                  loading={risks.loading}
                  error={risks.error}
                  onRetry={risks.reload}
                  selectedId={selectedId}
                  onSelect={selectLocation}
                  onAnalyseImpact={analyseImpact}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="max-h-[320px]">
            <AlertsPanel
              alerts={alerts.data}
              loading={alerts.loading}
              error={alerts.error}
              onRetry={alerts.reload}
              onSelect={selectLocation}
            />
          </div>
          <ModelPanel
            metrics={model.data}
            loading={model.loading}
            error={model.error}
            onRetry={model.reload}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 pb-2 pt-1">
          <p className="text-2xs leading-relaxed text-faint">
            {district.data?.disclaimer ??
              "Prototype / Simulated Data. Not an official assessment."}
          </p>
          <p className="font-mono text-2xs text-faint">
            {health.data?.model_algorithm ?? "model"} · API v{health.data?.api_version ?? "—"}
          </p>
        </footer>
      </main>

      <HazardReportForm
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        roads={roads.data ?? []}
        defaultLocationId={selectedId}
        scenario={scenario}
        onSubmitted={handleReportSubmitted}
      />
    </div>
  );
}
