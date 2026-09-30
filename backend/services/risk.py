"""
SlopePulse backend - risk scoring.

Thin layer over the Phase 2 ML code. This module does NOT re-implement any
modelling: every percentage comes from ml.predict, and every feature vector
comes from ml.scenarios. Its job is to assemble those results with impact
counts and recommended actions into the shapes the API returns.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ml.predict import ModelNotTrainedError, explain_prediction, model_info, predict_risk
from ml.scenarios import SCENARIO_ORDER, SCENARIOS, build_features

from backend.services import district, impact
from backend.services.recommendations import headline_action, recommend

__all__ = [
    "ModelNotTrainedError",
    "available_scenarios",
    "dashboard_stats",
    "is_model_loaded",
    "model_algorithm",
    "model_metrics",
    "normalise_scenario",
    "risk_detail",
    "risk_for_road",
    "risk_summaries",
]


def normalise_scenario(scenario: Optional[str]) -> str:
    """
    Validate a scenario id. Raises ValueError so the route layer can return a
    clean 400 rather than leaking a KeyError.
    """
    if scenario is None:
        return "NORMAL"
    key = scenario.strip().upper()
    if key not in SCENARIOS:
        raise ValueError(
            f"Unknown scenario '{scenario}'. Expected one of: {', '.join(SCENARIO_ORDER)}"
        )
    return key


def available_scenarios() -> List[Dict[str, Any]]:
    return [
        {
            "id": SCENARIOS[key]["id"],
            "label": SCENARIOS[key]["label"],
            "description": SCENARIOS[key]["description"],
            "rainfall_24h": SCENARIOS[key]["rainfall_24h"],
            "rainfall_72h": SCENARIOS[key]["rainfall_72h"],
            "soil_moisture": SCENARIOS[key]["soil_moisture"],
        }
        for key in SCENARIO_ORDER
    ]


def is_model_loaded() -> bool:
    """Health-check helper that never raises."""
    try:
        model_info()
        return True
    except ModelNotTrainedError:
        return False


def model_algorithm() -> Optional[str]:
    try:
        return model_info()["algorithm"]
    except ModelNotTrainedError:
        return None


def model_metrics() -> Dict[str, Any]:
    return model_info()["metrics"]


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def risk_for_road(road: Dict[str, Any], scenario: str) -> Dict[str, Any]:
    """Score one road. `road` must already include any live crack-report deltas."""
    features = build_features(road, scenario)
    prediction = predict_risk(features)
    return {"features": features, "prediction": prediction}


def _summary(road: Dict[str, Any], scenario: str) -> Dict[str, Any]:
    prediction = risk_for_road(road, scenario)["prediction"]
    return {
        "location_id": road["id"],
        "name": road["name"],
        "segment": road["segment"],
        "scenario": scenario,
        "risk_probability": prediction["risk_probability"],
        "risk_percentage": prediction["risk_percentage"],
        "risk_level": prediction["risk_level"],
        "recommended_action": headline_action(prediction["risk_percentage"]),
    }


def risk_summaries(scenario: str) -> List[Dict[str, Any]]:
    """Every road, ranked highest risk first - this is the Priority Locations list."""
    summaries = [_summary(road, scenario) for road in district.all_roads()]
    summaries.sort(key=lambda item: item["risk_percentage"], reverse=True)
    return summaries


def summary_for(location_id: str, scenario: str) -> Optional[Dict[str, Any]]:
    road = district.get_road(location_id)
    return _summary(road, scenario) if road else None


def risk_detail(location_id: str, scenario: str) -> Optional[Dict[str, Any]]:
    """
    Full record for the Risk Analysis page: evidence, why it is risky, and
    what to do. Runs the ablation explainer, so this is heavier than
    `risk_summaries` - call it for one road, not for a list.
    """
    road = district.get_road(location_id)
    if road is None:
        return None

    features = build_features(road, scenario)
    explanation = explain_prediction(features)
    counts = impact.impact_counts(road["id"])

    return {
        "location_id": road["id"],
        "name": road["name"],
        "segment": road["segment"],
        "description": road["description"],
        "scenario": scenario,
        "risk_probability": explanation["risk_probability"],
        "risk_percentage": explanation["risk_percentage"],
        "risk_level": explanation["risk_level"],
        "model": model_info()["algorithm"],
        "evidence": features,
        "explanation_method": explanation["method"],
        "explanation_note": explanation["method_note"],
        "top_drivers": explanation["top_drivers"],
        "reasons": explanation["reasons"],
        "recommended_actions": recommend(explanation["risk_percentage"], counts),
    }


# ---------------------------------------------------------------------------
# Dashboard aggregates
# ---------------------------------------------------------------------------

def dashboard_stats(scenario: str) -> Dict[str, Any]:
    """KPI card values. Population is de-duplicated - see comment below."""
    summaries = risk_summaries(scenario)

    critical = sum(1 for s in summaries if s["risk_level"] == "CRITICAL")
    high = sum(1 for s in summaries if s["risk_level"] == "HIGH")
    at_risk = sum(1 for s in summaries if s["risk_percentage"] >= 31)

    # Several roads can serve the same village, so summing per-road populations
    # would double-count residents and inflate the headline number. Collect the
    # distinct villages behind every at-risk road instead.
    exposed_village_ids = set()
    for summary in summaries:
        if summary["risk_percentage"] >= 51:
            exposed_village_ids.update(district.impact_links(summary["location_id"])["villages"])

    population = sum(
        village["population"]
        for village in district.villages()
        if village["id"] in exposed_village_ids
    )

    return {
        "scenario": scenario,
        "critical_alerts": critical,
        "high_risk_locations": high,
        "roads_at_risk": at_risk,
        "total_roads": len(summaries),
        "population_potentially_affected": population,
    }


def alerts(scenario: str, min_percentage: int = 51) -> List[Dict[str, Any]]:
    """Roads at HIGH or above, with the impact context an officer needs."""
    results: List[Dict[str, Any]] = []

    for summary in risk_summaries(scenario):
        if summary["risk_percentage"] < min_percentage:
            continue

        counts = impact.impact_counts(summary["location_id"])
        results.append({
            "location_id": summary["location_id"],
            "name": summary["name"],
            "segment": summary["segment"],
            "risk_percentage": summary["risk_percentage"],
            "risk_level": summary["risk_level"],
            "population_at_risk": counts["population_isolated"],
            "hospitals_affected": counts["hospitals_affected"],
            "headline": (
                f"{summary['name']} at {summary['risk_percentage']}% "
                f"({summary['risk_level']}) - {counts['population_isolated']:,} people served"
            ),
            "recommended_actions": recommend(summary["risk_percentage"], counts),
        })

    return results
