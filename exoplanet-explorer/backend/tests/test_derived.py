import pytest

from app.derived import derive_missing


def planet(**kw):
    base = {"semi_major_axis_au": None, "equilibrium_temperature_k": None, "insolation_earth": None, "orbital_period_days": None,
            "star_mass_solar": None, "star_temperature_k": None, "star_radius_solar": None, "star_luminosity_log_solar": None}
    return {**base, **kw}


def test_earth_around_the_sun():
    p = derive_missing(planet(orbital_period_days=365.25, star_mass_solar=1.0, star_temperature_k=5772, star_radius_solar=1.0))
    assert p["semi_major_axis_au"] == pytest.approx(1.0, abs=1e-4)
    assert p["equilibrium_temperature_k"] == pytest.approx(278.6, abs=0.5)  # zero-albedo value for 1 AU
    assert p["insolation_earth"] == pytest.approx(1.0, abs=1e-3)
    assert p["derived_fields"] == ["semi_major_axis_au", "equilibrium_temperature_k", "insolation_earth"]


def test_reported_values_are_never_overwritten():
    p = derive_missing(planet(semi_major_axis_au=0.5, equilibrium_temperature_k=300, insolation_earth=2.0, orbital_period_days=365.25,
                              star_mass_solar=1.0, star_temperature_k=5772, star_radius_solar=1.0))
    assert (p["semi_major_axis_au"], p["equilibrium_temperature_k"], p["insolation_earth"]) == (0.5, 300, 2.0)
    assert p["derived_fields"] == []


def test_missing_inputs_leave_values_missing():
    p = derive_missing(planet(orbital_period_days=10))  # no star mass: no orbit, so nothing else either
    assert p["semi_major_axis_au"] is None and p["equilibrium_temperature_k"] is None and p["derived_fields"] == []
    q = derive_missing(planet(semi_major_axis_au=1.0, star_temperature_k=5772))  # no star radius
    assert q["equilibrium_temperature_k"] is None
    assert derive_missing(planet(mass_earth=None))["derived_fields"] == []


def test_luminosity_prefers_nasa_value_and_is_idempotent():
    p = derive_missing(planet(semi_major_axis_au=2.0, star_luminosity_log_solar=0.0, star_temperature_k=1000, star_radius_solar=1.0))
    assert p["insolation_earth"] == pytest.approx(0.25, abs=1e-3)
    again = derive_missing(dict(p))
    assert again["derived_fields"] == p["derived_fields"]
