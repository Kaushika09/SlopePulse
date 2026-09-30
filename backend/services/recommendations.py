"""
SlopePulse backend - recommendation engine.

Deterministic, rule-based, and deliberately so. The ML model estimates risk;
what an officer should *do* about that risk is policy, not prediction. Keeping
these rules in readable code means a district authority could review and amend
them without retraining anything.

Rules follow section 12 of the brief, with impact-driven additions layered on
top of the risk band.
"""

from __future__ import annotations

from typing import Dict, List

# A road serving this many people or more triggers a community warning.
HIGH_POPULATION_THRESHOLD = 1500


def recommend(risk_percentage: int, impact: Dict[str, int] | None = None) -> List[str]:
    """
    Build the action list for a location.

    `impact` is the counts dict from services.impact (villages_affected,
    hospitals_affected, population_isolated, ...). Passing None gives the
    risk-band actions only.
    """
    impact = impact or {}
    actions: List[str] = []

    # --- Risk band actions -------------------------------------------------
    if risk_percentage >= 76:
        actions += [
            "Immediate field inspection",
            "Prepare alternate route",
            "Issue precautionary warning",
        ]
    elif risk_percentage >= 51:
        actions += [
            "Increase monitoring frequency",
            "Schedule field inspection",
            "Prepare warning for release",
        ]
    elif risk_percentage >= 31:
        actions.append("Continue routine monitoring")
    else:
        actions.append("No immediate action required")

    # --- Impact-driven additions ------------------------------------------
    hospitals = impact.get("hospitals_affected", 0)
    population = impact.get("population_isolated", 0)
    schools = impact.get("schools_affected", 0)
    supply_routes = impact.get("supply_routes_disrupted", 0)

    if risk_percentage >= 76 and (hospitals > 0 or supply_routes > 0):
        actions.append("Notify emergency services - critical infrastructure exposed")

    if hospitals > 0 and risk_percentage >= 51:
        actions.append("Notify medical / emergency transport authorities")

    if population >= HIGH_POPULATION_THRESHOLD and risk_percentage >= 51:
        actions.append(f"Prepare community warning ({population:,} residents served)")

    if schools > 0 and risk_percentage >= 76:
        actions.append("Advise school authorities on closure or transport changes")

    if supply_routes > 0 and risk_percentage >= 76:
        actions.append("Pre-position relief supplies beyond the exposed segment")

    # Preserve order, drop any duplicate produced by overlapping rules.
    seen = set()
    return [a for a in actions if not (a in seen or seen.add(a))]


def headline_action(risk_percentage: int) -> str:
    """One-line action for the priority list, where a full list will not fit."""
    if risk_percentage >= 76:
        return "Immediate field inspection"
    if risk_percentage >= 51:
        return "Increase monitoring"
    if risk_percentage >= 31:
        return "Continue monitoring"
    return "No immediate action"
