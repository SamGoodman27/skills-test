import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The local AI service (npm run server) holds the API keys.
    proxy: {
      '/ai': 'http://127.0.0.1:8787',
    },
  },
})
