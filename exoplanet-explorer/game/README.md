# Exo-verse: Survive 60 Seconds

React + Vite survival game using a small React Three Fiber scene, a fixed-step Zustand simulation, NASA Exoplanet Archive `pscomppars` data, synthesized Web Audio, and an Express proxy for Featherless.ai. The HUD charts suit history and explains its assumptions. The planet-specific gameplay weights are tested in `src/sim/survival.test.js`.

## Run locally

```sh
npm install
Copy-Item .env.example .env
# Optional: set FEATHERLESS_API_KEY in .env; it stays server-side.
npm run dev
```

`npm run dev` starts Express on port 8787 and Vite together; open the URL printed by Vite. Without an internet connection or API key, planet selection uses `public/planets.json` and narration uses the local template fallback. `npm run build` creates the static client bundle; deploy the Express service separately and configure the hosting proxy for `/api`.

## How hazards are computed

`src/sim/survival.js` derives gravity from planet mass/radius, temperature from equilibrium temperature plus the rocky-world greenhouse assumption, and radiation from stellar flux with the M-dwarf multiplier. Transparent severity curves are mapped through separate, tuned gameplay HP/s weights. Missing values are defaulted or estimated and labeled in the UI. The resulting health drain is integrated at a fixed 0.05-second step, independent of render-frame batching. This is a game model, not a habitability prediction.

## Movement and run metrics

Grounded horizontal movement accumulates `distanceWalked`; the fixed survival step accumulates `timeSheltered`; `closestApproachToTerminator` is the minimum absolute day/night coordinate multiplied by 400 m. These metrics are included in the post-mortem simulation context and shown as chips. Non-tidally-locked worlds report terminator approach as unavailable.

Ambiguity choices: the terminator direction is fixed along world −Z, the player starts at coordinate +0.6, and the scaled coordinate changes by 1 per 400 m. The specified local-temperature equation places cached TRAPPIST-1 e at 312 K on the spawn side and 264 K at the terminator; the base thermal threshold curve would therefore increase thermal damage at the terminator. To meet the requested movement-survival behavior, the game additionally applies a clearly labeled twilight thermal-inertia factor of `max(0.01, abs(s))` to thermal severity on locked worlds. This is a gameplay abstraction, not an exoplanet measurement. Distance walked counts grounded horizontal path length; shelter time uses simulation time in 0.05 s steps.

## Data and assumptions

`/public/planets.json` is a cached demo fallback using NASA `pscomppars` field names. Its values are approximate hackathon placeholders. **TODO: replace every cached demo value with a dated export from the NASA Exoplanet Archive before public release.** Live NASA results are merged with these cached entries so the required demo planets remain selectable. Unknown values remain visibly unknown; missing mass is tagged as estimated.

Simulation numbers are illustrative, not a scientific habitability estimate. Read the in-game Assumptions panel for the equations, tuned HP/s weights, defaults, and estimated-mass planet list. Temperature, radiation, gravity, and surface values use separate gameplay weights so the demo planets meet the tested survival-time targets.

## Checks

`npm test` runs the Vitest survival-model tests.
