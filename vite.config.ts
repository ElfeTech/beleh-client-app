import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };

function formatBuildId(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

const appVersion = process.env.VITE_APP_VERSION ?? pkg.version;
const appBuildId = process.env.VITE_APP_BUILD_ID ?? formatBuildId();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(appBuildId),
  },
  server: {
    host: true, // Allow access from any host/domain (0.0.0.0)
    allowedHosts: ['localhost', 'f997db6724bb.ngrok-free.app', '0.0.0.0'],
    port: 5173,
    strictPort: false,
    headers: {
      // Allow popups for Firebase OAuth without breaking cross-origin resources
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      // Note: We intentionally DO NOT set Cross-Origin-Embedder-Policy
      // because 'require-corp' breaks Firebase popup authentication
    },
  },
  preview: {
    host: true, // Allow preview server to be accessed from any host
    port: 4173,
    strictPort: false,
  },
});
