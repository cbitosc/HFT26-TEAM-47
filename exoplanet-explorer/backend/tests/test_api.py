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


def test_nasa_failure_returns_503(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CACHE_FILE", tmp_path / "none.json")

    def boom():
        raise nasa_client.NasaApiError("down")

    monkeypatch.setattr(cache, "fetch_raw_planets", boom)
    assert TestClient(app).get("/api/planets").status_code == 503


@pytest.mark.network
def test_live_nasa_connection():
    planets = normalize_planets(nasa_client.fetch_raw_planets())
    assert 30 <= len(planets) <= 50
    assert any(p["name"] == "Kepler-452 b" for p in planets)
