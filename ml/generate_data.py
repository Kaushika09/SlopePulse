"""
SlopePulse - Synthetic training data generator.

Creates a physically-plausible synthetic dataset for landslide occurrence.

IMPORTANT / HONESTY NOTE
------------------------
This dataset is SIMULATED. It is not derived from GSI, ISRO, IMD or any
government landslide inventory. It is generated from a hand-written latent
risk function that encodes well-known qualitative relationships from
landslide literature (rainfall, slope, soil saturation, prior failures and
observed cracks all raise failure likelihood). Any model trained on it can
only demonstrate the pipeline, not real-world predictive accuracy.

Run:
    python ml/generate_data.py
Output:
    data/landslide_dataset.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_CSV = DATA_DIR / "landslide_dataset.csv"

RANDOM_SEED = 42
DEFAULT_ROWS = 1200

FEATURE_COLUMNS = [
    "rainfall_24h",
    "rainfall_72h",
    "slope",
    "soil_moisture",
    "historical_landslides",
    "crack_reports",
    "elevation",
    "land_cover",
]
TARGET_COLUMN = "landslide_occurred"

# Land cover -> integer code. Ordered roughly by slope-stability contribution:
# dense vegetation binds soil, bare/deforested ground sheds water fastest.
LAND_COVER_MAP = {
    "forest": 0,
    "shrubland": 1,
    "agriculture": 2,
    "settlement": 3,
    "barren": 4,
}
LAND_COVER_NAMES = list(LAND_COVER_MAP.keys())

# Additive contribution of each land cover class to the latent risk score.
LAND_COVER_RISK = {
    "forest": -0.55,
    "shrubland": -0.10,
    "agriculture": 0.25,
    "settlement": 0.35,
    "barren": 0.80,
}

# Realistic value ranges, also reused by the API for input validation.
FEATURE_RANGES = {
    "rainfall_24h": (0.0, 250.0),      # mm
    "rainfall_72h": (0.0, 500.0),      # mm
    "slope": (0.0, 60.0),              # degrees
    "soil_moisture": (5.0, 100.0),     # % volumetric saturation
    "historical_landslides": (0, 15),  # count of recorded past failures
    "crack_reports": (0, 10),          # count of open field/citizen reports
    "elevation": (200.0, 3000.0),      # m
}


def _normalise(value, low, high):
    """Scale a raw value into roughly 0..1 using its physical range."""
    return np.clip((value - low) / (high - low), 0.0, 1.0)


def generate_dataset(n_rows: int = DEFAULT_ROWS, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """
    Build the synthetic dataset.

    Features are generated with realistic *inter-dependencies* rather than
    independently, because independent sampling produces a dataset any model
    can separate trivially and which looks fake under questioning:

      * slope is correlated with elevation (higher terrain is steeper)
      * 72h rainfall is an accumulation of the 24h figure
      * soil moisture is largely driven by accumulated rainfall
      * past landslide counts are higher on steep, bare terrain
      * crack reports are more likely where terrain is already stressed
    """
    rng = np.random.default_rng(seed)

    # --- Terrain -----------------------------------------------------------
    elevation = rng.uniform(400, 2800, n_rows)

    # Steeper on average at altitude, with genuine spread.
    slope = np.clip(rng.normal(6 + elevation / 95.0, 6.5), 2.0, 58.0)

    land_cover = rng.choice(
        LAND_COVER_NAMES, size=n_rows, p=[0.34, 0.22, 0.20, 0.10, 0.14]
    )

    # --- Rainfall ----------------------------------------------------------
    # Mixture of dry / moderate / heavy monsoon days.
    regime = rng.choice([0, 1, 2], size=n_rows, p=[0.42, 0.38, 0.20])
    rainfall_24h = np.where(
        regime == 0,
        rng.uniform(0, 30, n_rows),
        np.where(
            regime == 1,
            rng.uniform(30, 95, n_rows),
            rng.uniform(95, 230, n_rows),
        ),
    )

    # 72h total always exceeds the 24h total; ratio varies with the weather.
    rainfall_72h = np.clip(
        rainfall_24h * rng.uniform(1.3, 2.7, n_rows) + rng.normal(0, 12, n_rows),
        rainfall_24h,
        500.0,
    )

    # --- Soil moisture -----------------------------------------------------
    # Driven by accumulated rain, damped slightly on well-drained steep slopes.
    soil_moisture = np.clip(
        22.0 + 0.145 * rainfall_72h - 0.06 * slope + rng.normal(0, 7, n_rows),
        8.0,
        99.0,
    )

    # --- Landslide history -------------------------------------------------
    hist_lambda = 0.30 + 7.0 * _normalise(slope, 2, 58) ** 2
    historical_landslides = np.clip(rng.poisson(hist_lambda), 0, 15)

    # --- Field crack reports ----------------------------------------------
    crack_lambda = (
        0.12
        + 0.26 * historical_landslides
        + 3.1 * _normalise(soil_moisture, 8, 99) ** 2
    )
    crack_reports = np.clip(rng.poisson(crack_lambda), 0, 10)

    # --- Latent risk -> label ---------------------------------------------
    n_rain24 = _normalise(rainfall_24h, 0, 230)
    n_rain72 = _normalise(rainfall_72h, 0, 450)
    n_slope = _normalise(slope, 2, 58)
    n_soil = _normalise(soil_moisture, 8, 99)
    n_hist = _normalise(historical_landslides, 0, 12)
    n_crack = _normalise(crack_reports, 0, 8)
    n_elev = _normalise(elevation, 400, 2800)

    land_cover_effect = np.array([LAND_COVER_RISK[c] for c in land_cover])

    latent = (
        -6.05
        + 1.55 * n_rain24
        + 2.35 * n_rain72
        + 2.55 * n_slope
        + 2.70 * n_soil
        + 1.35 * n_hist
        + 2.20 * n_crack
        + 0.45 * n_elev
        + land_cover_effect
        # Interaction: heavy accumulated rain on a steep face is the classic
        # failure mechanism, and is worth more than the sum of its parts.
        + 2.60 * n_rain72 * n_slope
        + 1.10 * n_soil * n_slope
    )

    # Irreducible noise: real slopes fail (or hold) for reasons we do not measure.
    latent = latent + rng.normal(0, 1.35, n_rows)

    probability = 1.0 / (1.0 + np.exp(-latent))
    landslide_occurred = (rng.uniform(0, 1, n_rows) < probability).astype(int)

    frame = pd.DataFrame(
        {
            "rainfall_24h": np.round(rainfall_24h, 1),
            "rainfall_72h": np.round(rainfall_72h, 1),
            "slope": np.round(slope, 1),
            "soil_moisture": np.round(soil_moisture, 1),
            "historical_landslides": historical_landslides,
            "crack_reports": crack_reports,
            "elevation": np.round(elevation, 0),
            "land_cover": land_cover,
            TARGET_COLUMN: landslide_occurred,
        }
    )
    return frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SlopePulse synthetic dataset")
    parser.add_argument("--rows", type=int, default=DEFAULT_ROWS)
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    frame = generate_dataset(args.rows, args.seed)
    frame.to_csv(OUTPUT_CSV, index=False)

    positives = int(frame[TARGET_COLUMN].sum())
    print(f"Wrote {len(frame)} rows -> {OUTPUT_CSV}")
    print(f"Landslide rate: {positives}/{len(frame)} = {positives / len(frame):.1%}")
    print("\nFeature summary:")
    print(frame.describe(include="all").T[["count", "mean", "min", "max"]])


if __name__ == "__main__":
    main()
