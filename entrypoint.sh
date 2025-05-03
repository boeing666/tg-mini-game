#!/bin/sh

set -e
bun install
bun run build

exec node .output/server/index.mjs