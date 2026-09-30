"""Reference-data endpoints: roads, settlements and facilities."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from backend.models import (
    DistrictInfo,
    Hospital,
    LandslidePoint,
    Location,
    School,
    SupplyRoute,
    Village,
)
from backend.services import district

router = APIRouter(tags=["locations"])


@router.get("/district", response_model=DistrictInfo, summary="District metadata and map centre")
def get_district() -> dict:
    return district.district_info()


@router.get("/locations", response_model=List[Location], summary="All road segments")
def get_locations() -> list:
    """Includes live crack counts, so a submitted field report is visible here."""
    return district.all_roads()


@router.get("/locations/{location_id}", response_model=Location, summary="One road segment")
def get_location(location_id: str) -> dict:
    road = district.get_road(location_id)
    if road is None:
        raise HTTPException(status_code=404, detail=f"Location '{location_id}' not found")
    return road


@router.get("/villages", response_model=List[Village])
def get_villages() -> list:
    return district.villages()


@router.get("/hospitals", response_model=List[Hospital])
def get_hospitals() -> list:
    return district.hospitals()


@router.get("/schools", response_model=List[School])
def get_schools() -> list:
    return district.schools()


@router.get("/supply-routes", response_model=List[SupplyRoute])
def get_supply_routes() -> list:
    return district.supply_routes()


@router.get("/landslides", response_model=List[LandslidePoint], summary="Simulated landslide inventory")
def get_landslides() -> list:
    return district.landslide_points()
