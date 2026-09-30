"""
SlopePulse - Fictional district builder.

Writes data/district.json: the roads, settlements, facilities, supply routes,
historical landslide points and road -> infrastructure links used by the demo.

EVERYTHING HERE IS FICTIONAL.
Place names, populations and facilities are invented. Coordinates sit in a
mountainous part of West Kameng district, Arunachal Pradesh purely so the map
renders over believable terrain. No real village, hospital or road is depicted,
and no value here reflects any official assessment.

Run:  python data/build_district.py
"""

from __future__ import annotations

import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "district.json"

# Anchor point for the simulated district (West Kameng region, Arunachal Pradesh).
LAT0, LON0 = 27.3600, 92.2400


def pt(dlat: float, dlon: float) -> list:
    """Small offset helper, in degrees, from the district anchor."""
    return [round(LAT0 + dlat, 5), round(LON0 + dlon, 5)]


# ---------------------------------------------------------------------------
# Roads
# terrain: slope(deg), elevation(m), land_cover, historical_landslides,
#          crack_reports (standing reports), rain_exposure (catchment factor)
# ---------------------------------------------------------------------------
ROADS = [
    {
        "id": "R17", "name": "Road R17", "segment": "Themgaon - Lhauri Ghat",
        "description": "Primary hill link carrying all traffic to the eastern valley.",
        "path": [pt(0.010, -0.010), pt(0.022, 0.004), pt(0.030, 0.020)],
        "terrain": {"slope": 38, "elevation": 1250, "land_cover": "shrubland",
                    "historical_landslides": 8, "crack_reports": 2, "rain_exposure": 1.05},
    },
    {
        "id": "R04", "name": "Road R04", "segment": "Sangti Bend - Khellong",
        "description": "Steep switchback section above the river gorge.",
        "path": [pt(-0.014, -0.026), pt(-0.004, -0.014), pt(0.006, -0.006)],
        "terrain": {"slope": 46, "elevation": 1480, "land_cover": "barren",
                    "historical_landslides": 8, "crack_reports": 6, "rain_exposure": 1.22},
    },
    {
        "id": "R09", "name": "Road R09", "segment": "Namshu Pass Approach",
        "description": "High-altitude approach road, exposed cut slopes.",
        "path": [pt(0.028, -0.030), pt(0.038, -0.018), pt(0.046, -0.004)],
        "terrain": {"slope": 40, "elevation": 1890, "land_cover": "shrubland",
                    "historical_landslides": 5, "crack_reports": 3, "rain_exposure": 1.06},
    },
    {
        "id": "R21", "name": "Road R21", "segment": "Rupagaon Loop",
        "description": "Secondary loop serving three hamlets.",
        "path": [pt(-0.030, 0.006), pt(-0.020, 0.018), pt(-0.010, 0.026)],
        "terrain": {"slope": 27, "elevation": 1040, "land_cover": "agriculture",
                    "historical_landslides": 3, "crack_reports": 1, "rain_exposure": 1.00},
    },
    {
        "id": "R02", "name": "Road R02", "segment": "Barima Feeder",
        "description": "Feeder road along a moderate forested slope.",
        "path": [pt(-0.006, 0.030), pt(0.002, 0.040), pt(0.012, 0.046)],
        "terrain": {"slope": 22, "elevation": 880, "land_cover": "forest",
                    "historical_landslides": 2, "crack_reports": 0, "rain_exposure": 0.94},
    },
    {
        "id": "R06", "name": "Road R06", "segment": "Chugpa Ridge Road",
        "description": "Ridge-top alignment with good natural drainage.",
        "path": [pt(0.040, 0.014), pt(0.048, 0.026), pt(0.052, 0.040)],
        "terrain": {"slope": 30, "elevation": 2050, "land_cover": "shrubland",
                    "historical_landslides": 4, "crack_reports": 0, "rain_exposure": 1.02},
    },
    {
        "id": "R11", "name": "Road R11", "segment": "Lower Valley Bypass",
        "description": "Valley-floor bypass, gentle gradient.",
        "path": [pt(-0.036, -0.014), pt(-0.030, 0.000), pt(-0.026, 0.014)],
        "terrain": {"slope": 14, "elevation": 720, "land_cover": "agriculture",
                    "historical_landslides": 1, "crack_reports": 0, "rain_exposure": 0.88},
    },
    {
        "id": "R13", "name": "Road R13", "segment": "Zemi Basti Link",
        "description": "Short link road with an old retaining wall.",
        "path": [pt(0.016, 0.034), pt(0.024, 0.042), pt(0.030, 0.052)],
        "terrain": {"slope": 34, "elevation": 1160, "land_cover": "settlement",
                    "historical_landslides": 4, "crack_reports": 2, "rain_exposure": 0.98},
    },
    {
        "id": "R08", "name": "Road R08", "segment": "Sangti Riverside",
        "description": "Riverside stretch prone to toe erosion.",
        "path": [pt(-0.022, -0.038), pt(-0.012, -0.032), pt(-0.002, -0.030)],
        "terrain": {"slope": 19, "elevation": 810, "land_cover": "agriculture",
                    "historical_landslides": 3, "crack_reports": 0, "rain_exposure": 0.92},
    },
    {
        "id": "R15", "name": "Road R15", "segment": "Khellong Upper Cut",
        "description": "Actively creeping slide zone; cracks monitored since 2019.",
        "path": [pt(0.004, -0.040), pt(0.014, -0.034), pt(0.022, -0.026)],
        "terrain": {"slope": 48, "elevation": 2150, "land_cover": "barren",
                    "historical_landslides": 8, "crack_reports": 6, "rain_exposure": 1.18},
    },
    {
        "id": "R19", "name": "Road R19", "segment": "Themgaon Market Road",
        "description": "Built-up market approach, largely paved.",
        "path": [pt(0.006, 0.008), pt(0.010, 0.018), pt(0.014, 0.026)],
        "terrain": {"slope": 12, "elevation": 960, "land_cover": "settlement",
                    "historical_landslides": 0, "crack_reports": 0, "rain_exposure": 0.85},
    },
    {
        "id": "R23", "name": "Road R23", "segment": "Forest Range Track",
        "description": "Densely forested track, well-vegetated slopes.",
        "path": [pt(0.034, -0.044), pt(0.042, -0.036), pt(0.050, -0.030)],
        "terrain": {"slope": 24, "elevation": 1680, "land_cover": "forest",
                    "historical_landslides": 1, "crack_reports": 0, "rain_exposure": 0.90},
    },
    {
        "id": "R26", "name": "Road R26", "segment": "Namshu Spur",
        "description": "Narrow spur road serving a single hamlet.",
        "path": [pt(0.044, -0.010), pt(0.050, 0.002), pt(0.054, 0.012)],
        "terrain": {"slope": 29, "elevation": 1740, "land_cover": "shrubland",
                    "historical_landslides": 2, "crack_reports": 1, "rain_exposure": 0.96},
    },
    {
        "id": "R28", "name": "Road R28", "segment": "Old Ghat Road",
        "description": "Disused alignment retained as an emergency detour.",
        "path": [pt(-0.040, 0.024), pt(-0.032, 0.034), pt(-0.024, 0.042)],
        "terrain": {"slope": 39, "elevation": 1320, "land_cover": "shrubland",
                    "historical_landslides": 6, "crack_reports": 3, "rain_exposure": 1.06},
    },
]

VILLAGES = [
    {"id": "V01", "name": "Themgaon",      "population": 1650, "coords": pt(0.012, -0.004)},
    {"id": "V02", "name": "Lhauri",        "population": 1100, "coords": pt(0.030, 0.016)},
    {"id": "V03", "name": "Sangti Basti",  "population": 940,  "coords": pt(-0.012, -0.022)},
    {"id": "V04", "name": "Khellong",      "population": 1320, "coords": pt(0.008, -0.010)},
    {"id": "V05", "name": "Namshu",        "population": 780,  "coords": pt(0.042, -0.014)},
    {"id": "V06", "name": "Rupagaon",      "population": 1480, "coords": pt(-0.024, 0.014)},
    {"id": "V07", "name": "Barima",        "population": 610,  "coords": pt(0.004, 0.036)},
    {"id": "V08", "name": "Chugpa",        "population": 520,  "coords": pt(0.046, 0.028)},
    {"id": "V09", "name": "Zemi Basti",    "population": 890,  "coords": pt(0.026, 0.046)},
]

HOSPITALS = [
    {"id": "H1", "name": "District Hospital Themgaon", "type": "District Hospital",
     "beds": 120, "coords": pt(0.018, 0.002)},
    {"id": "H2", "name": "Rupagaon CHC", "type": "Community Health Centre",
     "beds": 40, "coords": pt(-0.022, 0.020)},
    {"id": "H3", "name": "Namshu PHC", "type": "Primary Health Centre",
     "beds": 12, "coords": pt(0.040, -0.006)},
]

SCHOOLS = [
    {"id": "S1", "name": "Govt. Secondary School Lhauri", "students": 420, "coords": pt(0.028, 0.012)},
    {"id": "S2", "name": "Govt. Primary School Khellong", "students": 180, "coords": pt(0.006, -0.016)},
    {"id": "S3", "name": "Rupagaon Middle School",        "students": 260, "coords": pt(-0.026, 0.010)},
    {"id": "S4", "name": "Chugpa Residential School",     "students": 310, "coords": pt(0.048, 0.032)},
]

SUPPLY_ROUTES = [
    {"id": "SR1", "name": "NH-Link Fuel & Ration Corridor", "criticality": "HIGH"},
    {"id": "SR2", "name": "Eastern Valley Supply Route",    "criticality": "HIGH"},
    {"id": "SR3", "name": "Northern Relief Corridor",       "criticality": "MEDIUM"},
]

# Deterministic road -> infrastructure dependency map (Section 11).
# "If this road fails, these assets lose their connection."
IMPACT_LINKS = {
    "R17": {"villages": ["V01", "V02"], "hospitals": ["H1"], "schools": ["S1"], "supply_routes": ["SR2"]},
    "R04": {"villages": ["V03", "V04"], "hospitals": [],     "schools": ["S2"], "supply_routes": ["SR1"]},
    "R09": {"villages": ["V05"],        "hospitals": ["H3"], "schools": [],     "supply_routes": ["SR3"]},
    "R21": {"villages": ["V06"],        "hospitals": ["H2"], "schools": ["S3"], "supply_routes": []},
    "R02": {"villages": ["V07"],        "hospitals": [],     "schools": [],     "supply_routes": []},
    "R06": {"villages": ["V08"],        "hospitals": [],     "schools": ["S4"], "supply_routes": ["SR3"]},
    "R11": {"villages": ["V03"],        "hospitals": [],     "schools": [],     "supply_routes": ["SR1"]},
    "R13": {"villages": ["V09"],        "hospitals": [],     "schools": [],     "supply_routes": []},
    "R08": {"villages": ["V03"],        "hospitals": [],     "schools": [],     "supply_routes": []},
    "R15": {"villages": ["V04"],        "hospitals": [],     "schools": ["S2"], "supply_routes": ["SR1"]},
    "R19": {"villages": ["V01"],        "hospitals": ["H1"], "schools": [],     "supply_routes": []},
    "R23": {"villages": [],             "hospitals": [],     "schools": [],     "supply_routes": []},
    "R26": {"villages": ["V05"],        "hospitals": [],     "schools": [],     "supply_routes": []},
    "R28": {"villages": ["V06"],        "hospitals": [],     "schools": [],     "supply_routes": []},
}

# Historical landslide points (simulated inventory).
LANDSLIDE_POINTS = [
    {"id": "L01", "year": 2019, "road_id": "R17", "coords": pt(0.020, 0.002),  "volume_m3": 1800},
    {"id": "L02", "year": 2020, "road_id": "R17", "coords": pt(0.026, 0.010),  "volume_m3": 950},
    {"id": "L03", "year": 2022, "road_id": "R17", "coords": pt(0.014, -0.006), "volume_m3": 2400},
    {"id": "L04", "year": 2023, "road_id": "R17", "coords": pt(0.028, 0.016),  "volume_m3": 620},
    {"id": "L05", "year": 2018, "road_id": "R04", "coords": pt(-0.010, -0.020),"volume_m3": 1500},
    {"id": "L06", "year": 2021, "road_id": "R04", "coords": pt(-0.002, -0.012),"volume_m3": 1100},
    {"id": "L07", "year": 2024, "road_id": "R04", "coords": pt(0.002, -0.008), "volume_m3": 3100},
    {"id": "L08", "year": 2020, "road_id": "R09", "coords": pt(0.034, -0.024), "volume_m3": 700},
    {"id": "L09", "year": 2023, "road_id": "R09", "coords": pt(0.042, -0.010), "volume_m3": 1900},
    {"id": "L10", "year": 2019, "road_id": "R15", "coords": pt(0.010, -0.036), "volume_m3": 850},
    {"id": "L11", "year": 2022, "road_id": "R15", "coords": pt(0.018, -0.030), "volume_m3": 1250},
    {"id": "L12", "year": 2021, "road_id": "R21", "coords": pt(-0.024, 0.012), "volume_m3": 400},
    {"id": "L13", "year": 2024, "road_id": "R06", "coords": pt(0.046, 0.022),  "volume_m3": 1600},
    {"id": "L14", "year": 2020, "road_id": "R28", "coords": pt(-0.034, 0.030), "volume_m3": 520},
    {"id": "L15", "year": 2023, "road_id": "R08", "coords": pt(-0.016, -0.034),"volume_m3": 780},
    {"id": "L16", "year": 2018, "road_id": "R13", "coords": pt(0.022, 0.040),  "volume_m3": 300},
]


def main() -> None:
    district = {
        "district": {
            "name": "Kamengri District (simulated)",
            "state": "Arunachal Pradesh (map context only)",
            "center": [LAT0, LON0],
            "zoom": 12,
            "disclaimer": (
                "Prototype / Simulated Data. Place names, populations, facilities and "
                "risk values are fictional and do not represent any real location or "
                "any official government assessment."
            ),
        },
        "roads": ROADS,
        "villages": VILLAGES,
        "hospitals": HOSPITALS,
        "schools": SCHOOLS,
        "supply_routes": SUPPLY_ROUTES,
        "impact_links": IMPACT_LINKS,
        "landslide_points": LANDSLIDE_POINTS,
    }

    OUTPUT.write_text(json.dumps(district, indent=2))
    total_pop = sum(v["population"] for v in VILLAGES)
    print(f"Wrote {OUTPUT}")
    print(
        f"  {len(ROADS)} roads | {len(VILLAGES)} villages ({total_pop:,} people) | "
        f"{len(HOSPITALS)} hospitals | {len(SCHOOLS)} schools | "
        f"{len(SUPPLY_ROUTES)} supply routes | {len(LANDSLIDE_POINTS)} landslide points"
    )


if __name__ == "__main__":
    main()
