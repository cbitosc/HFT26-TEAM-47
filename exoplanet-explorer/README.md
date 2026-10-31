# exoverse (3D Exoplanet Explorer)

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

## Phase 3: 3D visualization

The planet detail page shows an interactive three.js scene (React Three Fiber + drei): host star, orbiting planet, orbit path and camera controls. Sizes, orbit radii and orbit speeds use bounded log scaling from NASA values and are **illustrative, not to scale**. Missing values fall back to flagged defaults. Orbits are drawn circular.

## Phase 4: information and habitability dashboard

The detail page adds a dashboard (`frontend/src/components/dashboard/`) with planet, host-star and orbital properties plus an **educational habitability screening score**. Calculations live in `frontend/src/utils/habitabilityCalculations.js` (Kopparapu et al. 2013 habitable zone, documented thresholds, unknowns scored as 0 and listed). It is not a measure of habitability or a probability of life. Stellar luminosity is derived from radius and temperature when NASA does not report it, and labelled as such.

```bash
cd frontend && npm test      # calculation tests (node:test, no extra dependencies)
```

## Phase 6: Virtual Astronomer (Featherless AI)

An AI assistant on every planet page and at `/astronomer`. It answers from the selected planet's NASA record and the app's habitability screening; it does not invent measurements.

**Setup**

```bash
cd backend
cp .env.example .env        # then put your key in FEATHERLESS_API_KEY=
python -m uvicorn app.main:app --port 8000   # restart after editing .env
```

- Get a key at https://featherless.ai. It is read only by the backend (`app/featherless_client.py`); `.env` is git-ignored and the key never reaches the browser.
- Default model `Qwen/Qwen2.5-14B-Instruct` (ungated, 32k context, concurrency cost 1; it grounded and reasoned noticeably better than the 7B in testing). Change it with `FEATHERLESS_MODEL`; check availability at `GET https://api.featherless.ai/v1/models`. Some models are gated or need a higher plan.
- Other settings (timeout, `FEATHERLESS_MAX_TOKENS`, temperature) are listed in `backend/.env.example`.
- Without a key the UI shows a "not configured" notice and `POST /api/astronomer/chat` returns 503 with setup instructions.

**API:** `POST /api/astronomer/chat` with `{ "message", "planet_id", "history" }`; `GET /api/astronomer/status`.
The client sends only the planet **id**. The backend looks up the NASA record itself, computes the habitability indicators (`app/habitability.py`, a Python port of the frontend calculation), and adds any other planets named in the message (e.g. "Compare TRAPPIST-1e and Kepler-452b") from the same dataset. Only the selected/named planets are sent to the model, never the whole dataset. The AI is called only when a message is sent.

Chat history is kept in the browser's `sessionStorage` only. Only turns about the *current* planet are sent as history; after switching planets the chat shows a notice and offers "Start fresh".

## exoverse UI: the Milky Way and its exoplanet systems

The whole display is one 3D scene with minimal floating panels over it (navbar: brand, "3D Universe Live", **Controls**; left: *Deep space index*; right: details for the selected system or planet; bottom: navigation guide).

Hierarchy: **Milky Way** (`/`) → **star system** (`/system/:id`) → **exoplanet** (`/planet/:id`) → properties and habitability screening.

What is real and what is illustrative:

- **Host-star positions are real relative positions**: NASA's galactic longitude/latitude and distance for each system, converted to Cartesian coordinates around the Sun (`frontend/src/utils/galaxy.js`). Where a system lacks coordinates it is flagged "illustrative position". Where the main NASA table has no distance for a system (e.g. TRAPPIST-1), the backend fills it from NASA's composite table (`pscomppars`) and records `distance_source`.
- **The Sun's place** (about 8.18 kpc from the centre) is a published value.
- **The galaxy itself is a schematic procedural model** (core + bar, four logarithmic spiral arms, dust lanes, nebulae, halo, globular clusters). It is not a star catalogue.
- **Planetary systems are drawn at an illustrative scale** (`SYSTEM_SCALE`), far larger than reality, with orbit spacing and sizes scaled for readability.

Camera (`frontend/src/components/3d/CameraDirector.jsx`): one state machine for every move. Zooming interpolates in log space (the scene spans ~7 orders of magnitude). Milky Way → system zooms toward the host star and creates the system as it becomes large enough; system → Milky Way zooms out and removes it once it is a speck; system → system pulls back, removes the old system, crosses, creates the new one just before arrival. Only the selected planetary system is ever rendered. Rapid selections re-plan from the camera's current pose; OrbitControls are off during a move.

**Controls** (hidden until opened): starfield, galaxy, orbital paths, planet labels, planetary motion, quality (low/medium/high), reset camera, page links (Explore, Compare, AI Astronomer, About). Settings persist in `localStorage`.

The **Star systems** list is ordered by planet count (highest first, ties alphabetical) from the de-duplicated NASA dataset.

## Host stars

Every host star is drawn from its NASA measurements (`frontend/src/utils/stellar*.js`, `frontend/src/components/3d/HostStar.jsx`):

| Measurement | Drives |
|---|---|
| `st_teff` effective temperature | colour (smooth red -> orange -> yellow-white -> white -> blue-white -> blue ramp) and the visual class |
| `st_spectype` spectral type | the displayed label ("M-type · Red dwarf"); colour fallback when there is no temperature |
| `st_rad` radius | visual size (bounded 0.65-1.35x) |
| `st_lum` luminosity (or derived from radius and temperature, labelled) | brightness, corona strength, light intensity (all bounded) |
| `st_mass`, `st_met` | shown in the panel only |

Rules: temperature decides colour; nothing is invented (no temperature and no type means a neutral star marked "Classification unavailable"); colours are never chosen by name. When NASA's spectral type and temperature class disagree at a boundary (e.g. Kepler-186: M1 at 3788 K) the label follows NASA and the colour follows temperature.

The backend gives every planet of a system **one consistent set of star values**, taken from NASA's composite table (`pscomppars`, which has far fuller coverage than the default rows) and falling back to the planet's own rows; `star_data_source` records which.

The star's surface (granulation, plasma flow, spots, bright regions), corona, glow and prominence loops are **procedural illustrations**, not observed features of any particular star. Sizes and brightness are visual scalings, not true dimensions.

## Habitability indicators, slower orbits and the planet detail view

- **Screening score weights** (100 points, `habitabilityCalculations.js`, mirrored in `backend/app/habitability.py`): habitable zone 35, equilibrium temperature 30, planet size 20, data completeness 15. Missing data never scores favourably; with fewer than 2 of the 3 scientific indicators known there is no overall score. Educational indicator text (mass and density, what equilibrium temperature does and does not mean, host-star characteristics, measured vs derived vs unavailable inputs) lives in `utils/planetaryIndicators.js`; stellar activity is not in the NASA data used here and is shown as "Data unavailable".
- **Orbit speed**: a global multiplier on the existing orbit clock, set under Controls: Slow 0.15x (default), Normal 0.4x, Fast 1x (the previous speed). Relative periods, directions and positions are untouched.
- **Planet detail view**: selecting a planet (from the system list, or `/planet/:id`) flies the camera in the same canvas to that planet, which holds its position and spins slowly with a larger generated texture; the scientific panel opens on the right (stacked below the planet on small screens). "Back to System" (or Esc) flies back; the system, selection and orbits are exactly as left, with nothing remounted.
- **Section island**: the compact pill at the top of the detail panel (Overview, Planet Properties, Habitability, Host Star, Ask AI) expands on click, scrolls to the section, and follows the scroll position (`hooks/useActiveSection.js`, IntersectionObserver). The "3D Universe Live" status was removed from the navbar.

## Game and Discovery Timeline (part of the site)

The **Game** (`/game`, Survive 60 Seconds) and **Timeline** (`/timeline`, discovery timeline) pages are native parts of the React app, with no iframe. Their source lives in `frontend/src/apps/game` and `frontend/src/apps/timeline`; their data files in `frontend/public/apps/`.

- Each runs in a shadow root (`apps/ShadowApp.jsx`): the same React tree, router and WebGL pipeline as the rest of the site, but their stylesheets (written for standalone pages) cannot leak into the site or be changed by it. `apps/scopeCss.js` re-targets their `:root`/`html`/`body`/`#root` rules and viewport heights at the area under the navbar, and Tailwind's preflight is applied inside the shadow root. Fonts are loaded once in `frontend/index.html`.
- Their own brand headers are hidden (the site navbar carries the brand); everything else is theirs.
- The game's optional AI narration API is the small Express server in `game/server` (`cd game && node server/index.js`, port 8787); the site proxies `/game-api` to it (`frontend/vite.config.js`). Without it the game falls back to built-in narration templates. `game/.env` (git-ignored) holds the optional Featherless key.
- Tests: `cd frontend && npm run test:apps` (vitest, 25 tests) next to `npm test`.
- Timeline data snapshot: `node scripts/fetch-timeline-data.js` (run from `frontend/`, writes `public/apps/timeline/exoplanets.json`).
