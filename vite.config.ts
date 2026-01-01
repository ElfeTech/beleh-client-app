import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow access from any host/domain (0.0.0.0)
    allowedHosts: ['localhost', 'f997db6724bb.ngrok-free.app', '0.0.0.0'],
    port: 5173,
    strictPort: false,
    headers: {
      // Allow popups for Firebase OAuth without breaking cross-origin resources
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      // Note: We intentionally DO NOT set Cross-Origin-Embedder-Policy
      // because 'require-corp' breaks Firebase popup authentication
    }
  },
  preview: {
    host: true, // Allow preview server to be accessed from any host
    port: 4173,
    strictPort: false
  }
})
