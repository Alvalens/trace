import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Dev: proxy API calls to the Express server so the client talks to /handover, /ingest same-origin.
    proxy: {
      '/handover': 'http://localhost:8080',
      '/ingest': 'http://localhost:8080',
      '/debug': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
})
