"""
SlopePulse - Inference and explanation.

This is the single entry point the FastAPI backend uses. It loads the joblib
bundle once, caches it, and exposes:

    predict_risk(features)        -> risk_probability / risk_percentage / risk_level
    explain_prediction(features)  -> ranked per-feature contributions
    model_info()                  -> metrics + metadata for the UI

EXPLAINABILITY - PLEASE READ
----------------------------
These are NOT SHAP values and are never labelled as such.

`explain_prediction` uses single-feature ablation (also called occlusion):
for each feature we replace its value with the dataset median, ask the model
to predict again, and record how much the risk drops. A large drop means the
feature is doing real work in THIS prediction. The numbers therefore come from
the trained model, not from a hand-written narrative - but they are a simpler,
non-additive approximation, and the UI should describe them that way.

Swapping in real SHAP later means replacing one function.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"

# Risk bands, per the SlopePulse specification.
RISK_BANDS = [
    (0, 30, "LOW"),
    (31, 50, "MODERATE"),
    (51, 75, "HIGH"),
    (76, 100, "CRITICAL"),
]

# Human-readable labels + units, used by the UI so the frontend does not
# need its own copy of this mapping.
FEATURE_LABELS = {
    "rainfall_24h": ("Rainfall (24h)", "mm"),
    "rainfall_72h": ("Accumulated rainfall (72h)", "mm"),
    "slope": ("Slope angle", "°"),
    "soil_moisture": ("Soil moisture", "%"),
    "historical_landslides": ("Historical landslides", "events"),
    "crack_reports": ("Open crack reports", "reports"),
    "elevation": ("Elevation", "m"),
    "land_cover": ("Land cover", ""),
}

# Plain-language reason shown when a feature is pushing risk UP.
FEATURE_REASONS = {
    "rainfall_24h": "Heavy rainfall in the last 24 hours",
    "rainfall_72h": "High accumulated rainfall over 72 hours",
    "slope": "Steep slope angle",
    "soil_moisture": "Very high soil moisture / near-saturation",
    "historical_landslides": "Previous landslide activity at this location",
    "crack_reports": "Recent field crack reports",
    "elevation": "High-elevation terrain",
    "land_cover": "Land cover offers little slope stabilisation",
}


class ModelNotTrainedError(RuntimeError):
    """Raised when model.pkl is missing. The API converts this into a 503."""


@lru_cache(maxsize=1)
def load_bundle() -> Dict[str, Any]:
    """Load and cache the trained bundle. Called once per process."""
    if not MODEL_PATH.exists():
        raise ModelNotTrainedError(
            f"Trained model not found at {MODEL_PATH}. "
            "Run: python ml/generate_data.py && python ml/train_model.py"
        )
    return joblib.load(MODEL_PATH)


def risk_level_for(percentage: float) -> str:
    """Map a 0-100 risk percentage onto a named band."""
    value = max(0.0, min(100.0, float(percentage)))
    for low, high, label in RISK_BANDS:
        if low <= round(value) <= high:
            return label
    return "CRITICAL"


def _encode(features: Dict[str, Any], bundle: Dict[str, Any]) -> pd.DataFrame:
    """Build a single-row DataFrame in the exact column order the model expects."""
    land_cover_map = bundle["land_cover_map"]
    row: Dict[str, float] = {}

    for name in bundle["feature_names"]:
        value = features.get(name)

        if name == "land_cover":
            if isinstance(value, str):
                value = land_cover_map.get(value.strip().lower(), land_cover_map["shrubland"])
            elif value is None:
                value = land_cover_map["shrubland"]
            row[name] = int(value)
            continue

        if value is None:
            # Missing input falls back to the dataset median rather than 0,
            # which would silently look like "perfectly safe".
            value = bundle["baseline"][name]
        row[name] = float(value)

    return pd.DataFrame([row], columns=bundle["feature_names"])


def _probability(frame: pd.DataFrame, bundle: Dict[str, Any]) -> float:
    return float(bundle["model"].predict_proba(frame)[0, 1])


def predict_risk(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Score one location.

    Returns:
        {
          "risk_probability": 0.87,
          "risk_percentage": 87,
          "risk_level": "CRITICAL",
          "model": "XGBClassifier"
        }
    """
    bundle = load_bundle()
    frame = _encode(features, bundle)
    probability = _probability(frame, bundle)
    percentage = int(round(probability * 100))

    return {
        "risk_probability": round(probability, 4),
        "risk_percentage": percentage,
        "risk_level": risk_level_for(percentage),
        "model": bundle["algorithm"],
    }


def explain_prediction(features: Dict[str, Any], top_n: int = 5) -> Dict[str, Any]:
    """
    Explain one prediction by single-feature ablation.

    For each feature: replace it with the dataset median, re-predict, and
    measure the change in risk. Positive delta = this feature is RAISING risk.
    Contributions are then expressed as a share of the total upward push so the
    UI can draw comparable bars.
    """
    bundle = load_bundle()
    base_frame = _encode(features, bundle)
    base_probability = _probability(base_frame, bundle)

    contributions: List[Dict[str, Any]] = []
    for name in bundle["feature_names"]:
        ablated = base_frame.copy()
        ablated.at[0, name] = bundle["baseline"][name]
        delta = base_probability - _probability(ablated, bundle)

        label, unit = FEATURE_LABELS.get(name, (name, ""))
        contributions.append(
            {
                "feature": name,
                "label": label,
                "unit": unit,
                "value": features.get(name, bundle["baseline"][name]),
                "delta": round(float(delta), 4),
                "direction": "increases" if delta > 0 else "decreases",
            }
        )

    # Share of total *upward* pressure, so bars sum to ~100% of the risk drivers.
    upward_total = sum(c["delta"] for c in contributions if c["delta"] > 0)
    for item in contributions:
        item["contribution_pct"] = (
            round(100.0 * item["delta"] / upward_total, 1) if upward_total > 0 and item["delta"] > 0 else 0.0
        )

    contributions.sort(key=lambda c: c["delta"], reverse=True)
    drivers = [c for c in contributions if c["delta"] > 0][:top_n]

    percentage = int(round(base_probability * 100))
    return {
        "risk_probability": round(base_probability, 4),
        "risk_percentage": percentage,
        "risk_level": risk_level_for(percentage),
        "method": "single-feature ablation vs dataset median (not SHAP)",
        "method_note": (
            "Each bar shows how much the model's risk estimate falls when that "
            "single input is reset to a typical value for the district."
        ),
        "top_drivers": drivers,
        "reasons": [FEATURE_REASONS.get(c["feature"], c["label"]) for c in drivers],
        "all_contributions": contributions,
    }


def model_info() -> Dict[str, Any]:
    """Metrics + metadata for the UI's model panel."""
    bundle = load_bundle()
    return {
        "algorithm": bundle["algorithm"],
        "feature_names": bundle["feature_names"],
        "land_cover_map": bundle["land_cover_map"],
        "baseline": bundle["baseline"],
        "metrics": bundle["metrics"],
    }


# --------------------------------------------------------------------------
# Manual test:  python ml/predict.py
# --------------------------------------------------------------------------
if __name__ == "__main__":
    demo = {
        "rainfall_24h": 150,
        "rainfall_72h": 320,
        "slope": 38,
        "soil_moisture": 91,
        "historical_landslides": 8,
        "crack_reports": 4,
        "elevation": 1250,
        "land_cover": "barren",
    }

    result = predict_risk(demo)
    print("ROAD R17 (extreme-rainfall inputs from the spec)")
    print(f"  risk_probability : {result['risk_probability']}")
    print(f"  risk_percentage  : {result['risk_percentage']}")
    print(f"  risk_level       : {result['risk_level']}")

    explanation = explain_prediction(demo)
    print(f"\nWhy is this location risky?  [{explanation['method']}]")
    for driver in explanation["top_drivers"]:
        print(
            f"  {driver['label']:<28} {driver['value']}{driver['unit']:<3}"
            f"  +{driver['delta']:.3f}  ({driver['contribution_pct']}%)"
        )

    print("\nSanity check - the same road on a dry day:")
    calm = {**demo, "rainfall_24h": 8, "rainfall_72h": 25, "soil_moisture": 32, "crack_reports": 0}
    print(f"  {predict_risk(calm)}")
