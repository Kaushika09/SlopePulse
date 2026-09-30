"""Risk, alerts, impact and scenario-simulation endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException, Query

from backend.models import (
    Alert,
    DashboardStats,
    ImpactAnalysis,
    RiskDetail,
    RiskSummary,
    Scenario,
    SimulateRequest,
    SimulateResponse,
)
from backend.services import district, impact, risk

router = APIRouter(tags=["risk"])

_SCENARIO_PARAM = Query(
    "NORMAL",
    description="NORMAL, HEAVY or EXTREME. Defaults to NORMAL.",
)


def _scenario(value: str) -> str:
    """Validate the scenario query parameter, returning 400 on a bad value."""
    try:
        return risk.normalise_scenario(value)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _require_road(location_id: str) -> dict:
    road = district.get_road(location_id)
    if road is None:
        raise HTTPException(status_code=404, detail=f"Location '{location_id}' not found")
    return road


@router.get("/scenarios", response_model=List[Scenario], summary="Available scenarios")
def get_scenarios() -> list:
    return risk.available_scenarios()


@router.get("/risk", response_model=List[RiskSummary], summary="Priority locations, ranked")
def get_risk(scenario: str = _SCENARIO_PARAM) -> list:
    """Every road scored under the given scenario, highest risk first."""
    return risk.risk_summaries(_scenario(scenario))


@router.get("/risk/{location_id}", response_model=RiskDetail, summary="Full risk analysis for one road")
def get_risk_detail(location_id: str, scenario: str = _SCENARIO_PARAM) -> dict:
    """Evidence, contributing factors and recommended actions."""
    _require_road(location_id)
    detail = risk.risk_detail(location_id, _scenario(scenario))
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Location '{location_id}' not found")
    return detail


@router.get("/stats", response_model=DashboardStats, summary="Dashboard KPI cards")
def get_stats(scenario: str = _SCENARIO_PARAM) -> dict:
    return risk.dashboard_stats(_scenario(scenario))


@router.get("/alerts", response_model=List[Alert], summary="Active alerts (HIGH and above)")
def get_alerts(
    scenario: str = _SCENARIO_PARAM,
    min_percentage: int = Query(51, ge=0, le=100, description="Minimum risk percentage to include"),
) -> list:
    return risk.alerts(_scenario(scenario), min_percentage)


@router.get("/impact/{location_id}", response_model=ImpactAnalysis, summary="What is cut off if this road fails")
def get_impact(location_id: str, scenario: str = _SCENARIO_PARAM) -> dict:
    road = _require_road(location_id)
    scenario_key = _scenario(scenario)

    prediction = risk.risk_for_road(road, scenario_key)["prediction"]
    analysis = impact.full_impact(road["id"])

    return {
        "location_id": road["id"],
        "name": road["name"],
        "scenario": scenario_key,
        "risk_percentage": prediction["risk_percentage"],
        "risk_level": prediction["risk_level"],
        **analysis,
    }


@router.post("/simulate", response_model=SimulateResponse, summary="Re-score the district under a scenario")
def post_simulate(payload: SimulateRequest) -> dict:
    """
    Powers the scenario simulator. Every percentage returned is a fresh model
    prediction on scenario-adjusted inputs - nothing is looked up or hard-coded.
    """
    scenario_key = _scenario(payload.scenario.value)

    if payload.location_id:
        road = _require_road(payload.location_id)
        results = [risk.summary_for(road["id"], scenario_key)]
    else:
        results = risk.risk_summaries(scenario_key)

    meta = next(s for s in risk.available_scenarios() if s["id"] == scenario_key)
    return {
        "scenario": meta,
        "stats": risk.dashboard_stats(scenario_key),
        "results": results,
    }
