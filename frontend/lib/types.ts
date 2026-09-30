/**
 * Types mirroring the backend Pydantic models in backend/models.py.
 * Keep these in sync — they are the contract between the two services.
 */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type ScenarioId = "NORMAL" | "HEAVY" | "EXTREME";

export interface Health {
  status: string;
  api_version: string;
  model_loaded: boolean;
  model_algorithm: string | null;
  district_loaded: boolean;
  prototype: boolean;
  notice: string;
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  rainfall_24h: number;
  rainfall_72h: number;
  soil_moisture: number;
}

export interface DistrictInfo {
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
  disclaimer: string;
}

export interface Terrain {
  slope: number;
  elevation: number;
  land_cover: string;
  historical_landslides: number;
  crack_reports: number;
  rain_exposure: number;
}

export interface Location {
  id: string;
  name: string;
  segment: string;
  description: string;
  path: [number, number][];
  terrain: Terrain;
}

export interface Village {
  id: string;
  name: string;
  population: number;
  coords: [number, number];
}

export interface Hospital {
  id: string;
  name: string;
  type: string;
  beds: number;
  coords: [number, number];
}

export interface School {
  id: string;
  name: string;
  students: number;
  coords: [number, number];
}

export interface LandslidePoint {
  id: string;
  year: number;
  road_id: string;
  coords: [number, number];
  volume_m3: number;
}

export interface RiskSummary {
  location_id: string;
  name: string;
  segment: string;
  scenario: ScenarioId;
  risk_probability: number;
  risk_percentage: number;
  risk_level: RiskLevel;
  recommended_action: string;
}

export interface EnvironmentalEvidence {
  rainfall_24h: number;
  rainfall_72h: number;
  slope: number;
  soil_moisture: number;
  historical_landslides: number;
  crack_reports: number;
  elevation: number;
  land_cover: string;
}

export interface FeatureContribution {
  feature: string;
  label: string;
  unit: string;
  value: number | string;
  delta: number;
  contribution_pct: number;
  direction: string;
}

export interface RiskDetail {
  location_id: string;
  name: string;
  segment: string;
  description: string;
  scenario: ScenarioId;
  risk_probability: number;
  risk_percentage: number;
  risk_level: RiskLevel;
  model: string;
  evidence: EnvironmentalEvidence;
  explanation_method: string;
  explanation_note: string;
  top_drivers: FeatureContribution[];
  reasons: string[];
  recommended_actions: string[];
}

export interface DashboardStats {
  scenario: ScenarioId;
  critical_alerts: number;
  high_risk_locations: number;
  roads_at_risk: number;
  total_roads: number;
  population_potentially_affected: number;
}

export interface ImpactNode {
  id: string;
  name: string;
  type: "village" | "hospital" | "school" | "supply_route";
  detail: string;
}

export interface ImpactAnalysis {
  location_id: string;
  name: string;
  scenario: ScenarioId;
  risk_percentage: number;
  risk_level: RiskLevel;
  villages_affected: number;
  hospitals_affected: number;
  schools_affected: number;
  supply_routes_disrupted: number;
  population_isolated: number;
  students_affected: number;
  hospital_beds_cut_off: number;
  nodes: ImpactNode[];
  summary: string;
}

export interface SimulateResponse {
  scenario: Scenario;
  stats: DashboardStats;
  results: RiskSummary[];
}

export const HAZARD_TYPES = [
  "New crack",
  "Rockfall",
  "Water seepage",
  "Road deformation",
  "Small landslide",
] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

export const SEVERITIES = ["Low", "Medium", "High"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface HazardReport {
  id: string;
  location_id: string;
  hazard_type: HazardType;
  severity: Severity;
  description: string;
  reporter: string;
  submitted_at: string;
  has_photo: boolean;
  increments_crack_count: boolean;
}

/** Carries the whole field-report -> new-evidence -> updated-risk loop. */
export interface ReportResponse {
  report: HazardReport;
  crack_reports_before: number;
  crack_reports_after: number;
  risk_before: RiskSummary;
  risk_after: RiskSummary;
  risk_change: number;
  message: string;
}

/** GET /api/model — prototype held-out metrics. */
export interface ModelMetrics {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  confusion_matrix: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
  n_total: number;
  n_train: number;
  n_test: number;
  decision_threshold: number;
  disclaimer: string;
  feature_importance: Record<string, number>;
}

/** GET /api/alerts — roads at HIGH or above, with impact context. */
export interface Alert {
  location_id: string;
  name: string;
  segment: string;
  risk_percentage: number;
  risk_level: RiskLevel;
  population_at_risk: number;
  hospitals_affected: number;
  headline: string;
  recommended_actions: string[];
}
