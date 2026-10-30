# 3D Exoplanet Explorer (Phases 1–2)

Browse real confirmed exoplanets from the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) (`ps` table via TAP).

```
backend/    FastAPI + NASA TAP client + JSON cache
frontend/   React + Vite + Tailwind + Lucide
```

## Run

```bash
# backend (http://localhost:8000)
cd backend && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8000

# frontend (http://localhost:5173, proxies /api to the backend)
cd frontend && npm install && npm run dev
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/planets` | Full cached dataset |
| `GET /api/planets/featured` | Curated planets present in the dataset |
| `GET /api/planets/{id}` | One planet (e.g. `kepler-452-b`) |
| `GET /api/health` | Status and data availability |
| `POST /api/refresh` | Manually refetch from NASA |

Data is cached in `backend/data/planets_cache.json` (24h by default; see `backend/.env.example`).
Missing NASA measurements are `null` and shown as "Not available". Planet images are generated illustrations.

## Tests

```bash
cd backend && python -m pytest -q          # includes a live NASA test
```
