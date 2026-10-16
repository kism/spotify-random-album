# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static single-page site that shows 5 random albums from the user's Spotify liked albums. No backend: Vite builds it and
the Cloudflare Vite plugin turns it into an assets-only Worker (`wrangler.jsonc` has no `main` or `assets`). Everything
runs in the browser. Built from `kism/cloudflare-page-template`, so keep it in line with that.

## Commands

pnpm, not npm. See README_dev.md for the full list.

- `pnpm dev`: Vite dev server at http://127.0.0.1:8788/ (this exact origin is a registered Spotify redirect URI, pinned
  in `vite.config.ts`, so don't change the port or host).
- `pnpm lint` / `pnpm format`: Biome. `pnpm typecheck`: tsc (noEmit).
- `pnpm build`: `scripts/build.sh` (tsc, then `vite build` into `dist/`).
- `scripts/run-ci-local.sh` runs everything CI does.
- There are no tests.

## Layout and build gotchas

- `index.html` is at the root (Vite entry). Sources are in `src/`; `public/` holds icons and the manifest, copied as is.
- `dist/` is build output and gitignored.
- `scripts/build.sh` sets `VITE_SOURCE` (git remote URL and HEAD sha) for the `<!-- %VITE_SOURCE% -->` comment. It
  strips credentials from the remote URL, so keep that step if you change the script.
- `VITE_FAVICON` comes from `.env.development` / `.env.production` (red dev icon locally).
- Fonts come from `@fontsource/noticia-text`, imported in `src/style.css` and bundled by Vite.

## Architecture

- Everything is in `src/main.ts`.
- **Auth:** Spotify OAuth Authorization Code + PKCE, with no client secret.
  - `CLIENT_ID` is public.
  - `REDIRECT_URI` is pinned to `location.origin + "/"` and must match the Spotify dashboard entry exactly.
- **Token storage:**
  - Access token and expiry: `sessionStorage`.
  - Refresh token: `localStorage`, so returning visitors are logged in silently.
  - If a refresh fails, the refresh token is dropped and the login button is shown again.
- **Album cache:** the whole liked-albums library is fetched (50 per page) and cached in `localStorage` for 24h.
  - It's slimmed to the `Album` shape (`name`, `artists`, `image`, `uri`) so it fits in the storage quota.
  - Cache write failures are ignored on purpose.
- **Rendering:**
  - Fisher–Yates shuffle, then pick 5.
  - Each album links to its `spotify:` URI, which opens the desktop/mobile app.
  - DOM is built with `createElement`/`textContent`, never `innerHTML`.
- **Logout:** clears both storages.
