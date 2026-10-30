import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev: forward /api to the FastAPI backend
    proxy: { '/api': 'http://localhost:8000' },
  },
})
