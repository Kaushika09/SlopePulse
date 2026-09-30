"""
SlopePulse backend - Pydantic models.

These define the API contract the Next.js frontend will code against, so the
frontend never has to guess at a field name or shape.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ScenarioId(str, Enum):
    NORMAL = "NORMAL"
    HEAVY = "HEAVY"
    EXTREME = "EXTREME"


class HazardType(str, Enum):
    NEW_CRACK = "New crack"
    ROCKFALL = "Rockfall"
    WATER_SEEPAGE = "Water seepage"
    ROAD_DEFORMATION = "Road deformation"
    SMALL_LANDSLIDE = "Small landslide"


class Severity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


# ---------------------------------------------------------------------------
# Core / meta
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"
    api_version: str
    model_loaded: bool
    model_algorithm: Optional[str] = None
    district_loaded: bool
    prototype: bool = True
    notice: str


class ModelMetrics(BaseModel):
    """Held-out scores. Labelled as prototype performance, never as real-world."""
    algorithm: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    confusion_matrix: dict
    n_total: int
    n_train: int
    n_test: int
    decision_threshold: float
    disclaimer: str
    feature_importance: dict


class Scenario(BaseModel):
    id: ScenarioId
    label: str
    description: str
    rainfall_24h: float
    rainfall_72h: float
    soil_moisture: float


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

class Terrain(BaseModel):
    slope: float = Field(..., description="Slope angle in degrees")
    elevation: float = Field(..., description="Metres above sea level")
    land_cover: str
    historical_landslides: int
    crack_reports: int = Field(..., description="Standing crack reports, including field submissions")
    rain_exposure: float = Field(..., description="Catchment exposure multiplier applied to scenario rainfall")


class Location(BaseModel):
    id: str
    name: str
    segment: str
    description: str
    path: List[List[float]] = Field(..., description="Polyline as [lat, lon] pairs")
    terrain: Terrain


class Village(BaseModel):
    id: str
    name: str
    population: int
    coords: List[float]


class Hospital(BaseModel):
    id: str
    name: str
    type: str
    beds: int
    coords: List[float]


class School(BaseModel):
    id: str
    name: str
    students: int
    coords: List[float]


class SupplyRoute(BaseModel):
    id: str
    name: str
    criticality: str


class LandslidePoint(BaseModel):
    id: str
    year: int
    road_id: str
    coords: List[float]
    volume_m3: int


class DistrictInfo(BaseModel):
    name: str
    state: str
    center: List[float]
    zoom: int
    disclaimer: str


# ---------------------------------------------------------------------------
# Risk
# ---------------------------------------------------------------------------

class EnvironmentalEvidence(BaseModel):
    """The exact feature vector the model was given, for display on the UI."""
    rainfall_24h: float
    rainfall_72h: float
    slope: float
    soil_moisture: float
    historical_landslides: int
    crack_reports: int
    elevation: float
    land_cover: str


class FeatureContribution(BaseModel):
    feature: str
    label: str
    unit: str
    value: float | int | str
    delta: float = Field(..., description="Drop in predicted probability when this input is reset to the district median")
    contribution_pct: float
    direction: str


class RiskSummary(BaseModel):
    """Compact risk record - used for the priority list and the map."""
    location_id: str
    name: str
    segment: str
    scenario: ScenarioId
    risk_probability: float
    risk_percentage: int
    risk_level: RiskLevel
    recommended_action: str = Field(..., description="Single headline action for the list view")


class RiskDetail(BaseModel):
    """Full risk record for the Risk Analysis page."""
    location_id: str
    name: str
    segment: str
    description: str
    scenario: ScenarioId
    risk_probability: float
    risk_percentage: int
    risk_level: RiskLevel
    model: str
    evidence: EnvironmentalEvidence
    explanation_method: str
    explanation_note: str
    top_drivers: List[FeatureContribution]
    reasons: List[str]
    recommended_actions: List[str]


# ---------------------------------------------------------------------------
# Impact
# ---------------------------------------------------------------------------

class ImpactNode(BaseModel):
    id: str
    name: str
    type: str = Field(..., description="village | hospital | school | supply_route")
    detail: str


class ImpactAnalysis(BaseModel):
    location_id: str
    name: str
    scenario: ScenarioId
    risk_percentage: int
    risk_level: RiskLevel
    villages_affected: int
    hospitals_affected: int
    schools_affected: int
    supply_routes_disrupted: int
    population_isolated: int
    students_affected: int
    hospital_beds_cut_off: int
    nodes: List[ImpactNode] = Field(..., description="Flat dependency list for the R17 -> village/hospital tree view")
    summary: str


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class Alert(BaseModel):
    location_id: str
    name: str
    segment: str
    risk_percentage: int
    risk_level: RiskLevel
    population_at_risk: int
    hospitals_affected: int
    headline: str
    recommended_actions: List[str]


class DashboardStats(BaseModel):
    scenario: ScenarioId
    critical_alerts: int
    high_risk_locations: int
    roads_at_risk: int = Field(..., description="Count at MODERATE or above")
    total_roads: int
    population_potentially_affected: int


# ---------------------------------------------------------------------------
# Hazard reports
# ---------------------------------------------------------------------------

class ReportCreate(BaseModel):
    location_id: str = Field(..., description="Road id, e.g. R17")
    hazard_type: HazardType
    severity: Severity
    description: str = Field("", max_length=1000)
    reporter: str = Field("Field officer", max_length=120)
    photo_data_url: Optional[str] = Field(
        None,
        description="Optional base64 data URL. Held in memory only - not written to disk.",
    )


class Report(BaseModel):
    id: str
    location_id: str
    hazard_type: HazardType
    severity: Severity
    description: str
    reporter: str
    submitted_at: datetime
    has_photo: bool
    increments_crack_count: bool = Field(
        ..., description="True when this report type counts as new crack evidence for the model"
    )


class ReportResponse(BaseModel):
    """Shows the FIELD REPORT -> NEW EVIDENCE -> UPDATED RISK loop explicitly."""
    report: Report
    crack_reports_before: int
    crack_reports_after: int
    risk_before: RiskSummary
    risk_after: RiskSummary
    risk_change: int = Field(..., description="Percentage-point change caused by this report")
    message: str


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

class SimulateRequest(BaseModel):
    scenario: ScenarioId = ScenarioId.NORMAL
    location_id: Optional[str] = Field(
        None, description="Score a single road. Omit to score the whole district."
    )


class SimulateResponse(BaseModel):
    scenario: Scenario
    stats: DashboardStats
    results: List[RiskSummary]


class ErrorResponse(BaseModel):
    detail: str
