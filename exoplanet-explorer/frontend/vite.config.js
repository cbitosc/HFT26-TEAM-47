import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    // Dev: forward /api to the FastAPI backend
    proxy: {
      '/api': 'http://localhost:8000',
      // The embedded game (game/) has its own Express API on :8787; '/api' belongs to the FastAPI backend above.
      '/game-api': { target: 'http://localhost:8787', rewrite: (path) => path.replace(/^\/game-api/, '/api') },
    },
  },
})
