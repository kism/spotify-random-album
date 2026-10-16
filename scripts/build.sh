#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

tsc

# Strip any credentials CI may have put in the remote URL
repo=$(git remote get-url origin 2>/dev/null | sed 's|//[^@/]*@|//|' || true)
sha=$(git rev-parse HEAD 2>/dev/null || true)
VITE_SOURCE="$repo @ $sha" vite build
