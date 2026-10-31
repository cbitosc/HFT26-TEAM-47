"""Normalize raw NASA Exoplanet Archive rows into the app's planet schema."""
import math
import re

PARSEC_TO_LIGHT_YEARS = 3.26156

# NASA column -> (output key, type)
FIELD_MAP = {
    "pl_name": ("name", str),
    "hostname": ("host_star", str),
    "pl_rade": ("radius_earth", float),
    "pl_bmasse": ("mass_earth", float),
    "pl_orbper": ("orbital_period_days", float),
    "pl_orbsmax": ("semi_major_axis_au", float),
    "pl_eqt": ("equilibrium_temperature_k", float),
    "st_teff": ("star_temperature_k", float),
    "st_rad": ("star_radius_solar", float),
    "st_mass": ("star_mass_solar", float),
    "st_lum": ("star_luminosity_log_solar", float),  # log10(L / L_sun), as published by NASA
    "st_spectype": ("star_spectral_type", str),
    "st_met": ("star_metallicity_dex", float),  # [Fe/H], informational only
    "pl_orbeccen": ("eccentricity", float),
    "pl_insol": ("insolation_earth", float),  # incident flux, Earth = 1
    "sy_pnum": ("system_planet_count", int),
    "glon": ("galactic_longitude_deg", float),  # sky position of the system, used to place it in the Milky Way
    "glat": ("galactic_latitude_deg", float),
    "sy_dist": ("distance_parsecs", float),
    "discoverymethod": ("discovery_method", str),
    "disc_year": ("discovery_year", int),
}
NASA_FIELDS = list(FIELD_MAP)


def make_id(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def parsecs_to_light_years(pc):
    return None if pc is None else round(pc * PARSEC_TO_LIGHT_YEARS, 2)


def to_value(value, kind):
    """Convert a raw value; anything missing or unparseable becomes None."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    try:
        if kind is str:
            return str(value).strip()
        num = float(value)
        if math.isnan(num) or math.isinf(num):
            return None
        return int(num) if kind is int else round(num, 4)
    except (TypeError, ValueError):
        return None


def normalize_planet(row: dict) -> dict | None:
    planet = {key: to_value(row.get(col), kind) for col, (key, kind) in FIELD_MAP.items()}
    if not planet["name"]:
        return None
    planet["distance_light_years"] = parsecs_to_light_years(planet["distance_parsecs"])
    # Where the distance came from: the planet's own record ("ps") or NASA's composite table filled in a gap.
    planet["star_data_source"] = row.get("_star_source", "ps")  # "ps", or "pscomppars" when NASA's composite table supplied the star's values
    planet["distance_source"] = row.get("_distance_source", "ps") if planet["distance_parsecs"] is not None else None
    return {"id": make_id(planet["name"]), **planet}


def normalize_planets(rows: list[dict]) -> list[dict]:
    """Normalize and de-duplicate by id (first occurrence wins)."""
    seen, result = set(), []
    for row in rows:
        planet = normalize_planet(row)
        if planet and planet["id"] not in seen:
            seen.add(planet["id"])
            result.append(planet)
    return result
