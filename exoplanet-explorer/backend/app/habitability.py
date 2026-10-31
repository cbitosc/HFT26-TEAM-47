"""Educational habitability screening: Python port of frontend/src/utils/habitabilityCalculations.js.

Kept in step with the JS version (same thresholds, same rounding) so the AI describes exactly what the
dashboard shows. It is a screening aid, NOT a measure of habitability or probability of life.
"""
import math

SOLAR_TEFF_K = 5772
WEIGHTS = {"habitable_zone": 35, "temperature": 30, "planet_size": 20, "data_completeness": 15}
TEMP_BANDS = {"ideal_min": 200, "ideal_max": 300, "zero_low": 100, "zero_high": 400}
SIZE_BANDS = [  # (upper radius bound in R_earth, points of 20, label)
    (0.3, 5, "very small"), (0.5, 12, "small rocky-sized"), (1.6, 20, "rocky-planet-sized"),
    (2.0, 10, "super-Earth (transitional)"), (4.0, 4, "sub-Neptune"), (math.inf, 0, "giant planet"),
]
HZ_TEFF_RANGE = (2600, 7200)
# Kopparapu et al. (2013), Table 3: S0, a, b, c, d
KOPPARAPU = {
    "recent_venus": (1.7753, 1.4316e-4, 2.9875e-9, -7.5702e-12, -1.1635e-15),
    "moist_greenhouse": (1.0140, 8.1774e-5, 1.7063e-9, -4.3241e-12, -6.6462e-16),
    "max_greenhouse": (0.3438, 5.8942e-5, 1.6558e-9, -3.0045e-12, -5.2983e-16),
    "early_mars": (0.3179, 5.4513e-5, 1.5313e-9, -2.7786e-12, -4.8997e-16),
}


def _num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _round(x: float) -> int:
    return math.floor(x + 0.5)  # JS Math.round semantics (half up), not banker's rounding


def stellar_luminosity(p: dict):
    """(value in L_sun, 'reported' | 'derived') or None. Derived via Stefan-Boltzmann from R and Teff."""
    if _num(p.get("star_luminosity_log_solar")):
        return 10 ** p["star_luminosity_log_solar"], "reported"
    if _num(p.get("star_radius_solar")) and _num(p.get("star_temperature_k")):
        return p["star_radius_solar"] ** 2 * (p["star_temperature_k"] / SOLAR_TEFF_K) ** 4, "derived"
    return None


def _au(coeffs, teff, lum):
    t = teff - 5780
    s0, a, b, c, d = coeffs
    return math.sqrt(lum / (s0 + a * t + b * t**2 + c * t**3 + d * t**4))


def habitable_zone_bounds(teff, lum):
    if not _num(teff) or not _num(lum) or lum <= 0 or not HZ_TEFF_RANGE[0] <= teff <= HZ_TEFF_RANGE[1]:
        return None
    return {
        "conservative": (_au(KOPPARAPU["moist_greenhouse"], teff, lum), _au(KOPPARAPU["max_greenhouse"], teff, lum)),
        "optimistic": (_au(KOPPARAPU["recent_venus"], teff, lum), _au(KOPPARAPU["early_mars"], teff, lum)),
    }


def _unknown(reason):
    return {"available": False, "score": None, "status": "unknown", "note": reason}


def temperature_indicator(p):
    t = p.get("equilibrium_temperature_k")
    if not _num(t):
        return _unknown("NASA reports no equilibrium temperature")
    b = TEMP_BANDS
    if b["ideal_min"] <= t <= b["ideal_max"]:
        frac, status = 1.0, "within the 200-300 K comfortable band"
    elif t < b["ideal_min"]:
        frac, status = max(0.0, (t - b["zero_low"]) / (b["ideal_min"] - b["zero_low"])), "colder than the comfortable band"
    else:
        frac, status = max(0.0, (b["zero_high"] - t) / (b["zero_high"] - b["ideal_max"])), "hotter than the comfortable band"
    return {"available": True, "score": _round(frac * WEIGHTS["temperature"] * 10) / 10, "status": status}


def habitable_zone_indicator(p):
    a = p.get("semi_major_axis_au")
    if not _num(a):
        return _unknown("semi-major axis not reported")
    lum = stellar_luminosity(p)
    if not lum:
        return _unknown("stellar luminosity (or radius to derive it) not reported")
    if not _num(p.get("star_temperature_k")):
        return _unknown("host star temperature not reported")
    zone = habitable_zone_bounds(p["star_temperature_k"], lum[0])
    if not zone:
        return _unknown(f"star outside the habitable-zone model's valid range ({HZ_TEFF_RANGE[0]}-{HZ_TEFF_RANGE[1]} K)")
    (ci, co), (oi, oo) = zone["conservative"], zone["optimistic"]
    if ci <= a <= co:
        score, status = WEIGHTS["habitable_zone"], "inside the conservative habitable zone"
    elif oi <= a <= oo:
        score, status = _round(WEIGHTS["habitable_zone"] * 0.65), "inside the optimistic habitable zone only"
    else:
        score, status = 0, "closer to the star than the habitable zone" if a < oi else "farther from the star than the habitable zone"
    return {"available": True, "score": score, "status": status, "zone": zone, "luminosity_source": lum[1]}


def size_indicator(p):
    r = p.get("radius_earth")
    if not _num(r):
        return _unknown("radius not reported")
    for upper, points, label in SIZE_BANDS:
        if r < upper:
            return {"available": True, "score": _round(points / 20 * WEIGHTS["planet_size"]), "status": label}


def completeness(p):
    checks = {
        "radius": _num(p.get("radius_earth")), "mass": _num(p.get("mass_earth")),
        "equilibrium temperature": _num(p.get("equilibrium_temperature_k")),
        "orbital distance": _num(p.get("semi_major_axis_au")),
        "stellar temperature & luminosity": _num(p.get("star_temperature_k")) and stellar_luminosity(p) is not None,
    }
    count = sum(checks.values())
    return {"present": [k for k, v in checks.items() if v], "missing": [k for k, v in checks.items() if not v],
            "count": count, "total": len(checks), "score": _round(count / len(checks) * WEIGHTS["data_completeness"] * 10) / 10}


def calculate_habitability(p: dict) -> dict:
    ind = {"temperature": temperature_indicator(p), "habitable_zone": habitable_zone_indicator(p), "planet_size": size_indicator(p)}
    comp = completeness(p)
    known = [i for i in ind.values() if i["available"]]
    unknown = [k for k, i in ind.items() if not i["available"]]
    out = {"indicators": ind, "completeness": comp, "unknown": unknown, "total": None, "category": "Insufficient data"}
    if len(known) < 2:
        return out
    total = _round(sum(i["score"] for i in known) + comp["score"])
    cat = "Higher" if total >= 70 else "Moderate" if total >= 40 else "Lower"
    if unknown and cat == "Higher":
        cat = "Moderate"
    out.update(total=total, category=f"{cat} screening suitability")
    return out
