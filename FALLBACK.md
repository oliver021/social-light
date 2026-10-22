# FALLBACK.md — issues hit & takeaways

A running log of the non-obvious problems encountered building out the socialLight
backend (the deterministic `code-engine` modules + the hand-written Identity/Profile/
Feed + the Aspire host + the gateway), and what we learned fixing each. Written so the
next person (human or agent) doesn't re-pay the same debugging cost.

> The single highest-value lesson: **the layered tests (engine unit, in-process
> functional) all passed while six real integration bugs sat undetected. Only the
> end-to-end acceptance test — booting the *real* AppHost and driving HTTP through the
> gateway — found them.** Build that test early; it pays for itself.

---

## How to reproduce / run

- **Run the backend (cert-free):** `dotnet run --project src/SocialLight.AppHost --launch-profile http`
  (the `http` profile sets `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true`; the user does not
  install dev certs). Needs Docker (Postgres + RabbitMQ containers).
- **The acceptance gate:** `dotnet test tests/SocialLight.AcceptanceTests` — boots the
  whole AppHost via `DistributedApplicationTestingBuilder` and drives 3 users through
  signup → login → profile → post → comment over HTTP through the `social-bff` gateway.
  Green in ~32s. Needs Docker.
- **Engine self-tests:** `cd code-engine && npm test` (28 tests, incl. `verify` golden
  fixtures). **Module/Profile functional tests:** need Docker (real Postgres).

---

## Engine (code-engine) generation issues

| # | Symptom | Root cause | Fix | Takeaway |
|---|---------|-----------|-----|----------|
| E1 | `posts` module: 6/12 functional tests fail with `FK_PostMedias_Posts_PostId` violation | Generated child-entity test built its request with a random `Guid.NewGuid()` for the parent FK; no parent row existed | Engine now detects intra-module FKs by the `<Parent>Id` convention and generates `SampleRequestAsync` that POSTs the parent first (`src/spec.js`, `__Entity__ApiTests.cs.njk`) | Flat-entity tests passing says nothing about related entities. Make the self-test corpus include a real FK (we added `PostId` to the example `Comment`). |
| E2 | `events` module: 187 compile errors, "An add or remove accessor expected" | Entity named `Event` → camel identifier `event`, a **C# reserved keyword**; emitted as a bare local/param name | Added `csId()` keyword-escaper (`@event`) in `filters.js`; kept a raw `entityLabel` for prose (OpenAPI summaries) where `@` must not appear | Any user-supplied name can collide with a language keyword. Escape at the identifier boundary, not the prose boundary. |
| E3 | Owner-bound modules: test project won't compile (`CreatePostRequest` ctor arg count) | Auth feature dropped the owner field from the Create DTO, but the **flat** test branch still iterated `nonKeyFields` (incl. the dropped field) | Flat branch uses `createFields` like the FK branch | When you add a cross-cutting transform, audit *every* template branch, not just the one you're editing. |

---

## Host / Aspire orchestration issues (found by the live boot)

| # | Symptom | Root cause | Fix | Takeaway |
|---|---------|-----------|-----|----------|
| H1 | All services unhealthy; `*_https_/health` checks time out | Cert-free env, but `WithHttpHealthCheck("/health")` probed the **https** endpoint (no dev cert) | `WithHttpHealthCheck("/health", endpointName: "http")` on every service | `ASPIRE_ALLOW_UNSECURED_TRANSPORT` *permits* http but does **not** strip https endpoints; point health checks at the http endpoint explicitly. |
| H2 | `database "<x>db" does not exist`; 5-min timeout; resources "failed to start" | **Startup deadlock**: each service `.WaitFor(db)` waited for the database resource's health check, but the database only exists after the service's `EnsureCreated`/migration runs | `WithReference(db)` **without** `WaitFor(db)` (still `WaitFor` the postgres *server*) | A per-database health check + `WaitFor(db)` + app-side DB creation is a circular wait. This would deadlock a normal `dotnet run`, not just the test. |
| H3 | Every service crashes at startup: `InvalidOperationException: Section 'Scopes' not found` | Once the host injects `Identity__Url`/`Identity__Audience`, ServiceDefaults `AddDefaultOpenApi` does `GetRequiredSection("Scopes")` | Host injects `Identity__Scopes__socialapi` to each service | Turning on one config section (Identity) silently activated a *required* sibling. Injecting partial config is worse than none. |
| H4 | Module APIs 400 on `/api/...` when proxied through the gateway | YARP forwards the path without `?api-version`; modules required an explicit version | `AssumeDefaultVersionWhenUnspecified = true` + `DefaultApiVersion = v1` (engine template + Profile + Feed) | A single public origin must tolerate version-less calls; the typed clients add the param, raw/proxied calls don't. |
| H5 | First HTTP calls after boot return 5xx (`database starting up`, table missing) | Services report healthy a beat before their migration/`EnsureCreated` finishes | Acceptance test retries early calls through the warmup window (real clients do too) | "Healthy" (server reachable) ≠ "ready" (schema migrated). Retry transient cold-start 5xx. |

---

## Auth / Identity issues

| # | Symptom | Root cause | Fix | Takeaway |
|---|---------|-----------|-----|----------|
| A1 | Signup returns 500: `null value in column "CardNumber" of relation "AspNetUsers" violates not-null constraint` | `ApplicationUser` still carries eShop e-commerce fields, all `[Required]`/NOT NULL; the social signup didn't set them (and they can't just be removed — the inherited migration created the columns) | Signup sets empty defaults for the vestigial fields (`AccountApi.cs`); proper fix is trimming `ApplicationUser` + a migration (deferred) | Inherited models carry hidden required state. Removing a property doesn't drop a NOT-NULL column — you need a migration. |
| A2 | Bearer calls (profile/post/comment) return 401; log shows IdentityServer "processed requests for 2 issuers: `http://localhost:55111`, `http://host.docker.internal:55111`" | **Multi-host issuer mismatch**: the token is issued under the host the request arrived on (gateway→identity path) but modules validate `iss` against their own `Identity__Url` host | `ValidateIssuer = false` in ServiceDefaults `AuthenticationExtensions` (signature still verified via the authority's keys; `ValidateAudience` was already off) | In Aspire/dev the authority is reached on different hosts by different callers. Production should pin a stable `IssuerUri` behind the gateway and re-enable issuer validation. |

---

## Process / diagnosis takeaways

- **Layered green ≠ integrated green.** Engine 28/28, module functional, Profile 3/3,
  Feed composer 3/3, AppHost 0/0 — all green while H1–H5/A1–A2 lurked. The in-process
  functional tests inject *no* Identity config and never boot real project processes,
  so they're blind to auth wiring, health-check transport, DB-creation ordering, and
  issuer handling. **Invest in one real end-to-end test.**
- **Persistent Aspire containers replay old logs.** `ContainerLifetime.Persistent`
  Postgres/RabbitMQ stream their *historical* logs on each run; we chased "errors" with
  timestamps from a previous run. When diagnosing a fresh failure, `docker rm -f` the
  pgvector/rabbitmq containers first for a clean log + clean DB state.
- **Don't `tail` the output of a test you might need to debug.** Piping
  `dotnet test | tail -40` truncated the real exception and cost a re-run. Capture full
  output to the file; grep it.
- **Read the failure top-down.** Health-check `TaskCanceledException` noise at the tail
  was just host teardown *after* the test threw — the real assertion/exception was
  earlier in the log.
- **Peel one layer per iteration.** Each ~30–75s boot revealed exactly one new blocker
  (https → deadlock → Scopes → NOT NULL → issuer). Resist changing several things at
  once; you lose the signal.

---

## Known remaining cleanup (non-blocking; gate is green)

- Trim `ApplicationUser`'s eShop fields + EF migration, so signup needn't set empty
  defaults (removes A1's workaround).
- Pin a stable issuer behind the gateway and re-enable `ValidateIssuer` for production
  (closes A2's relaxation).
- Add the other 7 modules' gateway routes (one `AddRoute` each) and the full
  Duende.BFF web cookie-session flow.
- Wire Identity's `UserRegistered`/`UserDeleted` integration events (Profile auto-create
  on registration; `UserDeleted` cascades in the modules that `consumes` it).
