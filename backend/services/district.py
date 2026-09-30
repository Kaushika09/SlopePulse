"""
SlopePulse backend - district data and the hazard-report store.

Loads data/district.json once at import and keeps it in memory. Hazard reports
submitted during a demo are also held in memory.

WHY IN-MEMORY AND NOT A DATABASE
--------------------------------
The district is static reference data and the report store only needs to
survive a three-minute demo. Adding Postgres would mean a connection string,
a migration step and another service that can be asleep when a judge opens the
link - real risk, no demo benefit. Section 19 of the brief explicitly allows
JSON/mock data for the prototype.

The trade-off, stated plainly: submitted reports are lost when the process
restarts, and a free-tier host will restart it after a period of inactivity.
`reset_reports()` exists so you can clear state between practice runs.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.config import DISTRICT_JSON

# Hazard types that count as new crack evidence for the model. A rockfall or a
# water-seepage report is logged but does not change crack_reports, because
# that feature means "observed tension cracks" specifically.
CRACK_EVIDENCE_TYPES = {"New crack", "Road deformation"}


class DistrictNotLoadedError(RuntimeError):
    """Raised when district.json is missing. The API converts this into a 503."""


_lock = threading.Lock()
_district: Optional[Dict[str, Any]] = None

# location_id -> extra crack reports contributed by field submissions this session
_crack_deltas: Dict[str, int] = {}
_reports: List[Dict[str, Any]] = []


def _load() -> Dict[str, Any]:
    global _district
    if _district is None:
        if not DISTRICT_JSON.exists():
            raise DistrictNotLoadedError(
                f"District data not found at {DISTRICT_JSON}. "
                "Run: python data/build_district.py"
            )
        _district = json.loads(DISTRICT_JSON.read_text())
    return _district


def is_loaded() -> bool:
    """Health-check helper that never raises."""
    try:
        _load()
        return True
    except DistrictNotLoadedError:
        return False


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

def district_info() -> Dict[str, Any]:
    return _load()["district"]


def all_roads() -> List[Dict[str, Any]]:
    """
    Every road, with live crack counts folded in.

    Returns copies so a caller mutating a road cannot corrupt the loaded
    district - a real bug risk once the scenario engine starts editing
    feature dictionaries.
    """
    roads = []
    for road in _load()["roads"]:
        copy = json.loads(json.dumps(road))
        delta = _crack_deltas.get(copy["id"], 0)
        copy["terrain"]["crack_reports"] = copy["terrain"]["crack_reports"] + delta
        roads.append(copy)
    return roads


def get_road(location_id: str) -> Optional[Dict[str, Any]]:
    """Case-insensitive road lookup, so 'r17' works as well as 'R17'."""
    target = location_id.strip().upper()
    for road in all_roads():
        if road["id"].upper() == target:
            return road
    return None


def villages() -> List[Dict[str, Any]]:
    return _load()["villages"]


def hospitals() -> List[Dict[str, Any]]:
    return _load()["hospitals"]


def schools() -> List[Dict[str, Any]]:
    return _load()["schools"]


def supply_routes() -> List[Dict[str, Any]]:
    return _load()["supply_routes"]


def landslide_points() -> List[Dict[str, Any]]:
    return _load()["landslide_points"]


def impact_links(location_id: str) -> Dict[str, List[str]]:
    links = _load()["impact_links"].get(location_id.strip().upper())
    return links or {"villages": [], "hospitals": [], "schools": [], "supply_routes": []}


def lookup(collection: List[Dict[str, Any]], item_id: str) -> Optional[Dict[str, Any]]:
    return next((item for item in collection if item["id"] == item_id), None)


# ---------------------------------------------------------------------------
# Hazard reports
# ---------------------------------------------------------------------------

def add_report(
    location_id: str,
    hazard_type: str,
    severity: str,
    description: str,
    reporter: str,
    has_photo: bool,
) -> Dict[str, Any]:
    """
    Record a field report and, if it is crack evidence, raise that road's
    crack_reports so the next prediction sees the new evidence.
    """
    counts_as_crack = hazard_type in CRACK_EVIDENCE_TYPES
    road_id = location_id.strip().upper()

    with _lock:
        if counts_as_crack:
            _crack_deltas[road_id] = _crack_deltas.get(road_id, 0) + 1

        report = {
            "id": f"RPT-{uuid.uuid4().hex[:8].upper()}",
            "location_id": road_id,
            "hazard_type": hazard_type,
            "severity": severity,
            "description": description,
            "reporter": reporter,
            "submitted_at": datetime.now(timezone.utc),
            "has_photo": has_photo,
            "increments_crack_count": counts_as_crack,
        }
        _reports.append(report)

    return report


def all_reports(location_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Most recent first."""
    items = _reports
    if location_id:
        target = location_id.strip().upper()
        items = [r for r in items if r["location_id"] == target]
    return sorted(items, key=lambda r: r["submitted_at"], reverse=True)


def reset_reports() -> int:
    """Clear session state so the demo can be run again from a clean slate."""
    with _lock:
        removed = len(_reports)
        _reports.clear()
        _crack_deltas.clear()
    return removed
