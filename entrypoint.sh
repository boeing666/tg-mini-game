#!/bin/sh

set -e


if [ "$NODE_ENV" = "production" ]; then
  bun run db:deploy
else
  bun install
  bun run db:deploy
  exec npm run dev
fi

exec node .output/server/index.mjs