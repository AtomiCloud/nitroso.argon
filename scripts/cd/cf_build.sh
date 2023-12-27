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

echo "🔨 Building for branch: ${branch}"
bun run build
