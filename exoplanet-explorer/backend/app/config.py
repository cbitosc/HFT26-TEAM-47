import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

NASA_TAP_URL = os.getenv("NASA_TAP_URL", "https://exoplanetarchive.ipac.caltech.edu/TAP/sync")
CACHE_FILE = BASE_DIR / os.getenv("CACHE_FILE", "data/planets_cache.json")
CACHE_MAX_AGE_HOURS = float(os.getenv("CACHE_MAX_AGE_HOURS", "24"))
NEARBY_LIMIT = int(os.getenv("NEARBY_LIMIT", "40"))
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]

# NASA Archive names for curated featured planets (shown only if present in the fetched data).
FEATURED_NAMES = [
    "TRAPPIST-1 e", "Proxima Cen b", "Kepler-452 b",
    "TOI-700 d", "51 Peg b", "Kepler-186 f",
]
