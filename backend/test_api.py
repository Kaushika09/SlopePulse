"""
SlopePulse - backend endpoint smoke test.

Exercises every endpoint and walks the exact demo flow from section 18 of the
brief, so you can confirm in one command that the API is working - locally or
against the deployed Render URL.

    python backend/test_api.py
    python backend/test_api.py https://slopepulse-api.onrender.com

Requires the backend to be running. Uses only the standard library, so there
is nothing extra to install.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")

passed = 0
failed = 0


def call(method: str, path: str, body: dict | None = None) -> tuple[int, object]:
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    if data:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode() or "{}")


def check(label: str, condition: bool, detail: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS  {label}{(' - ' + detail) if detail else ''}")
    else:
        failed += 1
        print(f"  FAIL  {label}{(' - ' + detail) if detail else ''}")


print(f"Testing SlopePulse API at {BASE}\n")

# --------------------------------------------------------------------------
print("Meta")
status, health = call("GET", "/api/health")
check("GET /api/health", status == 200 and health.get("model_loaded"), str(health.get("status")))

status, metrics = call("GET", "/api/model")
check("GET /api/model", status == 200 and "accuracy" in metrics,
      f"accuracy={metrics.get('accuracy')} auc={metrics.get('roc_auc')}")

status, scenarios = call("GET", "/api/scenarios")
check("GET /api/scenarios", status == 200 and len(scenarios) == 3,
      " / ".join(s["id"] for s in scenarios))

# --------------------------------------------------------------------------
print("\nReference data")
status, locations = call("GET", "/api/locations")
check("GET /api/locations", status == 200 and len(locations) >= 10, f"{len(locations)} roads")

status, r17 = call("GET", "/api/locations/R17")
check("GET /api/locations/R17", status == 200 and r17["id"] == "R17", r17.get("segment", ""))

status, body = call("GET", "/api/locations/R99")
check("GET /api/locations/R99 -> 404", status == 404, body.get("detail", ""))

for path, minimum in [("/api/villages", 8), ("/api/hospitals", 3),
                      ("/api/schools", 4), ("/api/supply-routes", 3),
                      ("/api/landslides", 10)]:
    status, items = call("GET", path)
    check(f"GET {path}", status == 200 and len(items) >= minimum, f"{len(items)} items")

# --------------------------------------------------------------------------
print("\nRisk")
status, ranked = call("GET", "/api/risk?scenario=NORMAL")
ordered = all(ranked[i]["risk_percentage"] >= ranked[i + 1]["risk_percentage"]
              for i in range(len(ranked) - 1))
check("GET /api/risk (ranked)", status == 200 and ordered,
      f"top: {ranked[0]['location_id']} {ranked[0]['risk_percentage']}%")

status, body = call("GET", "/api/risk?scenario=TYPHOON")
check("GET /api/risk bad scenario -> 400", status == 400, body.get("detail", "")[:52])

status, detail = call("GET", "/api/risk/R17?scenario=NORMAL")
check("GET /api/risk/R17", status == 200 and detail["top_drivers"],
      f"{detail['risk_percentage']}% {detail['risk_level']}")
check("  explanation not mislabelled as SHAP", "not SHAP" in detail["explanation_method"],
      detail["explanation_method"])
check("  recommended actions present", len(detail["recommended_actions"]) > 0,
      detail["recommended_actions"][0])

status, stats = call("GET", "/api/stats?scenario=HEAVY")
check("GET /api/stats", status == 200 and "critical_alerts" in stats,
      f"critical={stats['critical_alerts']} pop={stats['population_potentially_affected']:,}")

status, alerts = call("GET", "/api/alerts?scenario=HEAVY")
check("GET /api/alerts", status == 200 and isinstance(alerts, list), f"{len(alerts)} alerts")

status, impact = call("GET", "/api/impact/R17")
check("GET /api/impact/R17", status == 200 and impact["villages_affected"] == 2,
      f"{impact['population_isolated']:,} people, {impact['hospitals_affected']} hospital")

# --------------------------------------------------------------------------
print("\nSimulation")
status, sim = call("POST", "/api/simulate", {"scenario": "EXTREME"})
check("POST /api/simulate", status == 200 and len(sim["results"]) >= 10,
      f"{sim['scenario']['label']}, {sim['stats']['critical_alerts']} critical")

status, sim_one = call("POST", "/api/simulate", {"scenario": "HEAVY", "location_id": "R17"})
check("POST /api/simulate (single road)", status == 200 and len(sim_one["results"]) == 1,
      f"R17 {sim_one['results'][0]['risk_percentage']}%")

# --------------------------------------------------------------------------
print("\nDemo flow: scenario progression for R17")
call("POST", "/api/reports/reset")
progression = {}
for scenario in ("NORMAL", "HEAVY", "EXTREME"):
    _, detail = call("GET", f"/api/risk/R17?scenario={scenario}")
    progression[scenario] = (detail["risk_percentage"], detail["risk_level"])
    print(f"    {scenario:<8} {detail['risk_percentage']:>3}%  {detail['risk_level']}")

check("risk increases NORMAL -> HEAVY -> EXTREME",
      progression["NORMAL"][0] < progression["HEAVY"][0] < progression["EXTREME"][0])
check("R17 reaches CRITICAL under EXTREME", progression["EXTREME"][1] == "CRITICAL")

# --------------------------------------------------------------------------
print("\nDemo flow: field report -> new evidence -> updated risk")
status, result = call("POST", "/api/reports?scenario=HEAVY", {
    "location_id": "R17",
    "hazard_type": "New crack",
    "severity": "High",
    "description": "Fresh tension crack across the carriageway near the culvert.",
    "reporter": "PWD field officer",
})
check("POST /api/reports", status == 201,
      f"crack {result['crack_reports_before']} -> {result['crack_reports_after']}, "
      f"risk {result['risk_before']['risk_percentage']}% -> {result['risk_after']['risk_percentage']}%")
check("  crack count incremented",
      result["crack_reports_after"] == result["crack_reports_before"] + 1)
check("  risk did not decrease", result["risk_change"] >= 0, f"{result['risk_change']:+d} points")

status, non_crack = call("POST", "/api/reports?scenario=HEAVY", {
    "location_id": "R17", "hazard_type": "Rockfall", "severity": "Medium",
    "description": "Loose boulders on the shoulder.",
})
check("  non-crack report leaves features unchanged",
      status == 201 and non_crack["crack_reports_after"] == non_crack["crack_reports_before"])

status, body = call("POST", "/api/reports", {
    "location_id": "R99", "hazard_type": "New crack", "severity": "Low", "description": "x",
})
check("POST /api/reports unknown road -> 404", status == 404, body.get("detail", ""))

status, body = call("POST", "/api/reports", {
    "location_id": "R17", "hazard_type": "Earthquake", "severity": "Low", "description": "x",
})
check("POST /api/reports invalid hazard type -> 422", status == 422)

status, reports = call("GET", "/api/reports?location_id=R17")
check("GET /api/reports", status == 200 and len(reports) == 2, f"{len(reports)} reports")

status, cleared = call("POST", "/api/reports/reset")
check("POST /api/reports/reset", status == 200, cleared.get("message", ""))

_, after_reset = call("GET", "/api/locations/R17")
check("  crack count restored after reset", after_reset["terrain"]["crack_reports"] == 2,
      f"crack_reports={after_reset['terrain']['crack_reports']}")

# --------------------------------------------------------------------------
print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
