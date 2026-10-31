# Discovery Timeline

A standalone Vite + React explorer for confirmed exoplanets from NASA's Exoplanet Archive `pscomppars` table. It has no imports from the parent workspace.

## Run locally

```sh
npm install
npm run dev
```

The app tries the live NASA TAP endpoint first, with a five second timeout. It falls back to `public/exoplanets.json` when the request fails. Refresh the bundled snapshot with `npm run fetch-data` while online.

## Data and timeline choices

- The archive-reported `disc_year` drives the cumulative line, histogram, playhead, and annual insights. Rows without a numeric discovery year are omitted from those calculations.
- The live count uses the cumulative precomputed value at `floor(playhead)`. The large readout can show fractional years while the archive's discrete annual count remains fixed until the next year.
- "Skip to today" means the largest `disc_year` in the currently loaded live result or cache. It does not use the computer's calendar year.
- Initial playback starts at the earliest year and runs once at 1.2 seconds per year. If `prefers-reduced-motion` is enabled, the playhead starts at the final year with playback stopped.
- The pulsar milestone is placed at the minimum year in the current dataset. The current cache starts at 1992.
- Kepler's 715 (2014) and 1,284 (2016) markers are NASA validation-announcement totals. The annual histogram and cumulative count instead count rows by `disc_year` in the current `pscomppars` snapshot, so their annual totals need not equal the announcement totals.
- Annual radius medians omit rows with a missing or nonnumeric `pl_rade`. The comparison uses the selected year's median and the median ten years earlier; if either year has no valid radius values, it says so.
- The 3D neighbourhood applies a logarithmic radial transform while preserving equatorial directions. Ring labels are real light-years. The all-sky projection uses RA and Dec only.
- Event labels and their source URLs are centralized in `src/config/events.js`. Double-check dates and wording against NASA press releases before editing those entries.

## Controls and captions

- Use Space to play or pause. Arrow keys move one archive year. The slider supports hundredth-year positions, while discovery counts use the selected whole year.
- Playback speeds are 1x (1.2 seconds per year), 2x, and 4x. Playback stops at the dataset's final year; Play from the end starts again at the beginning.
- Sound is off until enabled by the user. Generated discovery ticks use Web Audio and are limited to ten per second.
- Annual captions (new count, transit share, and radius median comparison) are derived from the precomputed per-year arrays; no yearly statistic in the caption is hardcoded.

## Exoverse visual system

`src/theme.css` is this app's local copy of the Exoverse surface tokens. `src/exoverse.css` applies them to this standalone app; it does not import styles or code from another workspace. The searchable host index is limited to 180 visible rows at a time for responsive rendering. Selecting a row moves the neighbourhood camera to that host. The top Controls popover can hide the analysis panel and select a facility; the existing map camera presets stay beside the map. LIVE NASA/CACHED status is shown in the index footer and About data sheet.

The attached visual brief included both a request to add a procedural Milky Way shader and a top-level instruction not to change shaders. I kept the existing data visualization shader unchanged and used a lightweight CSS Milky Way impression as a separate illustrative backdrop. The brief also requested a star-temperature color mode, which would require changing the point color data/shader path; discovery-method colors remain the sole mode and retain the existing colorblind-safe palette. Only the Discovery Timeline app exists in this workspace, so no second app was created or modified. The analysis panel is collapsible; on narrower screens, the index and analysis panel stack with the scene.

## Checks

`npm test` runs the pure data-function tests, including agreement between cumulative increments and the annual method histogram. `npm run build` creates the production app in `dist/`.
