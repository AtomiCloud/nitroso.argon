#!/usr/bin/env bash

branch="$CF_PAGES_BRANCH"

if [ "$branch" = "pichu" ] || [ "$branch" = "pikachu" ] || [ "$branch" = "raichu" ]; then
  echo "🔍 Qualified branch: ${branch}"
else
  echo "🔍 Non-qualified branch: ${branch}, downgrading to pichu"
  branch="pichu"
fi

branch_upper="$(echo "$branch" | tr '[:lower:]' '[:upper:]')"
echo "🗻 Landscape: ${branch}"
echo "💱 Using env vars: ${branch_upper}_DESCOPE_ID, ${branch_upper}_DESCOPE_SECRET, ${branch_upper}_AUTH_SECRET"

export PUBLIC_LANDSCAPE=${branch}
descope_id="export DESCOPE_ID=\$${branch_upper}_DESCOPE_ID"
descope_secret="export DESCOPE_SECRET=\$${branch_upper}_DESCOPE_SECRET"
auth_secret="export AUTH_SECRET=\$${branch_upper}_AUTH_SECRET"

eval "$descope_id"
eval "$descope_secret"
eval "$auth_secret"

# shellcheck disable=SC2153
echo "🔑 Descope ID: ${DESCOPE_ID}"

# Cloudflare's build image sets NODE_OPTIONS=--use-openssl-ca. Node rejects that
# flag for worker threads ("is not allowed in NODE_OPTIONS"), and SvelteKit's
# build forks a Worker, so every Pages build failed from 2026-10-14. Drop just
# that flag and keep anything else Cloudflare sets.
if [ -n "${NODE_OPTIONS:-}" ]; then
  NODE_OPTIONS="$(echo "$NODE_OPTIONS" | sed -E 's/(^| )--use-openssl-ca( |$)/ /g; s/^ +| +$//g')"
  export NODE_OPTIONS
  echo "🧹 NODE_OPTIONS after removing --use-openssl-ca: '${NODE_OPTIONS}'"
fi

echo "🔨 Building for branch: ${branch}"
bun run build
