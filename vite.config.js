import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run api` serves the leaderboard on :3001; in production nginx
    // does this proxying instead
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
