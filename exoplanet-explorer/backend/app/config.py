import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader (KEY=VALUE lines). Real environment variables take precedence."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_dotenv(BASE_DIR / ".env")

NASA_TAP_URL = os.getenv("NASA_TAP_URL", "https://exoplanetarchive.ipac.caltech.edu/TAP/sync")
CACHE_FILE = BASE_DIR / os.getenv("CACHE_FILE", "data/planets_cache.json")
CACHE_MAX_AGE_HOURS = float(os.getenv("CACHE_MAX_AGE_HOURS", "24"))
NEARBY_LIMIT = int(os.getenv("NEARBY_LIMIT", "40"))
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]

# NASA Archive names for curated featured planets (shown only if present in the fetched data).
FEATURED_NAMES = [
    "TRAPPIST-1 e", "Proxima Cen b", "Kepler-452 b",
    "TOI-700 d", "51 Peg b", "Kepler-186 f",
]

# Virtual Astronomer (Featherless AI, OpenAI-compatible). The key lives ONLY in backend/.env.
FEATHERLESS_API_KEY = os.getenv("FEATHERLESS_API_KEY", "")
FEATHERLESS_BASE_URL = os.getenv("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1")
FEATHERLESS_MODEL = os.getenv("FEATHERLESS_MODEL", "Qwen/Qwen2.5-14B-Instruct")
FEATHERLESS_TIMEOUT_SECONDS = float(os.getenv("FEATHERLESS_TIMEOUT_SECONDS", "60"))
FEATHERLESS_MAX_TOKENS = int(os.getenv("FEATHERLESS_MAX_TOKENS", "1000"))
FEATHERLESS_TEMPERATURE = float(os.getenv("FEATHERLESS_TEMPERATURE", "0.4"))
