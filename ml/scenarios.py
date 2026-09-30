"""
SlopePulse - Scenario engine.

Roads carry *static terrain* (slope, elevation, land cover, history) plus a
`rain_exposure` multiplier describing how exposed that catchment is to a given
weather event. A scenario supplies the *weather*; this module combines the two
into a full feature vector, which is then scored by the ML model.

Nothing here decides a risk percentage. It only decides model INPUTS. The risk
number always comes from ml/predict.py, so switching scenarios in the UI is a
genuine re-prediction rather than a lookup table.
"""

from __future__ import annotations

from typing import Any, Dict

# Weather conditions per scenario. Values are district-average figures;
# each road scales them by its own rain_exposure.
SCENARIOS: Dict[str, Dict[str, Any]] = {
    "NORMAL": {
        "id": "NORMAL",
        "label": "Normal Conditions",
        "description": "Typical pre-monsoon week. Light, intermittent rainfall.",
        "rainfall_24h": 34.0,
        "rainfall_72h": 78.0,
        "soil_moisture": 48.0,
        "crack_report_bonus": 0,
    },
    "HEAVY": {
        "id": "HEAVY",
        "label": "Heavy Rainfall",
        "description": "Active monsoon spell. Sustained rain across the district.",
        "rainfall_24h": 75.0,
        "rainfall_72h": 140.0,
        "soil_moisture": 62.0,
        "crack_report_bonus": 0,
    },
    "EXTREME": {
        "id": "EXTREME",
        "label": "Extreme Rainfall",
        "description": "Cloudburst-scale event. Soils at or near saturation.",
        "rainfall_24h": 150.0,
        "rainfall_72h": 260.0,
        "soil_moisture": 86.0,
        "crack_report_bonus": 2,
    },
}

DEFAULT_SCENARIO = "NORMAL"
SCENARIO_ORDER = ["NORMAL", "HEAVY", "EXTREME"]


def build_features(road: Dict[str, Any], scenario_id: str = DEFAULT_SCENARIO) -> Dict[str, Any]:
    """
    Merge a road's terrain with a scenario's weather into model-ready features.

    `rain_exposure` (typically 0.75 - 1.20) captures catchment size, aspect and
    drainage: two roads in the same storm do not receive the same effective load.
    """
    scenario = SCENARIOS.get(scenario_id.upper(), SCENARIOS[DEFAULT_SCENARIO])
    terrain = road["terrain"]
    exposure = float(terrain.get("rain_exposure", 1.0))

    rainfall_24h = round(scenario["rainfall_24h"] * exposure, 1)
    rainfall_72h = round(scenario["rainfall_72h"] * exposure, 1)

    # Saturation responds to exposure but is physically capped at ~99%.
    soil_moisture = round(
        min(99.0, scenario["soil_moisture"] * (0.80 + 0.20 * exposure) + 4.0 * (exposure - 1.0)),
        1,
    )

    crack_reports = int(terrain.get("crack_reports", 0)) + int(scenario["crack_report_bonus"])

    return {
        "rainfall_24h": rainfall_24h,
        "rainfall_72h": rainfall_72h,
        "slope": float(terrain["slope"]),
        "soil_moisture": soil_moisture,
        "historical_landslides": int(terrain.get("historical_landslides", 0)),
        "crack_reports": min(crack_reports, 10),
        "elevation": float(terrain["elevation"]),
        "land_cover": terrain.get("land_cover", "shrubland"),
    }


def scenario_meta(scenario_id: str = DEFAULT_SCENARIO) -> Dict[str, Any]:
    """Return the scenario record the UI displays alongside the map."""
    return SCENARIOS.get(scenario_id.upper(), SCENARIOS[DEFAULT_SCENARIO])
