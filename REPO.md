# REPO.md — socialLight features

socialLight is a full social-network platform (a Facebook-style clone) **with a
built-in store / e-commerce module**, built on the .NET / Microsoft stack with
**PostgreSQL** as the primary datastore, and architected after
[dotnet/eShop](https://github.com/dotnet/eShop). This document lists the product
features. For *how* the code is structured, see [CLAUDE.md](CLAUDE.md).

> **The headline feature is the engine, not the app.** socialLight is, above
> all, a **proof-of-concept for [`code-engine`](code-engine)** — a deterministic
> spec→template generator that produces the redundant eShop-style vertical slice
> of a service (model, EF context, minimal API, integration events, or a DDD
> aggregate + commands) **instead of generating that boilerplate by inference.**
> The social network + store below is the showcase corpus that exercises and
> validates the engine; we build it out *as if* shipping it for real. See
> [CLAUDE.md §0](CLAUDE.md).

> Status: this catalog describes the intended feature set. Each feature maps to
> one or more services following the eShop service patterns (DDD/CQRS for rich
> domains, CRUD for simple ones, async integration events between services), and
> is preferably scaffolded by `code-engine` rather than hand-written.

---

## ⭐ code-engine — deterministic code generator (the core experiment)

- **Spec-driven scaffolding** — describe an entity once as JSON; render the full
  vertical slice of `.cs` files from Nunjucks templates.
- **Two presets** — `simple-service` (Catalog-style CRUD) and `rich-domain`
  (Ordering-style DDD aggregate + commands).
- **Deterministic, not inferred** — the repetitive surface is generated;
  inference is reserved for genuinely novel logic.
- **Extensible** — add templates (`.njk`), presets (folders), custom types and
  filters without touching the engine core.
- See [`code-engine/SKILL.md`](code-engine/SKILL.md) for usage and the spec
  schema.

---

## 🛒 Store / E-commerce module (the eShop base, retained & expanded)

The original eShop e-commerce app is **kept and grown into socialLight's store**,
so members can shop and sell inside the social network:

- **Product catalog** — browse/search products, categories, brands, pricing,
  AI/semantic catalog search via pgvector. (`Catalog.API`.)
- **Shopping cart / basket** — Redis-backed cart, add/update/remove items.
  (`Basket.API`.)
- **Checkout & orders** — full ordering workflow: order placement, stock
  validation, status transitions, cancellation, shipping. DDD/CQRS aggregate.
  (`Ordering.API` + `Ordering.Domain`.)
- **Payments** — payment processing worker with grace-period handling.
  (`PaymentProcessor`.)
- **Order fulfilment** — background order processing off integration events.
  (`OrderProcessor`.)
- **Marketplace tie-ins (new)** — surface products in the social feed, share
  products to timelines, shop from pages/groups, social proof (friends'
  purchases/wishlists).

---

## Core social features

- **Accounts & Identity** — sign-up, login, OIDC/OAuth, profile ownership,
  password reset, sessions. (Identity.API — eShop `Identity.API` pattern.)
- **Profiles** — public/private profiles, avatar & cover photos, bio, about
  info, profile editing. (Profile service — `Catalog`-style CRUD.)
- **Friendships & connections** — friend requests, accept/decline, block/unblock,
  followers/following, friend suggestions. (Rich domain — `Ordering` DDD pattern:
  friendship as an aggregate with state transitions and domain events.)
- **News feed / timeline** — personalized feed aggregation, ranking, pagination,
  fan-out on write/read via a background `FeedProcessor` worker consuming
  integration events.
- **Posts** — create/edit/delete posts, text + media, privacy scope
  (public/friends/only-me), tagging, mentions, hashtags.
- **Comments & replies** — threaded comments, edits, deletes, mentions.
- **Reactions** — like and rich reactions (love, haha, wow, etc.) on posts and
  comments.
- **Sharing / reposts** — share a post to your timeline with optional commentary.

## Media

- **Photo & video uploads** — media storage, async transcoding/thumbnailing via
  a `MediaProcessor` worker (eShop `PaymentProcessor`-style background service).
- **Albums & galleries** — organize photos, set album privacy.

## Engagement & discovery

- **Notifications** — real-time + persisted notifications for reactions,
  comments, friend requests, mentions, group activity. (Notifications service —
  Redis/ephemeral + push, `Basket`-style state.)
- **Search** — search people, posts, groups, and pages; **semantic / vector
  search** powered by **pgvector** (Postgres), mirroring eShop's AI catalog
  search.
- **Recommendations** — friend suggestions and content recommendations using
  embeddings (pgvector).
- **Trending / hashtags** — trending topics and hashtag feeds.

## Messaging & real-time

- **Direct messaging / chat** — one-to-one and group conversations, message
  history, read receipts, typing/presence indicators.
- **Presence** — online/last-seen status (ephemeral, Redis-backed).

## Groups, pages & events

- **Groups** — create/join groups, group feeds, membership roles & moderation.
- **Pages** — public pages/brands with followers and posts.
- **Events** — create events, invite, RSVP, event feeds.

## Stories & ephemeral content

- **Stories** — time-limited (24h) photo/video stories with view tracking.

## Platform & integration

- **Webhooks** — outbound webhook subscriptions for third-party integrations
  (eShop `Webhooks.API` / `WebhookClient` pattern).
- **Mobile BFF** — a YARP reverse-proxy backend-for-frontend serving the mobile
  client (eShop `mobile-bff` pattern).
- **Web client** — Blazor-based web app (eShop `WebApp` / `WebAppComponents`).
- **Mobile / hybrid client** — .NET MAUI app (eShop `HybridApp` / `ClientApp`).

## Cross-cutting / non-functional

- **Microservices** orchestrated with **.NET Aspire** (single AppHost).
- **Async integration events** over **RabbitMQ** with a **transactional outbox**
  for reliable, eventually-consistent cross-service communication.
- **Per-service PostgreSQL** databases (no shared DB), EF Core migrations applied
  on startup.
- **Observability** — OpenTelemetry traces/metrics/logs and `/health` endpoints
  on every service via shared ServiceDefaults.
- **API versioning + OpenAPI** on all HTTP services.
- **Resilient service-to-service HTTP** (service discovery + retry/circuit
  breaker) via ServiceDefaults.
- **Authentication/authorization** centralized in Identity.API (OIDC/JWT).
- **Testing** — Aspire integration test host + Playwright E2E.

---

### Reference architecture mapping

| Capability area              | eShop pattern followed / tool                 |
|------------------------------|-----------------------------------------------|
| Boilerplate generation       | **`code-engine`** (spec → Nunjucks templates) |
| Store: catalog               | `Catalog.API`                                 |
| Store: cart                  | `Basket.API` (Redis)                          |
| Store: checkout/orders       | `Ordering.API` + `Ordering.Domain` (DDD/CQRS) |
| Store: payments/fulfilment   | `PaymentProcessor` / `OrderProcessor` workers |
| Auth & accounts              | `Identity.API`                                |
| Profiles, posts (CRUD)       | `Catalog.API` pattern                         |
| Friendships, groups (rich)   | `Ordering.API` + `Ordering.Domain` pattern    |
| Feed/media background work   | `OrderProcessor` / `PaymentProcessor` pattern |
| Notifications/presence       | `Basket.API` (Redis) pattern                  |
| Messaging fan-out            | `EventBusRabbitMQ` + `IntegrationEventLogEF`  |
| Vector search / recommend    | Postgres + `pgvector` (eShop AI search)       |
| Webhooks                     | `Webhooks.API` / `WebhookClient`              |
| Mobile BFF                   | `mobile-bff` (YARP)                           |
| Web / mobile clients         | `WebApp`, `HybridApp`                         |
| eShop → SocialLight rebrand  | `scripts/Rename-Namespaces.ps1`               |
