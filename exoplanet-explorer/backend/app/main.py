import time
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from . import astronomer, cache, config, featherless_client
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


# ---- Virtual Astronomer -------------------------------------------------------------------------

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    planet_id: str | None = Field(default=None, max_length=120)  # the planet the user is exploring
    history: list[ChatTurn] = Field(default_factory=list, max_length=40)

    @field_validator("message")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message must not be blank")
        return v


@app.get("/api/astronomer/status")
def astronomer_status():
    """Whether the AI is configured. Never returns the key."""
    return {"configured": featherless_client.is_configured(), "model": config.FEATHERLESS_MODEL}


@app.post("/api/astronomer/chat")
def astronomer_chat(req: ChatRequest):
    planets = _dataset()["planets"]
    selected = None
    if req.planet_id:
        selected = next((p for p in planets if p["id"] == req.planet_id), None)
        if selected is None:
            raise HTTPException(status_code=404, detail=f"Planet '{req.planet_id}' not found")
    others = astronomer.find_mentioned_planets(req.message, planets, selected["id"] if selected else None)
    messages = astronomer.build_messages(req.message, selected, others, [t.model_dump() for t in req.history])
    try:
        result = featherless_client.chat_completion(messages)
    except featherless_client.AstronomerError as exc:
        headers = {"Retry-After": exc.retry_after} if exc.retry_after else None
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)
    return {
        "reply": result["content"],
        "model": result["model"],
        "planet_id": selected["id"] if selected else None,
        "compared_planet_ids": [o["id"] for o in others],
    }
