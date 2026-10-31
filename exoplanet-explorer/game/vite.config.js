import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev`   : standalone game on :5180 with its API on :8787.
// `npm run build` : static build into the exoverse site (frontend/public/game-files), served by the Game page.
export default defineConfig({
  plugins: [react()],
  base: './', // relative asset URLs so the build works from any folder (the site serves it under /game-files/)
  build: { outDir: '../frontend/public/game-files', emptyOutDir: true },
  server: { port: 5180, proxy: { '/api': 'http://localhost:8787' } },
});
