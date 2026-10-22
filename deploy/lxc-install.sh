#!/usr/bin/env bash
# Runs INSIDE the LXC, in the folder where the release bundle was extracted.
# Loads the images, generates random secrets (.env) and starts the stack.
set -euo pipefail
cd "$(dirname "$0")"

[ -f images.tar ] && { echo "== loading images"; docker load -i images.tar; }

if [ ! -f .env ]; then
  echo "== generating .env with random secrets"
  while IFS= read -r line; do
    if [[ "$line" == *=CHANGE_ME ]]; then echo "${line%CHANGE_ME}$(openssl rand -hex 16)"; else echo "$line"; fi
  done < .env.example > .env
  chmod 600 .env
fi

echo "== starting stack"
docker compose up -d
IP="$(hostname -I | awk '{print $1}')"
echo
echo "Web:     http://$IP:3000"
echo "Gateway: http://$IP:8088"
echo "Status:  docker compose ps   (first start takes ~1-2 min until all are healthy)"
