# socialLight — demo deployment (Docker Compose)

Subset of the stack for a demo: Postgres (pgvector), RabbitMQ, Identity, Profile, Posts,
Engagement, SocialGraph, Feed, Media, Groups, Organizations, Events, Stories, Reels, Notifications,
Chat, Catalog, the YARP gateway (`social-bff`) and the web frontend.
Verified end to end (signup → login → profile → post → comment) on Docker 29 / Linux, ~0.7 GB RAM.

## Why Compose and not the Aspire AppHost
The AppHost's gateway runs in a container and calls `host.docker.internal`, which does not
exist on native Linux Docker. In Compose every service resolves by name on one network.

## Deploy
1. **Host (LXC)**: Docker + compose plugin. On Proxmox enable `nesting=1,keyctl=1` for the container.
   Suggested: 4 vCPU, 4–8 GB RAM, 20 GB disk.
2. **Build the images** on a machine with the .NET 10 SDK and Docker, from the repo root:
   `deploy/build-images.sh .` (7 .NET images + the web frontend).
3. **Ship them to the LXC** — either `docker save $(docker images 'sociallight/*' -q) | ssh lxc docker load`
   or push to a private registry and change the `*_IMAGE` values in `.env`.
4. On the LXC: copy `deploy/` there, `cp .env.example .env`, replace every `CHANGE_ME`
   (`openssl rand -hex 16`), then `docker compose up -d`.
5. Web on `:3000`, gateway on `:8088`. Put Caddy / Nginx Proxy Manager in front for HTTPS and
   publish only the web port.

## Regenerating the compose file
`docker-compose.yaml` is the Aspire-generated file post-processed by `make-demo-compose.py`
(subset, healthchecks, restart policies, web service, media volume). The AppHost declares
`AddDockerComposeEnvironment("compose")`, so from the repo root:

```
dotnet run --project src/SocialLight.AppHost --no-launch-profile -- \
  --operation publish --step publish-compose --output-path ./aspire-out
python3 deploy/make-demo-compose.py aspire-out/docker-compose.yaml > deploy/docker-compose.yaml
```
Use `--step publish-compose`; the default publish pipeline also runs a `compose down` step that fails.

## Fixed while preparing this demo
- **Identity.API / Profile.API** had no `EventBus:SubscriptionClientName`, so their RabbitMQ
  consumer declared a queue with a null name (`NullReferenceException` at startup). Added to
  both `appsettings.json`; queues `Identity` and `Profile` now have a consumer.
- **media-service** runs non-root and cannot write `/app/blobs`. The Compose file gives it a
  volume at `/data/blobs` (`Media__BlobRoot`) and runs it as root in the container (demo only).

## Before exposing it publicly
- Dev OAuth client `social-tests` / secret `secret` is still seeded in Identity — remove or rotate it.
- Only the gateway and web ports are published; keep it that way.
- Modules not in this subset (Gaming, Jobs, Moderation, Pages, Recommendation, Threads, and the
  store's Ordering/Basket) return 502 at the gateway.
