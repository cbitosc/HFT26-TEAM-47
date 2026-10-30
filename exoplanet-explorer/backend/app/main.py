import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import cache, config
from .nasa_client import NasaApiError

app = FastAPI(title="Exoplanet Explorer API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])


def _dataset() -> dict:
    try:
        return cache.get_dataset()
    except NasaApiError as exc:
        raise HTTPException(status_code=503, detail=f"Planet data unavailable: {exc}")


@app.get("/api/health")
def health():
    cached = cache.read_cache()
    return {
        "status": "ok",
        "data_available": bool(cached and cached.get("planets")),
        "planet_count": len(cached["planets"]) if cached else 0,
        "cache_age_seconds": round(time.time() - cached["fetched_at"]) if cached else None,
    }


@app.get("/api/planets")
def list_planets():
    data = _dataset()
    return {"count": len(data["planets"]), "source": data["source"], "fetched_at": data["fetched_at"], "planets": data["planets"]}


# Declared before /{planet_id} so "featured" is not treated as an id.
@app.get("/api/planets/featured")
def featured_planets():
    by_name = {p["name"]: p for p in _dataset()["planets"]}
    planets = [by_name[n] for n in config.FEATURED_NAMES if n in by_name]
    return {"count": len(planets), "planets": planets}


@app.get("/api/planets/{planet_id}")
def get_planet(planet_id: str):
    for p in _dataset()["planets"]:
        if p["id"] == planet_id:
            return p
    raise HTTPException(status_code=404, detail=f"Planet '{planet_id}' not found")


@app.post("/api/refresh")
def refresh_data():
    """Manual cache refresh from NASA."""
    try:
        data = cache.refresh()
    except NasaApiError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"count": len(data["planets"]), "fetched_at": data["fetched_at"]}
