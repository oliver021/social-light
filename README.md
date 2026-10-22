# socialLight

> **A thesis disguised as a social network.** The app is the test corpus; the
> product is [`code-engine`](code-engine), a deterministic generator that writes
> the repetitive 80% of a microservice backend from a spec — no LLM inference.

## The thesis

Most of a microservice application is *redundant*: every entity needs the same
vertical slice (model, EF context, repository, minimal API, integration events,
or a DDD aggregate plus commands). Asking an LLM to re-type that slice for every
entity is slow, non-deterministic and expensive, and it drifts. The hypothesis
this repo tests:

1. **Redundant structure should be generated deterministically** — spec in,
   templates, the same bytes out every time. `code-engine` does this.
2. **Inference should be reserved for the genuinely novel parts** — domain logic,
   feeds, ranking, UI behaviour — written by hand or with an AI assistant *on the
   rails the generator lays down*.
3. **A rich, pre-existing domain should be reused, never regenerated.** The
   dotnet/eShop services (Catalog, Basket, Ordering) are kept intact as the
   Marketplace module, as the counter-example to generation.

To exercise that hypothesis at a realistic scale, the repo builds an ambitious
Facebook-style social network *as if it were being shipped*: identity, profiles,
posts, engagement, social graph, feed, media, stories, reels, groups, events,
chat, notifications and a marketplace — about 15 independently deployable
services behind a YARP gateway, communicating through RabbitMQ with a
transactional outbox. The network is the showcase; the generator is the point.

## What this project is *not* (read before judging the UI)

**UX is deliberately not a priority here.** The web client (`src/main_fronted`)
exists so the backend can be driven and demonstrated end to end; it is a thin
React shell over typed API clients, not a product-design exercise. It has had a
responsive and contrast pass, but it is not polished, has no design system
behind it, and some surfaces are intentionally incomplete (for example checkout
is disabled by design, and payment is left unbuilt on purpose). Judge this repo
on its architecture, its module isolation, its event-driven backbone and its
generator, not on pixels.

## What to look at

| If you care about… | Look at |
|---|---|
| The generator and its design contract | [`code-engine/`](code-engine), [DESIGN-STRATEGY.md](code-engine/DESIGN-STRATEGY.md) |
| Spec → generated typed clients | [`clients/typescript/`](clients/typescript) |
| Deterministic synthetic content (replay without an LLM) | [`content-engine/`](content-engine) |
| Module isolation (schema per module, no cross-module joins, events only) | [`src/Modules/`](src/Modules) |
| Rich DDD/CQRS kept as-is from eShop | `src/Ordering.*`, `src/Catalog.API` |
| Orchestration and a deployable demo | [`src/SocialLight.AppHost`](src/SocialLight.AppHost), [`deploy/`](deploy/README.md) |

## Demo status (honest numbers)

- The demo Compose stack runs **18 containers** (Postgres+pgvector, RabbitMQ,
  14 .NET services, gateway, web) in roughly **1.1 GB of RAM**.
- An end-to-end journey (sign up → log in → profile → post with uploaded media →
  comment → follow → feed) is covered by the TypeScript SDK e2e test in
  `clients/typescript/test`.
- Not done on purpose or not yet: payment/checkout, real-time chat transport
  (SignalR), native mobile clients (not shipped in this repo), and production
  hardening (the dev OAuth client is still seeded — see the deploy README).

## Built with Claude Code

Development of this repository was done with **Claude Code**, with explicit and
direct participation — it is the only AI tool this project endorses. See
[CLAUDE.md](CLAUDE.md) for the instructions it works under.

## Documentation

| Doc | What it covers |
|-----|----------------|
| [CLAUDE.md](CLAUDE.md) | Authoritative architecture & design guide (patterns, conventions, the code-engine thesis). |
| [REPO.md](REPO.md) | Catalog of product features (social + store) and how each maps to an eShop pattern. |
| [code-engine/SKILL.md](code-engine/SKILL.md) | The generator: entity spec schema, presets, usage. |

## Architecture at a glance

- **Microservices orchestrated by .NET Aspire** — a single AppHost wires up every
  service, database, cache, and broker. Local dev = run the AppHost.
- **PostgreSQL (with pgvector)** as the primary datastore — one database per
  service, EF Core migrations applied on startup. (No MSSQL — see
  [CLAUDE.md §2](CLAUDE.md).)
- **Async integration events over RabbitMQ** with a transactional outbox.
- **Two service shapes:** simple CRUD (Catalog-style) and rich DDD/CQRS
  (Ordering-style) — both scaffolded by `code-engine`.
- **Store / e-commerce module:** the eShop catalog, basket, ordering, and payment
  services are kept and expanded as socialLight's built-in store.

## Getting started

Prerequisites: the **.NET 10 SDK** (pinned in [global.json](global.json)) and a
Docker engine (for Postgres, Redis, and RabbitMQ containers).

```powershell
# Run everything via the Aspire AppHost:
dotnet run --project src/SocialLight.AppHost/SocialLight.AppHost.csproj
```

The Aspire dashboard then shows every service, its logs, and traces. In Visual
Studio you can instead open `SocialLight.Web.slnf` and start
`SocialLight.AppHost` as the startup project.

> **Linux:** the AppHost's `social-bff` gateway runs in a container and reaches
> services through `host.docker.internal`, which native Docker on Linux does not
> provide (the gateway answers `502`). Use **Docker Desktop** (Windows/macOS) for the
> AppHost, or run the Compose deployment below, which works on plain Linux.

## Demo deployment (Docker Compose)

[deploy/](deploy/README.md) contains a self-contained Compose stack of the demo
subset (Identity, Profile, Posts, Engagement, SocialGraph, Feed, Media, gateway,
web frontend) — verified end to end: signup → login → profile → post → comment.
See [deploy/README.md](deploy/README.md) for build, ship, and run steps.

## code-engine quickstart


```powershell
cd code-engine
npm install
node src/index.js list-presets
node src/index.js generate examples/post.entity.json --out ../src --dry-run
```

## Credits / provenance

socialLight is built on top of the **[dotnet/eShop](https://github.com/dotnet/eShop)**
reference application (MIT licensed — see [LICENSE](LICENSE)). The e-commerce
services originate there and are retained as the store module; the `eShop`
namespace was rebranded to `SocialLight` with
[scripts/Rebrand-Solution.ps1](scripts/Rebrand-Solution.ps1). Upstream
attribution, sample-data notes, and contribution docs are preserved in
[CONTRIBUTING.md](CONTRIBUTING.md) and the original eShop documentation.
