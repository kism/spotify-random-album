# spotify-random-album: development

## Setup

```bash
nvm use
pnpm install
```

pnpm only runs dependency install scripts that are approved in `pnpm-workspace.yaml` (`allowBuilds`). If a new
dependency needs one, `pnpm install` stops and names it, then approve it with `pnpm approve-builds <package>`.

## Commands

```bash
pnpm dev                     # vite dev server on http://127.0.0.1:8788/
pnpm lint                    # biome check (pnpm format to fix)
pnpm typecheck               # tsc
pnpm build                   # scripts/build.sh: tsc, then vite build into dist/
pnpm preview                 # serve dist/ in workerd, as it would run deployed
```

`scripts/run-ci-local.sh` runs everything the workflows do, in order, and formats while it's at it.

Vite doesn't typecheck, so `pnpm build` runs `tsc` first.

### Spotify redirect URIs

Login only works on origins registered as redirect URIs in the Spotify dashboard for `CLIENT_ID` (`src/main.ts`):
`http://127.0.0.1:8788/` for `pnpm dev`, and `https://rsa.autist.network/` for production. Spotify doesn't take
`localhost` or wildcards, so `pnpm preview` and the Preview URLs can't log in.

### Build-time values

`scripts/build.sh` sets `VITE_SOURCE` to `<repo> @ <sha>`, which ends up in an HTML comment at the top of the page.
`.env.development` is the fallback for `pnpm dev`, and uses the red `favicon-dev.png`.

## Deploying

Link the repo in the Cloudflare dashboard (Workers & Pages → Create → Import a repository) with:

- Build command: `pnpm run build`
- Deploy command: `pnpm wrangler deploy`
- Non-production branch deploy command: `pnpm wrangler versions upload`

`pnpm build` writes `dist/wrangler.json` and `.wrangler/deploy/config.json`, which point `wrangler deploy` at the built
assets, so there's no `main` or `assets` in `wrangler.jsonc`. To check what would be uploaded without deploying:

```bash
pnpm build && pnpm wrangler deploy --dry-run
```

Production is served at <https://rsa.autist.network>. Non-production branches get a Preview at
`<branch>.rsa-preview.autist.network`, plus a per-version link at
`<version>-spotify-random-album.<subdomain>.workers.dev`.

### Custom domain

The domains are the `routes` in `wrangler.jsonc`. Deploys replace every custom domain on the Worker with that list,
so add domains there, not in the dashboard.
