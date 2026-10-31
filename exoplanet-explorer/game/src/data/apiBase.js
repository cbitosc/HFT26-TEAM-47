// Where the game's own Express API (narration, live NASA proxy) is reached.
//  - standalone dev (`npm run dev` in game/): '/api', proxied by this project's Vite config to port 8787
//  - embedded in the exoverse site: '/game-api' (see .env.production), proxied by the site's Vite config to port 8787
// The site's own FastAPI backend also owns '/api', so the game must not share that prefix.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';
