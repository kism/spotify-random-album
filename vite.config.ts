import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [cloudflare()],
  // http://127.0.0.1:8788/ is a registered Spotify redirect URI, so the dev server must be exactly there
  server: { host: '127.0.0.1', port: 8788, strictPort: true },
})
