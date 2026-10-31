"""JSON file cache for the normalized dataset."""
import json
import time

from . import config
from .nasa_client import fetch_raw_planets
from .derived import with_derived
from .processing import normalize_planets


def read_cache() -> dict | None:
    try:
        return json.loads(config.CACHE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


# Bump when the normalized planet schema changes so old caches are refetched.
SCHEMA_VERSION = 5  # v3: every planet of each host star; v4: galactic coordinates + distance backfill; v5: consistent per-host star properties + metallicity


def write_cache(planets: list[dict]) -> dict:
    payload = {"schema_version": SCHEMA_VERSION, "fetched_at": time.time(),
               "source": "NASA Exoplanet Archive (ps table)", "planets": planets}
    config.CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    config.CACHE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def is_stale(payload: dict) -> bool:
    if payload.get("schema_version") != SCHEMA_VERSION:
        return True
    return time.time() - payload.get("fetched_at", 0) > config.CACHE_MAX_AGE_HOURS * 3600


def refresh() -> dict:
    return write_cache(normalize_planets(fetch_raw_planets()))


def get_dataset(force_refresh: bool = False) -> dict:
    """Return cached data; refetch from NASA when missing/stale. Falls back to stale cache on failure.
    Values NASA omits but physics gives (orbit size, equilibrium temperature, flux) are derived and labelled."""
    cached = read_cache()
    if cached and not force_refresh and not is_stale(cached):
        return with_derived(cached)
    try:
        return with_derived(refresh())
    except Exception:
        if cached:
            return with_derived(cached)
        raise
