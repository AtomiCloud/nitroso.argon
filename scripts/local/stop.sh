#!/usr/bin/env bash

file="$1"

set -eou pipefail

[ "$file" = '' ] && file="./config/dev.yaml"

landscape="$(yq -r '.landscape' "$file")"
platform="$(yq -r '.platform' "$file")"
service="$(yq -r '.service' "$file")"

kubectx "k3d-$landscape"
kubens "$platform"

release="$platform-$service"

helm uninstall --kube-context "k3d-$landscape" -n "$platform" "$release" --wait
