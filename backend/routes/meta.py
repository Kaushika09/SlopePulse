"""Health and model-metadata endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.config import API_VERSION
from backend.models import HealthResponse, ModelMetrics
from backend.services import district, risk

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=HealthResponse, summary="Liveness and readiness")
def health() -> dict:
    """
    Never raises. Reports whether the model and district data actually loaded,
    so a deployment problem is visible immediately rather than as a 500 later.
    """
    model_ok = risk.is_model_loaded()
    return {
        "status": "ok" if model_ok and district.is_loaded() else "degraded",
        "api_version": API_VERSION,
        "model_loaded": model_ok,
        "model_algorithm": risk.model_algorithm(),
        "district_loaded": district.is_loaded(),
        "prototype": True,
        "notice": "Prototype / Simulated Data. Not an official assessment.",
    }


@router.get("/model", response_model=ModelMetrics, summary="Prototype model performance")
def model() -> dict:
    """Held-out metrics for the UI's model panel."""
    metrics = risk.model_metrics()
    missing = [k for k in ("accuracy", "precision", "recall", "f1") if k not in metrics]
    if missing:
        raise HTTPException(status_code=503, detail="Model metrics incomplete. Retrain the model.")
    return metrics
