"""
Hazard reporting endpoints.

Demonstrates the loop that makes SlopePulse more than a static map:

    FIELD REPORT -> NEW EVIDENCE -> UPDATED RISK

The response deliberately carries the before and after risk so the frontend
can animate the change rather than silently re-fetching.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from backend.config import MAX_PHOTO_CHARS
from backend.models import Report, ReportCreate, ReportResponse
from backend.services import district, risk

router = APIRouter(tags=["reports"])


@router.post("/reports", response_model=ReportResponse, status_code=201, summary="Submit a field hazard report")
def post_report(payload: ReportCreate, scenario: str = Query("NORMAL")) -> dict:
    """
    Records a report and re-scores the affected road.

    Crack-type reports raise that road's `crack_reports` feature, so the model
    genuinely sees new evidence. Other hazard types are logged but leave the
    feature vector unchanged - a rockfall is not a tension crack, and pretending
    otherwise would misrepresent what the model was trained on.
    """
    try:
        scenario_key = risk.normalise_scenario(scenario)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    road = district.get_road(payload.location_id)
    if road is None:
        raise HTTPException(status_code=404, detail=f"Location '{payload.location_id}' not found")

    if payload.photo_data_url and len(payload.photo_data_url) > MAX_PHOTO_CHARS:
        raise HTTPException(status_code=413, detail="Photo too large. Limit is roughly 2 MB.")

    crack_before = road["terrain"]["crack_reports"]
    risk_before = risk.summary_for(road["id"], scenario_key)

    report = district.add_report(
        location_id=payload.location_id,
        hazard_type=payload.hazard_type.value,
        severity=payload.severity.value,
        description=payload.description,
        reporter=payload.reporter,
        has_photo=bool(payload.photo_data_url),
    )

    updated_road = district.get_road(payload.location_id)
    crack_after = updated_road["terrain"]["crack_reports"]
    risk_after = risk.summary_for(road["id"], scenario_key)

    change = risk_after["risk_percentage"] - risk_before["risk_percentage"]

    if not report["increments_crack_count"]:
        message = (
            f"{payload.hazard_type.value} logged for {road['id']}. "
            "This hazard type is not counted as crack evidence, so the risk score is unchanged."
        )
    elif change > 0:
        message = (
            f"New crack evidence recorded for {road['id']}. "
            f"Risk updated {risk_before['risk_percentage']}% -> {risk_after['risk_percentage']}% "
            f"({risk_after['risk_level']})."
        )
    else:
        message = (
            f"New crack evidence recorded for {road['id']}. "
            f"Risk remains {risk_after['risk_percentage']}% - the model already rates this "
            "segment near the top of its range under current conditions."
        )

    return {
        "report": report,
        "crack_reports_before": crack_before,
        "crack_reports_after": crack_after,
        "risk_before": risk_before,
        "risk_after": risk_after,
        "risk_change": change,
        "message": message,
    }


@router.get("/reports", response_model=List[Report], summary="Submitted reports, newest first")
def get_reports(location_id: Optional[str] = Query(None, description="Filter by road id")) -> list:
    return district.all_reports(location_id)


@router.post("/reports/reset", summary="Clear reports and restore original crack counts")
def reset_reports() -> dict:
    """Resets session state so the demo can be run again from a clean slate."""
    removed = district.reset_reports()
    return {"cleared": removed, "message": "Session reports cleared. Crack counts restored."}
