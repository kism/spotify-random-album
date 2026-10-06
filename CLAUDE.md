# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static single-page site that shows 5 random albums from the user's Spotify liked albums. No backend: it's deployed as a Cloudflare Workers static-assets site (`wrangler.jsonc`, `assets.directory: ./public`), and everything runs in the browser.

## Commands

- `npm run build`: runs `scripts/build.sh` (tsc, copy fonts, generate `public/index.html`). Wrangler also runs it before every `dev`/`deploy`.
- `npm run dev`: local server at http://127.0.0.1:8788/ (this exact origin is registered as a Spotify redirect URI, so don't change the port or host).
- `npm run deploy`: `wrangler deploy`.
- `npm run lint` (`biome ci`) checks linting and formatting; `npm run fix` applies fixes. CI runs `npm run lint` and then `npm run build`.
- There are no tests.

## Layout and build gotchas

- Edit sources in `src/`, not `public/`. These files in `public/` are build output and gitignored:
  - `public/main.js`: compiled from `src/main.ts` by tsc, with `outDir: public`
  - `public/index.html`: generated from `src/index.html`
  - `public/fonts/`: copied from `@fontsource/noticia-text`
- `public/style.css` and the icon/manifest files in `public/` are hand-edited sources.
- `scripts/build.sh` replaces the `<!-- source -->` placeholder in `src/index.html` with the git remote URL and HEAD sha. It strips credentials from the remote URL, so keep that step if you change the script.
- Plain tsc with no bundler. `main.js` is loaded as a single ES module, so keep the code in one file or use relative `.js` imports.

## Architecture (`src/main.ts`)

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
