#!/usr/bin/env bash

version="$1"

set -eouf pipefail

if [ -z "$version" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "⚙️ Generating error schema for version '$version'"

echo "🔩 Obtaining key types..."
keys="$(typescript-json-schema "./src/errors/$version/**/*.ts" '*' | jq -r '.definitions | keys[]')"

for row in $keys; do
  echo "⚗️ Generating schema for '$row'..."
  typescript-json-schema "./src/errors/$version/**/*.ts" "$row" \
    --required \
    --noExtraProps \
    --strictNullChecks \
    --ignoreErrors \
    --include \
    --out "./.schema/$version/$row"
done

# echo merging jsons:
echo "🔗 Merging schemas..."

# shellcheck disable=SC2046
final=$(cd "./.schema/$version" && jq -n 'reduce inputs as $s (.; .[input_filename] += $s)' $(ls))
echo "$final" >"./src/routes/api/v1/error_info/[slug]/schema.json"

echo "🧹 Cleaning up..."
rm -rf ./.schema
echo "🎉 Done!"
