#!/usr/bin/env bash

file="$1"

# shellcheck disable=SC2124
dev=${@:2}

set -eou pipefail

[ "$file" = '' ] && file="./config/dev.yaml"

landscape="$(yq -r '.landscape' "$file")"
platform="$(yq -r '.platform' "$file")"
service="$(yq -r '.service' "$file")"
fast="$(yq -r '.fast' "$file")"
startCluster="$(yq -r '.startCluster' "$file")"

if [ "$fast" = 'true' ]; then
  kubectx "k3d-$landscape"
else
  if [ "$startCluster" = 'true' ]; then
    ./scripts/local/create-k3d-cluster.sh
    echo "🔃 Switching Context"
    kubectx "k3d-$landscape"
    echo "✅ Context switched"
  else
    kubectx
  fi
fi

if [ "$fast" = 'false' ]; then
  echo "🛠 Creating namespace '$platform'..."
  kubectl create ns "$platform" || true
  echo "✅ Namespace created"
fi

echo "🔃 Switching Namespace"
kubens "$platform"
echo "✅ Namespace switched"

release="$platform-$service"

clean_helm() {
  echo "🛑 Cleaning up Tilt resources..."
  helm uninstall --kube-context "k3d-$landscape" -n "$platform" "$release" --wait
  echo "✅ Tilt resources cleaned up"
}

if [ "$fast" = 'false' ]; then
  trap clean_helm EXIT
fi

echo "🔧 Installing Dependency Chart..."
helm upgrade --install --kube-context "k3d-$landscape" -n "$platform" --atomic "$release" ./infra/chart --values ./infra/chart/values.yaml --values "./infra/chart/values.${landscape}.yaml"
echo "✅ Dependency Chart installed"

export LANDSCAPE="$landscape"
export PUBLIC_LANDSCAPE="$landscape"

# shellcheck disable=SC2086
doppler run -p "$platform-$service" -c "$landscape" -- $dev
