import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'development' ? '/' : '/app/',
  server: {
    port: 5173,
    host: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      // Only proxy API/MCP calls under /s, not page loads
      '/s/': {
        target: 'http://localhost:4888',
        bypass(req) {
          if (!req.url?.match(/\/(api|mcp)\//)) {
            return req.url;
          }
        },
      },
      '/api': 'http://localhost:4888',
      '/ws': { target: 'ws://localhost:4888', ws: true },
    },
  },
}))
