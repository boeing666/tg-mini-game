#!/bin/sh

set -e

if [ "$NODE_ENV" = "production" ]; then
  bun run build
  exec node .output/server/index.mjs
else
  bun install
  exec npm run dev
fi