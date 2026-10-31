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


def build_system_query(hosts: list[str]) -> str:
    """All confirmed planets of the given host stars, so each star system is complete."""
    cols = ",".join(NASA_FIELDS)
    names = ",".join(_quote(h) for h in hosts)
    return f"select {cols} from ps where default_flag=1 and hostname in ({names})"


# Properties of the HOST STAR. Every planet of a system must carry identical values (one star, one set of numbers).
STAR_FIELDS = ["st_teff", "st_rad", "st_mass", "st_lum", "st_met", "st_spectype"]


def build_composite_query(hosts: list[str]) -> str:
    """Host-star properties and system distance from NASA's composite table (broader coverage than the default `ps` rows)."""
    names = ",".join(_quote(h) for h in hosts)
    cols = ",".join(["hostname", "pl_name", "sy_dist", *STAR_FIELDS])
    return f"select {cols} from pscomppars where hostname in ({names})"


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
    # Complete each star system (e.g. all seven TRAPPIST-1 planets), in chunks to keep URLs short.
    hosts = sorted({r["hostname"] for r in rows if r.get("hostname")})
    for i in range(0, len(hosts), 20):
        rows.extend(run_query(build_system_query(hosts[i:i + 20])))
    return _apply_composite(rows)


def _present(v) -> bool:
    return v is not None and v != ""


def consolidate_star_properties(ps_rows: list[dict], composite_rows: list[dict]) -> dict:
    """One value per star field for a host: NASA's composite table first (its most complete row, then the others in a
    fixed order), then the planets' own `ps` rows. Deterministic, so a system never mixes values from different planets."""
    comp = sorted(composite_rows, key=lambda r: str(r.get("pl_name", "")))
    best = sorted(comp, key=lambda r: -sum(_present(r.get(f)) for f in STAR_FIELDS))[:1]
    ordered = best + [r for r in comp if r not in best] + sorted(ps_rows, key=lambda r: str(r.get("pl_name", "")))
    out = {}
    for f in STAR_FIELDS:
        out[f] = next((r[f] for r in ordered if _present(r.get(f))), None)
    return out


def _apply_composite(rows: list[dict]) -> list[dict]:
    """Give every planet of a host the same star properties, and fill a missing system distance (flagged)."""
    hosts = sorted({r["hostname"] for r in rows if r.get("hostname")})
    composite: dict[str, list[dict]] = {}
    for i in range(0, len(hosts), 20):
        for r in run_query(build_composite_query(hosts[i:i + 20])):
            composite.setdefault(r["hostname"], []).append(r)

    for host in hosts:
        mine = [r for r in rows if r.get("hostname") == host]
        props = consolidate_star_properties(mine, composite.get(host, []))
        dist = next((r["sy_dist"] for r in composite.get(host, []) if _present(r.get("sy_dist"))), None)
        used_composite = any(_present(c.get(f)) and props[f] == c.get(f) for c in composite.get(host, []) for f in STAR_FIELDS)
        for r in mine:
            for f, v in props.items():
                r[f] = v
            r["_star_source"] = "pscomppars" if used_composite else "ps"
            if not _present(r.get("sy_dist")) and dist is not None:
                r["sy_dist"] = dist
                r["_distance_source"] = "pscomppars"
    return rows
