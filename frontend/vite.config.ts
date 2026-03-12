import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/app/',
  server: {
    port: 5173,
    proxy: {
      '/s': 'http://localhost:4888',
      '/api': 'http://localhost:4888',
      '/ws': { target: 'ws://localhost:4888', ws: true },
    },
  },
})
