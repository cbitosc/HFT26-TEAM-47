import httpx
import pytest
from fastapi.testclient import TestClient

from app import astronomer, cache, config, featherless_client
from app.habitability import calculate_habitability, habitable_zone_bounds
from app.main import app
from app.processing import normalize_planets

SECRET = "sk-test-secret-key-123"

# Raw NASA-style rows. Values for the three real planets were taken from the NASA Exoplanet Archive.
RAW = [
    {"pl_name": "TRAPPIST-1 e", "hostname": "TRAPPIST-1", "pl_rade": 0.92, "pl_bmasse": 0.692, "pl_orbper": 6.1,
     "pl_orbsmax": 0.02925, "st_teff": 2566, "st_rad": 0.1192, "st_mass": 0.0898, "st_lum": -3.25727,
     "sy_pnum": 7, "discoverymethod": "Transit", "disc_year": 2017},
    {"pl_name": "Kepler-452 b", "hostname": "Kepler-452", "pl_rade": 1.63, "pl_orbper": 384.843, "pl_orbsmax": 1.046,
     "pl_eqt": 265, "st_teff": 5757, "st_rad": 1.11, "sy_dist": 551.727, "discoverymethod": "Transit", "disc_year": 2015},
    {"pl_name": "Proxima Cen b", "hostname": "Proxima Cen", "pl_bmasse": 1.055, "pl_orbper": 11.1846, "pl_orbsmax": 0.04848,
     "pl_eqt": 218, "st_teff": 2900, "st_rad": 0.141, "st_lum": -2.82102, "sy_dist": 1.30119},
    {"pl_name": "Kepler-186 f", "hostname": "Kepler-186", "pl_rade": 1.17, "pl_orbsmax": 0.432, "st_teff": 3755,
     "st_rad": 0.523, "st_lum": -1.26},
]


class FakeResponse:
    def __init__(self, status=200, payload=None, headers=None):
        self.status_code, self._payload, self.headers = status, payload, headers or {}

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


def ok(text="Hello from the model."):
    return FakeResponse(200, {"choices": [{"message": {"content": text}}]})


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CACHE_FILE", tmp_path / "cache.json")
    monkeypatch.setattr(cache, "fetch_raw_planets", lambda: RAW)
    monkeypatch.setattr(config, "FEATHERLESS_API_KEY", SECRET)
    return TestClient(app)


@pytest.fixture
def llm(monkeypatch):
    """Replace the outbound HTTP call; records what would be sent to Featherless."""
    calls = []
    state = {"response": ok()}

    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append({"url": url, "headers": headers, "json": json, "timeout": timeout})
        if isinstance(state["response"], Exception):
            raise state["response"]
        return state["response"]

    monkeypatch.setattr(featherless_client.httpx, "post", fake_post)
    return type("LLM", (), {"calls": calls, "state": state})


def system_of(llm):
    return llm.calls[-1]["json"]["messages"][0]["content"]


# ---- habitability port (mirrors the frontend tests) --------------------------------------------

def test_hz_bounds_for_sun_match_published_values():
    z = habitable_zone_bounds(5772, 1)
    assert z["conservative"][0] == pytest.approx(0.99, abs=0.02)
    assert z["conservative"][1] == pytest.approx(1.70, abs=0.04)
    assert habitable_zone_bounds(2566, 0.0005) is None  # outside 2600-7200 K


def test_habitability_matches_frontend_results_on_real_planets():
    by = {p["name"]: p for p in normalize_planets(RAW)}
    k = calculate_habitability(by["Kepler-452 b"])
    assert (k["total"], k["category"]) == (75, "Higher screening suitability")
    assert k["indicators"]["habitable_zone"]["luminosity_source"] == "derived"
    px = calculate_habitability(by["Proxima Cen b"])
    assert px["total"] == 77 and px["category"] == "Moderate screening suitability" and px["unknown"] == ["planet_size"]
    assert calculate_habitability(by["Kepler-186 f"])["total"] == 64
    t = calculate_habitability(by["TRAPPIST-1 e"])
    assert t["total"] is None and t["category"] == "Insufficient data"


# ---- grounding -------------------------------------------------------------------------------

def test_planet_data_comes_from_backend_and_unavailable_is_explicit(client, llm):
    r = client.post("/api/astronomer/chat", json={"message": "Tell me about this planet", "planet_id": "kepler-452-b"})
    assert r.status_code == 200
    body = r.json()
    assert body["reply"] == "Hello from the model." and body["planet_id"] == "kepler-452-b" and body["compared_planet_ids"] == []
    s = system_of(llm)
    assert "SELECTED PLANET" in s and "Kepler-452 b" in s
    assert "Radius: 1.63 Earth radii" in s and "Orbital period: 384.843 days" in s
    assert "Mass: UNAVAILABLE" in s and "Equilibrium temperature: 265 K" in s and "Temperature suitability: 30/30" in s
    assert "1799.49 light-years" in s
    assert "75/100" in s and "educational screening" in s.lower()
    assert "Never invent missing measurements" in s


def test_conversions_precomputed_so_model_does_no_arithmetic(client, llm):
    client.post("/api/astronomer/chat", json={"message": "hi", "planet_id": "kepler-452-b"})
    s = system_of(llm)
    assert "265 K = -8.1 degrees C" in s and "384.843 days = 1.054 Earth years" in s


def test_truncated_reply_is_flagged(client, llm):
    llm.state["response"] = FakeResponse(200, {"choices": [{"message": {"content": "Partial answer, and the"}, "finish_reason": "length"}]})
    reply = client.post("/api/astronomer/chat", json={"message": "hi"}).json()["reply"]
    assert reply.startswith("Partial answer") and "cut short" in reply


def test_unavailable_indicators_listed(client, llm):
    client.post("/api/astronomer/chat", json={"message": "Could it support water?", "planet_id": "trappist-1-e"})
    s = system_of(llm)
    # NASA omits the temperature, so exoverse derives it from the star and orbit and says so; mass stays unavailable
    assert "Equilibrium temperature: " in s and "derived by exoverse" in s and "UNAVAILABLE" in s
    assert "outside the habitable-zone model" in s


def test_nothing_derivable_stays_unavailable(client, llm):
    client.post("/api/astronomer/chat", json={"message": "Tell me", "planet_id": "kepler-186-f"})
    s = system_of(llm)
    assert "Orbital period: UNAVAILABLE" in s and "Mass: UNAVAILABLE" in s


def test_selected_planet_switch_changes_context(client, llm):
    client.post("/api/astronomer/chat", json={"message": "Explain", "planet_id": "trappist-1-e"})
    first = system_of(llm)
    client.post("/api/astronomer/chat", json={"message": "Explain", "planet_id": "proxima-cen-b"})
    second = system_of(llm)
    assert "SELECTED PLANET (the planet the user is currently exploring): TRAPPIST-1 e" in first
    assert "SELECTED PLANET (the planet the user is currently exploring): Proxima Cen b" in second
    assert "TRAPPIST-1 e" not in second  # only the selected planet's record is sent, not the dataset


def test_whole_dataset_is_never_sent(client, llm):
    client.post("/api/astronomer/chat", json={"message": "Explain", "planet_id": "trappist-1-e"})
    s = system_of(llm)
    assert "Kepler-186 f" not in s and "Proxima Cen b" not in s


def test_two_planet_comparison_retrieves_both_records(client, llm):
    r = client.post("/api/astronomer/chat", json={"message": "Compare TRAPPIST-1e and Kepler-452b", "planet_id": "trappist-1-e"})
    assert r.json()["compared_planet_ids"] == ["kepler-452-b"]
    s = system_of(llm)
    assert "SELECTED PLANET" in s and "OTHER PLANET NAMED IN THE USER'S MESSAGE: Kepler-452 b" in s
    assert "Radius: 0.92 Earth radii" in s and "Radius: 1.63 Earth radii" in s


def test_comparison_without_selected_planet(client, llm):
    r = client.post("/api/astronomer/chat", json={"message": "compare kepler 452 b with proxima cen b"})
    assert r.json()["planet_id"] is None and set(r.json()["compared_planet_ids"]) == {"kepler-452-b", "proxima-cen-b"}


def test_general_question_has_no_planet_data(client, llm):
    client.post("/api/astronomer/chat", json={"message": "What is the transit method?"})
    s = system_of(llm)
    assert "No planet is currently selected" in s and "Kepler-452 b" not in s


def test_history_is_trimmed_and_ordered(client, llm):
    hist = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"turn {i}"} for i in range(30)]
    client.post("/api/astronomer/chat", json={"message": "latest", "history": hist})
    sent = llm.calls[-1]["json"]["messages"]
    assert sent[0]["role"] == "system" and sent[-1] == {"role": "user", "content": "latest"}
    turns = sent[1:-1]
    assert len(turns) <= astronomer.MAX_HISTORY_MESSAGES and turns[0]["role"] == "user" and turns[-1]["content"] == "turn 29"


def test_history_char_budget(client, llm):
    big = "x" * 3900
    hist = [{"role": "user", "content": big}, {"role": "assistant", "content": big}, {"role": "user", "content": big}]
    client.post("/api/astronomer/chat", json={"message": "hi", "history": hist})
    assert sum(len(t["content"]) for t in llm.calls[-1]["json"]["messages"][1:-1]) <= astronomer.MAX_HISTORY_CHARS


def test_outbound_request_shape_and_key_use(client, llm):
    client.post("/api/astronomer/chat", json={"message": "hi"})
    c = llm.calls[-1]
    assert c["url"] == f"{config.FEATHERLESS_BASE_URL}/chat/completions"
    assert c["headers"]["Authorization"] == f"Bearer {SECRET}"
    assert c["json"]["max_tokens"] == config.FEATHERLESS_MAX_TOKENS and c["json"]["model"] == config.FEATHERLESS_MODEL
    assert c["timeout"] == config.FEATHERLESS_TIMEOUT_SECONDS


# ---- validation ---------------------------------------------------------------------------------

@pytest.mark.parametrize("payload", [
    {"message": ""}, {"message": "   "}, {"message": "x" * 1001}, {},
    {"message": "hi", "history": [{"role": "system", "content": "x"}]},
    {"message": "hi", "history": [{"role": "user", "content": ""}]},
    {"message": "hi", "history": [{"role": "user", "content": "x"}] * 41},
])
def test_invalid_requests_rejected(client, llm, payload):
    assert client.post("/api/astronomer/chat", json=payload).status_code == 422
    assert llm.calls == []


def test_unknown_planet_404_without_llm_call(client, llm):
    assert client.post("/api/astronomer/chat", json={"message": "hi", "planet_id": "nope"}).status_code == 404
    assert llm.calls == []


# ---- failure handling ---------------------------------------------------------------------------

def test_missing_key_gives_useful_error(client, llm, monkeypatch):
    monkeypatch.setattr(config, "FEATHERLESS_API_KEY", "")
    r = client.post("/api/astronomer/chat", json={"message": "hi"})
    assert r.status_code == 503 and "FEATHERLESS_API_KEY" in r.json()["detail"] and llm.calls == []
    assert client.get("/api/astronomer/status").json()["configured"] is False


@pytest.mark.parametrize("response,status", [
    (FakeResponse(401, {}), 502), (FakeResponse(403, {}), 502), (FakeResponse(500, {}), 502),
    (FakeResponse(200, ValueError("not json")), 502), (FakeResponse(200, {"choices": []}), 502),
    (FakeResponse(200, {"choices": [{"message": {"content": "  "}}]}), 502),
    (FakeResponse(200, {"choices": [{"message": {"content": None}}]}), 502),
    (httpx.ReadTimeout("slow"), 504), (httpx.ConnectError("down"), 502),
])
def test_upstream_failures_are_mapped_and_never_leak_the_key(client, llm, response, status):
    llm.state["response"] = response
    r = client.post("/api/astronomer/chat", json={"message": "hi"})
    assert r.status_code == status and SECRET not in r.text and "detail" in r.json()


def test_rate_limit_passes_retry_after(client, llm):
    llm.state["response"] = FakeResponse(429, {}, {"retry-after": "7"})
    r = client.post("/api/astronomer/chat", json={"message": "hi"})
    assert r.status_code == 429 and r.headers["retry-after"] == "7"


def test_status_never_returns_the_key(client):
    assert SECRET not in client.get("/api/astronomer/status").text
