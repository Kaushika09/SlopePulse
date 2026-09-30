"""
SlopePulse backend - application entrypoint.

Run locally from the PROJECT ROOT (not from inside backend/):

    uvicorn backend.main:app --reload --port 8000

Interactive docs: http://127.0.0.1:8000/docs
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import (
    ALLOWED_ORIGIN_REGEX,
    ALLOWED_ORIGINS,
    API_DESCRIPTION,
    API_TITLE,
    API_VERSION,
)
from backend.routes import locations, meta, reports, risk as risk_routes
from backend.services.district import DistrictNotLoadedError
from backend.services.risk import ModelNotTrainedError

logger = logging.getLogger("slopepulse")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    Load the model and district data at startup rather than on the first
    request. On a free-tier host the first request already pays a cold-start
    penalty; paying model-load time on top of it is what makes a demo stall.
    """
    from backend.services import district as district_service
    from backend.services import risk as risk_service

    if risk_service.is_model_loaded():
        logger.info("Model loaded: %s", risk_service.model_algorithm())
    else:
        logger.warning("Model NOT loaded - run: python ml/train_model.py")

    if district_service.is_loaded():
        logger.info("District loaded: %d roads", len(district_service.all_roads()))
    else:
        logger.warning("District NOT loaded - run: python data/build_district.py")

    yield


app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    lifespan=lifespan,
)

# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------
# The browser calls this API directly from the Vercel-hosted frontend, so the
# allow-list has to include the deployed origin. Explicit origins come from the
# ALLOWED_ORIGINS environment variable; the regex additionally covers Vercel
# preview deployments, which get a fresh hostname on every push.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Error handling
# --------------------------------------------------------------------------

@app.exception_handler(ModelNotTrainedError)
async def handle_model_missing(_: Request, error: ModelNotTrainedError) -> JSONResponse:
    """503 rather than 500: the service is up, its dependency is not ready."""
    logger.error("Model not available: %s", error)
    return JSONResponse(
        status_code=503,
        content={"detail": f"Risk model unavailable. {error}"},
    )


@app.exception_handler(DistrictNotLoadedError)
async def handle_district_missing(_: Request, error: DistrictNotLoadedError) -> JSONResponse:
    logger.error("District data not available: %s", error)
    return JSONResponse(
        status_code=503,
        content={"detail": f"District data unavailable. {error}"},
    )


@app.exception_handler(Exception)
async def handle_unexpected(_: Request, error: Exception) -> JSONResponse:
    """
    Catch-all so the frontend always receives JSON it can parse, never an HTML
    error page. The real error is logged server-side.
    """
    logger.exception("Unhandled error: %s", error)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check the API logs for details."},
    )


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------

app.include_router(meta.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(risk_routes.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/", include_in_schema=False)
def root() -> dict:
    """Friendly landing response, so hitting the bare Render URL is not a 404."""
    return {
        "name": API_TITLE,
        "version": API_VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "notice": "Prototype / Simulated Data.",
    }
