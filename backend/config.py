"""
SlopePulse backend - configuration.

Everything environment-specific lives here so no deployment detail is ever
hard-coded into a route. There are no secrets in this project; the only
environment variable that matters is the CORS allow-list.
"""

from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DISTRICT_JSON = PROJECT_ROOT / "data" / "district.json"

API_TITLE = "SlopePulse API"
API_VERSION = "0.3.0"
API_DESCRIPTION = (
    "AI landslide early-warning and response decision support. "
    "PROTOTYPE - all data is simulated."
)

# Origins allowed to call this API. Comma-separated in the environment.
# Local Next.js dev server is included by default so a fresh clone just works.
_DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

# Vercel generates a new hostname for every preview deployment, so matching the
# whole *.vercel.app space by regex avoids having to update ALLOWED_ORIGINS
# after each push. Production origins should still be listed explicitly above.
ALLOWED_ORIGIN_REGEX = r"https://.*\.vercel\.app"

# Largest photo the hazard-report endpoint will accept, as a base64 data URL.
# Photos are held in memory only - see services/district.py.
MAX_PHOTO_CHARS = 2_800_000  # ~2 MB of binary once base64-decoded
