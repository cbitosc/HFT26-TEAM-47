import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev`   : standalone timeline on :5181 (the '/nasa-tap' proxy is kept for the standalone dev server).
// `npm run build` : static build into the exoverse site (frontend/public/timeline-files), served by the Timeline page.
export default defineConfig({
  plugins: [react()],
  base: './', // relative asset URLs so the build works from any folder (the site serves it under /timeline-files/)
  build: { outDir: '../frontend/public/timeline-files', emptyOutDir: true },
  server: {
    port: 5181,
    proxy: { '/nasa-tap': { target: 'https://exoplanetarchive.ipac.caltech.edu', changeOrigin: true, rewrite: (p) => p.replace(/^\/nasa-tap/, '/TAP/sync') } },
  },
});
