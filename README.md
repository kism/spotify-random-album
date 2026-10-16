# Spotify Random Album

[![Lint](https://github.com/kism/spotify-random-album/actions/workflows/lint.yml/badge.svg)](https://github.com/kism/spotify-random-album/actions/workflows/lint.yml)
[![Type Check](https://github.com/kism/spotify-random-album/actions/workflows/check_types.yml/badge.svg)](https://github.com/kism/spotify-random-album/actions/workflows/check_types.yml)
[![Build](https://github.com/kism/spotify-random-album/actions/workflows/build.yml/badge.svg)](https://github.com/kism/spotify-random-album/actions/workflows/build.yml)
[![site](https://img.shields.io/website?url=https%3A%2F%2Frsa.autist.network)](https://rsa.autist.network/)

Shows 5 random albums from your Spotify liked albums. 4 if you are on mobile.

A single-page TypeScript app on Cloudflare Workers. No framework, no backend: Vite builds static assets and the
Cloudflare Vite plugin turns them into an assets-only Worker.

## Prerequisites

- Node, the version in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- [pnpm](https://pnpm.io/installation): `npm i -g pnpm`. The version is pinned in `packageManager` in `package.json`

## Run

```bash
nvm use
pnpm install
pnpm dev     # http://127.0.0.1:8788/
```

See [README_dev.md](README_dev.md) for building, previewing and deploying.

## Workflows

The `.github` folder has one workflow per check, so a failing badge tells you what broke:

| Workflow | Runs |
| --- | --- |
| `lint.yml` | Biome |
| `check_types.yml` | `tsc` |
| `build.yml` | `pnpm build` |
