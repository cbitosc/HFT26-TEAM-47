import json

import pytest
from fastapi.testclient import TestClient

from app import cache, config, nasa_client
from app.main import app
from app.processing import make_id, normalize_planets, parsecs_to_light_years

RAW = [
    {"pl_name": "Kepler-452 b", "hostname": "Kepler-452", "pl_rade": 1.63, "pl_bmasse": None, "pl_orbper": "384.843",
     "pl_orbsmax": 1.046, "pl_eqt": 265, "st_teff": 5757, "sy_dist": 551.7, "discoverymethod": "Transit", "disc_year": 2015},
    {"pl_name": "Kepler-452 b", "hostname": "dup"},
    {"pl_name": "51 Peg b", "hostname": "51 Peg", "pl_rade": "", "sy_dist": "nan", "disc_year": "1995"},
    {"pl_name": None},
]


def test_normalization():
    planets = normalize_planets(RAW)
    assert [p["id"] for p in planets] == ["kepler-452-b", "51-peg-b"]
    k = planets[0]
    assert k["mass_earth"] is None and k["orbital_period_days"] == 384.843 and k["discovery_year"] == 2015
    assert k["host_star"] == "Kepler-452"
    p51 = planets[1]
    assert p51["radius_earth"] is None and p51["distance_parsecs"] is None and p51["distance_light_years"] is None
    assert p51["discovery_year"] == 1995 and p51["mass_earth"] is None


def test_helpers():
    assert make_id("TRAPPIST-1 e") == "trappist-1-e"
    assert parsecs_to_light_years(1) == 3.26 and parsecs_to_light_years(None) is None


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CACHE_FILE", tmp_path / "cache.json")
    calls = {"n": 0}

    def fake_fetch():
        calls["n"] += 1
        return RAW

    monkeypatch.setattr(cache, "fetch_raw_planets", fake_fetch)
    c = TestClient(app)
    c.calls = calls
    return c


def test_endpoints_and_caching(client):
    r = client.get("/api/planets")
    assert r.status_code == 200 and r.json()["count"] == 2
    assert len(json.loads(config.CACHE_FILE.read_text())["planets"]) == 2
    client.get("/api/planets")
    assert client.calls["n"] == 1  # second request served from cache
    assert client.get("/api/planets/kepler-452-b").json()["host_star"] == "Kepler-452"
    assert client.get("/api/planets/nope").status_code == 404
    names = [p["name"] for p in client.get("/api/planets/featured").json()["planets"]]
    assert names == ["Kepler-452 b", "51 Peg b"]
    h = client.get("/api/health").json()
    assert h["data_available"] and h["planet_count"] == 2


def test_old_schema_cache_is_stale(client):
    config.CACHE_FILE.write_text(json.dumps({"fetched_at": 9e12, "planets": [{"id": "x"}]}))
    assert cache.is_stale(cache.read_cache())
    client.get("/api/planets")
    assert client.calls["n"] == 1  # refetched despite a "fresh" timestamp


def test_star_fields_normalized():
    p = normalize_planets([{"pl_name": "A b", "st_lum": "-3.25", "st_rad": 0.12, "st_spectype": "M5.5 V",
                            "sy_pnum": "7", "pl_orbeccen": ""}])[0]
    assert p["star_luminosity_log_solar"] == -3.25 and p["star_radius_solar"] == 0.12
    assert p["star_spectral_type"] == "M5.5 V" and p["system_planet_count"] == 7 and p["eccentricity"] is None


def test_nasa_failure_returns_503(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CACHE_FILE", tmp_path / "none.json")

    def boom():
        raise nasa_client.NasaApiError("down")

    monkeypatch.setattr(cache, "fetch_raw_planets", boom)
    assert TestClient(app).get("/api/planets").status_code == 503


@pytest.mark.network
def test_live_nasa_connection():
    planets = normalize_planets(nasa_client.fetch_raw_planets())
    assert 40 <= len(planets) <= 250
    assert any(p["name"] == "Kepler-452 b" for p in planets)
    # systems are complete: TRAPPIST-1 has seven known planets
    assert sum(1 for p in planets if p["host_star"] == "TRAPPIST-1") >= 7


def test_system_query_quotes_and_filters():
    q = nasa_client.build_system_query(["TRAPPIST-1", "Barnard's Star"])
    assert "hostname in ('TRAPPIST-1','Barnard''s Star')" in q and "default_flag=1" in q


def test_fetch_expands_to_whole_systems(monkeypatch):
    calls = []

    def fake_run(adql, timeout=30.0):
        calls.append(adql)
        if "hostname in" in adql:
            return [{"pl_name": "A b", "hostname": "A"}, {"pl_name": "A c", "hostname": "A"}]
        return [{"pl_name": "A b", "hostname": "A"}]

    monkeypatch.setattr(nasa_client, "run_query", fake_run)
    planets = normalize_planets(nasa_client.fetch_raw_planets())
    assert [p["name"] for p in planets] == ["A b", "A c"]  # duplicate A b removed
    assert any("hostname in" in c for c in calls)


def test_galactic_coordinates_normalized():
    p = normalize_planets([{"pl_name": "A b", "hostname": "A", "glon": "69.715", "glat": -56.649, "sy_dist": 12.4}])[0]
    assert p["galactic_longitude_deg"] == 69.715 and p["galactic_latitude_deg"] == -56.649
    assert p["distance_source"] == "ps"
    assert normalize_planets([{"pl_name": "B b"}])[0]["distance_source"] is None  # nothing known -> no source claimed


def test_composite_fills_distance_and_makes_star_properties_consistent(monkeypatch):
    def fake_run(adql, timeout=30.0):
        if "pscomppars" in adql:
            return [
                {"hostname": "K", "pl_name": "K c", "sy_dist": 100.0, "st_teff": 3788, "st_rad": 0.52, "st_mass": None, "st_lum": -1.3, "st_met": -0.28, "st_spectype": "M1"},
                {"hostname": "K", "pl_name": "K b", "sy_dist": 100.0, "st_teff": 3755, "st_rad": 0.47, "st_mass": 0.54, "st_lum": -1.26, "st_met": -0.26, "st_spectype": "M1"},
                {"hostname": "T", "pl_name": "T e", "sy_dist": 12.43, "st_teff": 2566, "st_rad": 0.119, "st_mass": 0.09, "st_lum": -3.26, "st_met": 0.05, "st_spectype": "M8.0 V"},
            ]
        if "hostname in" in adql:
            return []
        return [
            {"pl_name": "K b", "hostname": "K", "st_teff": 9999, "glon": 78.5, "glat": 8.2, "sy_dist": 177.6},
            {"pl_name": "K c", "hostname": "K", "st_teff": 1111, "glon": 78.5, "glat": 8.2, "sy_dist": 177.6},
            {"pl_name": "T e", "hostname": "T", "glon": 69.7, "glat": -56.6},
        ]

    monkeypatch.setattr(nasa_client, "run_query", fake_run)
    planets = normalize_planets(nasa_client.fetch_raw_planets())
    by = {p["name"]: p for p in planets}
    # one set of star values per host: both K planets agree, taken from NASA's most complete composite row
    assert by["K b"]["star_temperature_k"] == by["K c"]["star_temperature_k"] == 3755
    assert by["K b"]["star_mass_solar"] == by["K c"]["star_mass_solar"] == 0.54
    assert by["K b"]["star_metallicity_dex"] == -0.26 and by["K b"]["star_spectral_type"] == "M1"
    assert by["K b"]["star_data_source"] == "pscomppars"
    # a missing distance is filled from the composite table and flagged; an existing one is left alone
    t = by["T e"]
    assert t["distance_parsecs"] == 12.43 and t["distance_source"] == "pscomppars" and t["star_temperature_k"] == 2566
    assert by["K b"]["distance_source"] == "ps" and by["K b"]["distance_parsecs"] == 177.6


def test_consolidation_never_invents_values_and_falls_back_to_ps_rows():
    props = nasa_client.consolidate_star_properties(
        [{"pl_name": "A b", "st_teff": 5000, "st_rad": 0.9}], [{"pl_name": "A b", "st_teff": None, "st_mass": 0.8}])
    assert props["st_teff"] == 5000 and props["st_mass"] == 0.8 and props["st_rad"] == 0.9
    assert props["st_lum"] is None and props["st_spectype"] is None and props["st_met"] is None


def test_seed_snapshot_is_served_when_nasa_is_down_and_there_is_no_cache(tmp_path, monkeypatch):
    import json
    from app import cache, config
    seed = tmp_path / "seed.json"
    seed.write_text(json.dumps({"schema_version": cache.SCHEMA_VERSION, "fetched_at": 0, "planets": [{"id": "x-b", "name": "X b"}]}))
    monkeypatch.setattr(config, "CACHE_FILE", tmp_path / "missing_cache.json")
    monkeypatch.setattr(config, "SEED_FILE", seed)
    monkeypatch.setattr(cache, "_last_refresh_failure", 0.0)
    calls = []
    monkeypatch.setattr(cache, "fetch_raw_planets", lambda: (calls.append(1), (_ for _ in ()).throw(RuntimeError("NASA down")))[1])
    assert [p["id"] for p in cache.get_dataset()["planets"]] == ["x-b"]
    assert [p["id"] for p in cache.get_dataset()["planets"]] == ["x-b"]
    assert len(calls) == 1  # the second request did not retry NASA
