import pytest

from app import cache, config


@pytest.fixture(autouse=True)
def isolated_cache_state(tmp_path, monkeypatch):
    """Tests never read the committed seed snapshot or inherit the 'NASA recently failed' timer from another test."""
    monkeypatch.setattr(config, "SEED_FILE", tmp_path / "no_seed.json")
    monkeypatch.setattr(cache, "_last_refresh_failure", 0.0)
