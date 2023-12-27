#!/usr/bin/env bash

set -eou pipefail
bun i
SKIP=a-svelte-check pre-commit run --all -v
