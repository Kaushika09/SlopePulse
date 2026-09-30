"""
SlopePulse backend - impact analysis.

Answers "if this road fails, what is cut off?" using the deterministic
dependency map in district.json. Section 11 of the brief explicitly allows a
fixed mapping rather than graph algorithms, and for a district of 14 roads a
lookup is clearer to explain and impossible to get subtly wrong.

Production note worth saying to judges: this is where NetworkX would go, with
roads as edges and settlements as nodes, so you could compute genuine
connectivity loss and alternate paths instead of direct dependencies.
"""

from __future__ import annotations

from typing import Any, Dict, List

from backend.services import district


def impact_counts(location_id: str) -> Dict[str, int]:
    """Numeric impact summary. Cheap - safe to call for every road in a list."""
    links = district.impact_links(location_id)

    affected_villages = [
        v for v in (district.lookup(district.villages(), vid) for vid in links["villages"]) if v
    ]
    affected_hospitals = [
        h for h in (district.lookup(district.hospitals(), hid) for hid in links["hospitals"]) if h
    ]
    affected_schools = [
        s for s in (district.lookup(district.schools(), sid) for sid in links["schools"]) if s
    ]

    return {
        "villages_affected": len(affected_villages),
        "hospitals_affected": len(affected_hospitals),
        "schools_affected": len(affected_schools),
        "supply_routes_disrupted": len(links["supply_routes"]),
        "population_isolated": sum(v["population"] for v in affected_villages),
        "students_affected": sum(s["students"] for s in affected_schools),
        "hospital_beds_cut_off": sum(h["beds"] for h in affected_hospitals),
    }


def impact_nodes(location_id: str) -> List[Dict[str, str]]:
    """
    Flat dependency list for the tree view:

        R17
        +-- Themgaon (village)
        +-- District Hospital Themgaon (hospital)
        ...
    """
    links = district.impact_links(location_id)
    nodes: List[Dict[str, str]] = []

    for vid in links["villages"]:
        village = district.lookup(district.villages(), vid)
        if village:
            nodes.append({
                "id": village["id"],
                "name": village["name"],
                "type": "village",
                "detail": f"{village['population']:,} residents",
            })

    for hid in links["hospitals"]:
        hospital = district.lookup(district.hospitals(), hid)
        if hospital:
            nodes.append({
                "id": hospital["id"],
                "name": hospital["name"],
                "type": "hospital",
                "detail": f"{hospital['type']}, {hospital['beds']} beds",
            })

    for sid in links["schools"]:
        school = district.lookup(district.schools(), sid)
        if school:
            nodes.append({
                "id": school["id"],
                "name": school["name"],
                "type": "school",
                "detail": f"{school['students']:,} students",
            })

    for rid in links["supply_routes"]:
        route = district.lookup(district.supply_routes(), rid)
        if route:
            nodes.append({
                "id": route["id"],
                "name": route["name"],
                "type": "supply_route",
                "detail": f"{route['criticality']} criticality",
            })

    return nodes


def summary_sentence(location_id: str, counts: Dict[str, int]) -> str:
    """Plain-language summary for the top of the impact panel."""
    if not any(counts.values()):
        return f"No settlements or facilities depend solely on {location_id}."

    parts: List[str] = []
    if counts["villages_affected"]:
        parts.append(
            f"{counts['villages_affected']} village"
            f"{'s' if counts['villages_affected'] != 1 else ''}"
        )
    if counts["hospitals_affected"]:
        parts.append(
            f"{counts['hospitals_affected']} hospital"
            f"{'s' if counts['hospitals_affected'] != 1 else ''}"
        )
    if counts["schools_affected"]:
        parts.append(
            f"{counts['schools_affected']} school"
            f"{'s' if counts['schools_affected'] != 1 else ''}"
        )
    if counts["supply_routes_disrupted"]:
        parts.append(
            f"{counts['supply_routes_disrupted']} supply route"
            f"{'s' if counts['supply_routes_disrupted'] != 1 else ''}"
        )

    listed = ", ".join(parts[:-1]) + f" and {parts[-1]}" if len(parts) > 1 else parts[0]
    return (
        f"If {location_id} fails, {listed} lose their connection - "
        f"about {counts['population_isolated']:,} people potentially isolated."
    )


def full_impact(location_id: str) -> Dict[str, Any]:
    counts = impact_counts(location_id)
    return {
        **counts,
        "nodes": impact_nodes(location_id),
        "summary": summary_sentence(location_id, counts),
    }
