#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

tsc

mkdir -p public/fonts
cp -r node_modules/@fontsource/noticia-text/{400.css,700.css,files} public/fonts/

# Strip any credentials CI may have put in the remote URL
repo=$(git remote get-url origin | sed 's|//[^@/]*@|//|')
sha=$(git rev-parse HEAD)
sed "s|<!-- source -->|<!-- $repo @ $sha -->|" src/index.html > public/index.html
