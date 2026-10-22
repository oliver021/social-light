#!/usr/bin/env bash
# Paste/run in the Proxmox NODE shell (as root). Creates a Debian 12 LXC with Docker ready for socialLight.
#
#   bash proxmox-create-lxc.sh                      # create + install Docker only
#   BUNDLE=/root/sociallight-demo-bundle.tar.gz bash proxmox-create-lxc.sh   # also deploy the bundle
#
# Overrides (env): CTID HOSTNAME STORAGE TEMPLATE_STORAGE BRIDGE CORES RAM_MB DISK_GB IP (dhcp | 192.168.1.50/24,gw=192.168.1.1)
set -euo pipefail

CTID="${CTID:-$(pvesh get /cluster/nextid)}"
HOSTNAME="${HOSTNAME_CT:-sociallight}"
STORAGE="${STORAGE:-local-lvm}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
BRIDGE="${BRIDGE:-vmbr0}"
CORES="${CORES:-4}"
RAM_MB="${RAM_MB:-6144}"
DISK_GB="${DISK_GB:-30}"
IP="${IP:-dhcp}"
BUNDLE="${BUNDLE:-}"

command -v pct >/dev/null || { echo "Run this on the Proxmox node." >&2; exit 1; }

echo "== template"
pveam update >/dev/null
TEMPLATE="$(pveam available --section system | awk '/debian-12-standard/ {print $2}' | sort -V | tail -1)"
[ -n "$TEMPLATE" ] || { echo "no debian-12 template found" >&2; exit 1; }
pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE" || pveam download "$TEMPLATE_STORAGE" "$TEMPLATE"

NET="name=eth0,bridge=$BRIDGE,ip=dhcp"
[ "$IP" != "dhcp" ] && NET="name=eth0,bridge=$BRIDGE,ip=${IP%%,*},${IP#*,}"

echo "== creating CT $CTID ($HOSTNAME)"
pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE" \
  --hostname "$HOSTNAME" --cores "$CORES" --memory "$RAM_MB" --swap 1024 \
  --rootfs "$STORAGE:$DISK_GB" --net0 "$NET" \
  --unprivileged 1 --features nesting=1,keyctl=1 \
  --onboot 1 --ostype debian

pct start "$CTID"
echo "== waiting for network"
for i in $(seq 1 30); do pct exec "$CTID" -- ping -c1 -W1 deb.debian.org >/dev/null 2>&1 && break; sleep 2; done

echo "== installing Docker"
pct exec "$CTID" -- bash -c 'export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq curl ca-certificates openssl python3 >/dev/null && curl -fsSL https://get.docker.com | sh >/dev/null && mkdir -p /opt/sociallight && docker --version && docker compose version'

IPADDR="$(pct exec "$CTID" -- hostname -I | awk '{print $1}')"

if [ -n "$BUNDLE" ]; then
  echo "== deploying bundle"
  pct push "$CTID" "$BUNDLE" /opt/sociallight/bundle.tar.gz
  pct exec "$CTID" -- bash -c 'cd /opt/sociallight && tar xzf bundle.tar.gz && rm bundle.tar.gz && ./lxc-install.sh'
else
  cat <<MSG

CT $CTID ready at $IPADDR with Docker. Next, from the machine that built the images:
  scp sociallight-demo-bundle.tar.gz root@$IPADDR:/opt/sociallight/   (enable PermitRootLogin or use: pct push $CTID <file> /opt/sociallight/bundle.tar.gz)
then on the Proxmox node:
  pct exec $CTID -- bash -c 'cd /opt/sociallight && tar xzf bundle.tar.gz && ./lxc-install.sh'
MSG
fi
