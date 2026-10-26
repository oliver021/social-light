#!/usr/bin/env python3
"""Post-process the Aspire-generated docker-compose.yaml into the demo subset.

Usage: make-demo-compose.py <aspire-out>/docker-compose.yaml > docker-compose.yaml
Keeps only the services the demo needs, drops the Aspire dashboard/OTLP wiring,
adds healthchecks (postgres, rabbitmq), restart policies, and the web frontend.
"""
import sys, yaml

KEEP = ["postgres", "eventbus", "identity-api", "profile-api", "posts-api",
        "engagement-api", "socialgraph-api", "feed-api", "media-service",
        "groups-api", "organizations-api", "events-api", "stories-api", "reels-api", "notifications-api",
        "chat-api", "catalog-api", "social-bff"]
APIS = [s for s in KEEP if s.endswith(("-api", "-service"))]

src = yaml.safe_load(open(sys.argv[1]))
svc = {k: src["services"][k] for k in KEEP}

for name, s in svc.items():
    env = s.get("environment")
    if isinstance(env, dict):
        for k in [k for k in env if k.startswith("OTEL_")]:
            del env[k]
    s["restart"] = "unless-stopped"
    s.pop("ports", None) if name != "social-bff" else None

svc["postgres"]["healthcheck"] = {
    "test": ["CMD-SHELL", "pg_isready -U postgres"], "interval": "5s", "timeout": "5s", "retries": 20}
svc["eventbus"]["healthcheck"] = {
    "test": ["CMD", "rabbitmq-diagnostics", "-q", "ping"], "interval": "10s", "timeout": "10s",
    "retries": 20, "start_period": "20s"}
# media-service writes blobs to disk; the image runs non-root and /app is read-only to it.
svc["media-service"]["environment"]["Media__BlobRoot"] = "/data/blobs"
svc["media-service"]["volumes"] = ["blobs:/data/blobs"]
svc["media-service"]["user"] = "0:0"
svc["postgres"].setdefault("volumes", []).append("pgdata:/var/lib/postgresql/data")

for name in APIS:
    dep = svc[name].setdefault("depends_on", {})
    dep["postgres"] = {"condition": "service_healthy"}
    dep["eventbus"] = {"condition": "service_healthy"}
svc["social-bff"]["depends_on"] = {n: {"condition": "service_started"} for n in APIS}
svc["social-bff"]["ports"] = ["${PUBLIC_GATEWAY_PORT:-8088}:5000"]

svc["web"] = {
    "image": "${WEB_IMAGE}", "restart": "unless-stopped",
    "environment": {"NODE_ENV": "production", "GATEWAY_URL": "http://social-bff:5000"},
    "ports": ["${PUBLIC_WEB_PORT:-3000}:3000"],
    "depends_on": {"social-bff": {"condition": "service_started"}},
    "networks": ["aspire"],
}

out = {"name": "sociallight-demo", "services": svc, "networks": src["networks"],
       "volumes": {"pgdata": {}, "blobs": {}}}
import re
text = yaml.safe_dump(out, sort_keys=False, default_flow_style=False, width=200)
# Gateway/identity env still references ports of services outside the demo subset:
# give every ${*_PORT} a default so compose does not warn about unset variables.
text = re.sub(r"\$\{([A-Z_]+_PORT)\}", r"${\1:-8080}", text)
sys.stdout.write(text)
