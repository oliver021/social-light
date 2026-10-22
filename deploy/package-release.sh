#!/usr/bin/env bash
# Run on the build machine after deploy/build-images.sh. Creates one file to ship to the LXC.
# Usage: package-release.sh [output-file]   (default: ./sociallight-demo-bundle.tar.gz)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(realpath -m "${1:-sociallight-demo-bundle.tar.gz}")"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
IMAGES=$(docker images 'sociallight/*:demo' --format '{{.Repository}}:{{.Tag}}')
[ -n "$IMAGES" ] || { echo "no sociallight/*:demo images; run build-images.sh first" >&2; exit 1; }
echo "== saving $(echo "$IMAGES" | wc -l) images"
docker save $IMAGES -o "$TMP/images.tar"
cp "$HERE/docker-compose.yaml" "$HERE/.env.example" "$HERE/lxc-install.sh" "$TMP/"
chmod +x "$TMP/lxc-install.sh"
tar -C "$TMP" -czf "$OUT" .
ls -lh "$OUT"
