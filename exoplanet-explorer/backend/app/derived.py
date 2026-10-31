"""Values NASA does not report for a planet but that follow directly from values it does report.

Only textbook physics, never a guess, and every derived value is listed in the planet's `derived_fields` so the app
can label it. Nothing is derived from the habitability screening itself, and mass is never estimated.

- semi-major axis: Kepler's third law, a^3 = M_star * P^2 (AU, solar masses, years)
- equilibrium temperature: T = T_star * sqrt(R_star / (2 a)), zero Bond albedo (the convention NASA's own pl_eqt uses)
- insolation: S = L_star / a^2 (Earth = 1), with L_star from NASA, or from R_star and T_star
"""
import math

R_SUN_AU = 0.00465047  # solar radius in AU
T_SUN_K = 5772.0


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) else None


def _luminosity(p):
    log_l = _num(p.get("star_luminosity_log_solar"))
    if log_l is not None:
        return 10 ** log_l
    r, t = _num(p.get("star_radius_solar")), _num(p.get("star_temperature_k"))
    return r * r * (t / T_SUN_K) ** 4 if r and t else None


def derive_missing(planet: dict) -> dict:
    """Return the planet with missing orbit/temperature/flux values filled in where physics allows (idempotent)."""
    if "derived_fields" in planet:
        return planet
    derived = []

    a = _num(planet.get("semi_major_axis_au"))
    if a is None:
        period, mass = _num(planet.get("orbital_period_days")), _num(planet.get("star_mass_solar"))
        if period and mass and period > 0 and mass > 0:
            a = round((mass * (period / 365.25) ** 2) ** (1 / 3), 5)
            planet["semi_major_axis_au"] = a
            derived.append("semi_major_axis_au")

    if a and a > 0:
        if _num(planet.get("equilibrium_temperature_k")) is None:
            t, r = _num(planet.get("star_temperature_k")), _num(planet.get("star_radius_solar"))
            if t and r:
                planet["equilibrium_temperature_k"] = round(t * math.sqrt(r * R_SUN_AU / (2 * a)), 1)
                derived.append("equilibrium_temperature_k")
        if _num(planet.get("insolation_earth")) is None:
            lum = _luminosity(planet)
            if lum:
                planet["insolation_earth"] = round(lum / (a * a), 4)
                derived.append("insolation_earth")

    planet["derived_fields"] = derived
    return planet


def with_derived(payload: dict) -> dict:
    payload["planets"] = [derive_missing(p) for p in payload.get("planets", [])]
    return payload
