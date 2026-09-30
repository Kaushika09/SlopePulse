"""
SlopePulse - Demo sanity check.

Scores every road in the simulated district under all three scenarios and
prints the resulting risk bands. Use this after any change to the dataset,
model or scenario values to confirm the demo still tells the intended story:

  * R17 rises NORMAL -> HEAVY -> EXTREME and reaches CRITICAL
  * at least 2 CRITICAL and 3 HIGH locations exist under EXTREME
  * the district is not uniformly red under NORMAL

Run:  python ml/scenario_check.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.predict import predict_risk  # noqa: E402
from ml.scenarios import SCENARIO_ORDER, build_features  # noqa: E402

DISTRICT = Path(__file__).resolve().parents[1] / "data" / "district.json"


def main() -> None:
    district = json.loads(DISTRICT.read_text())
    roads = district["roads"]

    header = f"{'ROAD':<6}" + "".join(f"{s:<22}" for s in SCENARIO_ORDER)
    print(header)
    print("-" * len(header))

    tallies = {scenario: {} for scenario in SCENARIO_ORDER}

    for road in roads:
        line = f"{road['id']:<6}"
        for scenario in SCENARIO_ORDER:
            result = predict_risk(build_features(road, scenario))
            level = result["risk_level"]
            tallies[scenario][level] = tallies[scenario].get(level, 0) + 1
            line += f"{result['risk_percentage']:>3}%  {level:<15}"
        print(line)

    print("\nBand counts per scenario:")
    for scenario in SCENARIO_ORDER:
        counts = tallies[scenario]
        summary = "  ".join(
            f"{level}={counts.get(level, 0)}"
            for level in ("CRITICAL", "HIGH", "MODERATE", "LOW")
        )
        print(f"  {scenario:<8} {summary}")


if __name__ == "__main__":
    main()
