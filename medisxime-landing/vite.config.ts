import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3009',
        changeOrigin: true,
      },
      // Solo dev: evita el bloqueo CORS de doc-api.cuidame.tech contra
      // el origen http://localhost:5174 (no whitelisteado ahí). En
      // producción el navegador sigue llamando directo a doc-api — ver
      // el mismo patrón en medisdiana-landing/vite.config.ts.
      '/doc-api': {
        target: 'https://doc-api.cuidame.tech',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/doc-api/, ''),
      }
    }
  }
})
