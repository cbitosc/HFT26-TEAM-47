"""Fetch confirmed exoplanets from the NASA Exoplanet Archive TAP service (ps table)."""
import httpx

from . import config
from .processing import NASA_FIELDS


class NasaApiError(Exception):
    pass


def _quote(name: str) -> str:
    return "'" + name.replace("'", "''") + "'"


def build_queries() -> list[str]:
    cols = ",".join(NASA_FIELDS)
    # The ps table only holds confirmed planets; default_flag=1 picks one parameter set per planet.
    featured = ",".join(_quote(n) for n in config.FEATURED_NAMES)
    return [
        f"select {cols} from ps where default_flag=1 and pl_name in ({featured})",
        f"select top {config.NEARBY_LIMIT} {cols} from ps "
        "where default_flag=1 and sy_dist is not null and pl_rade is not null order by sy_dist asc",
    ]


def run_query(adql: str, timeout: float = 30.0) -> list[dict]:
    try:
        resp = httpx.get(config.NASA_TAP_URL, params={"query": adql, "format": "json"}, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise NasaApiError(f"NASA TAP request failed: {exc}") from exc
    if not isinstance(data, list):
        raise NasaApiError("Unexpected NASA TAP response format")
    return data


def fetch_raw_planets() -> list[dict]:
    rows = []
    for q in build_queries():
        rows.extend(run_query(q))
    return rows
