# Spec-driven generator design

> A **module-based** code generator driven by specifications. Each spec describes a complete
> module (backend + clients + platform-specific CRUD UIs). Pages with unique
> characteristics are hand-coded atop the scaffolding provided by the generator.
> Structural inspiration: `dotnet/eShop` — adopting its **decoupling** model
> (events, outbox, ports) while deliberately discarding its **internal inconsistency**.

---

## 1. Guiding principle

> **Ceremony is proportional to domain complexity; the *form* is invariant.**

eShop teaches *what* to decouple, but its internal structure is inconsistent (Ordering uses
full DDD across 3 projects; Catalog/Basket are simple CRUD in a single project). That
inconsistency works for a human team managing ~6 services but is toxic for a generator:
a machine requires a predictable *target*.

Therefore, the decision here is the opposite of eShop's: **a single, mandatory canonical
module form**, with DDD as an explicit *opt-in* only for modules with rich logic.

The line that truly organizes the system is **not backend-vs-frontend**; it is:

> **deterministic spec projection  ≠  product decision.**

The former is generated; the latter is hand-coded. That line cuts right through the
middle of the frontend, not along its boundary.

---

## 2. The generator equation

It is not simply `template + spec = source`. Elevating the spec to the module level
introduces **two template scopes**, because there are artifacts that belong not to
any specific entity but to the module as a whole (e.g., `DbContext`, `AddXModule()`,
schema, event registration):

```
template + spec + scope = source(s)
```

| Scope      | Rendered...             | Owns routes such as...                        |
|------------|-------------------------|-----------------------------------------------|
| **module** | once per spec           | `{Module}/{Module}DbContext.cs`, `AddXModule.cs` |
| **entity**   | once per entity | `{Module}/Domain/{Entity}.cs`, `…/{Entity}Repository.cs` |

Each template still **owns a path**—except the path itself is a
template that expands using the module and/or entity name.

---

## 3. The spec (per module)

The spec is written at the **module** level, not the entity level, because the module is the unit of
isolation (its schema, its `DbContext`, its event surface).

```yaml
module: Posts
schema: posts                # its own schema → logical DB isolation
routePrefix: /api/posts

entities:
- name: Post
fields:
- { name: Title,   type: string,  required: true, max: 280 }
- { name: Body,    type: string }
- { name: AuthorId, type: guid,   index: true }
relations:
- { to: Comment, kind: oneToMany }   # INTERNAL FK → allowed
ui:                        # neutral intent (see §8)
list:   { primary: Title, secondary: Body, avatar: AuthorId }
detail: { sections: [Title, Body, comments] }

- name: Comment
fields:
- { name: Text,     type: string, required: true }
- { name: AuthorId, type: guid }

publishes: [PostCreated, PostDeleted]   # outbound contract
consumes:  [UserDeleted]                # inbound contract
```

### Decoupling invariant (enforced by the generator)

- A `relation` can **only** point to an entity **within the same spec**.
- If it points outside the module → **the generator rejects the spec**. There is no way to emit
a cross-module FK because the format does not allow it.
- Anything outside the module is referenced **only** via `publishes`/`consumes`, never via
relationships or queries. The "iron rule" no longer relies on the author's discipline; instead, it becomes an invariant
of the format.

---

## 4. Isolation: DB and broker

### "Infrastructure" consists of three things, not one

| Component    | What it is                      | Where it lives                     |
|--------------|---------------------------------|------------------------------------|
| **Port**     | `IPostRepository`, `IEventBus`  | inside the module (domain/app)     |
| **Adapter**  | the EF / RabbitMQ implementation| generic, shared                    |
| **Binding**  | "Postgres here", "broker there" | **only** in the host / composition root |

The module knows **only the port**. It never references `Npgsql`, `RabbitMQ.Client`, or a
connection string. Decoupling is achieved through **dependency inversion**, not folder structure.

### Database

- Physically, it can be **a single DB**; logically, each module is isolated.
- Each module has **its own schema** and its own `DbContext`.
- **Forbidden**: Cross-module foreign keys, JOINs between modules, or querying another module's tables. 
If `Comments` needs data from `Users`, it requests it via event or API—never via SQL.
- The connection (pool, engine, resilience) is provided by the host **once**; the module receives
its `DbContext` already configured via DI.
- If you ever want to move a module to its own database, nothing breaks: there were never
any cross-dependencies.

### Broker
ker

- The module publishes/subscribes to **strongly-typed integration events** via `IEventBus`
(the eShop `EventBus`/`EventBusRabbitMQ` pattern).
- The specific transport (RabbitMQ, Service Bus, in-memory for tests) is swapped out at
the host level **without touching the module**.

### Composition root (the only part written by hand, just once)

```csharp
// Host — the only place that knows about concrete implementations (bindings)
builder.AddNpgsqlDbContext<PostsDbContext>("postsdb");
builder.AddRabbitMqEventBus("eventbus");

// The module only exposes an extension method that registers ITS ports:
builder.Services.AddPostsModule(); // internally: AddScoped<IPostRepository, EfPostRepository>()
```

When creating a new module, the generator simply **adds one line** (`AddXModule()`) to the host.
Since the contract (the ports) is invariant, the module fits by design: the host doesn't
know *which* module it is, only that it adheres to the convention.

---

## 5. Frontend: platform-native, not hybrid

eShop includes four frontends running on the same runtime (.NET 10) using three strategies:

| App            | Stack                                   | UI Strategy                       |
|----------------|-----------------------------------------|-----------------------------------|
| WebApp         | Blazor Server (`AddInteractiveServer…`) | Server-side rendering, SignalR    |
| HybridApp      | .NET MAUI Blazor Hybrid (`BlazorWebView`)| Razor in native WebView (reuses web code) |
| ClientApp      | .NET MAUI **native** (XAML + MVVM)      | Truly native; no shared UI        |
| WebhookClient  | Blazor Server (demo)                    | —                                 |

The only thing shared between the web and hybrid apps is **WebAppComponents** (Razor). The ClientApp
does not share UI; it simply consumes the same APIs.

### Decision for this project: **native**

The argument that "hybrid reuses code" **loses its weight when a machine is doing the writing**. The cost of generating four native templates is roughly the same as generating one hybrid template, because no one actually types them out by hand. The generator **flips the eShop trade-off**: code reuse is no longer the deciding factor; the only thing that matters is "is it truly native?" → yes.

What can truly be shared across all frontends is **the API contract**
(typed gRPC/HTTP clients). If the generator outputs these clients as a module artifact,
any frontend can consume them without knowing anything about the backend—
achieving the same port-based decoupling, now crossing the client/server boundary.

---

## 6. The generated vs. manual boundary

### Why feeds and profiles resist the generator

- A **CRUD page is a direct projection of the spec**: "list Posts → edit → save"
contains no decisions that aren't already in the model. The spec *is* the page.
- A **feed is not a projection of any single entity**: it involves ranking, pagination,
source mixing, loading states, and optimistic updates. Its logic stems from product
decisions, not the model itself.
- A **profile is a composition** of multiple modules (posts, follows, stats) with
its own unique visual narrative.

Forcing a template here creates scaffolding that often has to be thrown away—
which is worse than starting from scratch.

### Three artifact categories (with distinct owners and lifecycles)

1. **Generated and immutable** — regenerated from the spec; never manually edited. 
*(entities, repos, `DbContext`, typed API clients, native CRUD pages)*
2. **Generated once as a seed** — initial scaffolding that becomes yours to own. 
*(navigation shell, profile container)*
3. **100% manual work on generated rails** — anything requiring unique character. 
*(feed, profile, onboarding)*

### The elegant conclusion

From the backend's perspective, manually built pages are simply
**yet another client connecting via the ports**. The feed
consumes the typed `Posts` client just like a generated CRUD page. The boundary
between generated and manual code **does not break decoupling—it relies on it**: the hand-written code
plugs in exactly where a template would, because both adhere to the same contract.
The generator doesn't write the feed; **it lays the tracks for it**.

---

## 7. Neutral UI intent

Multi-platform support is handled via **template-based conditional design**, analogous to
ports and adapters in the backend: one intent, multiple renders.

- The spec describes the UI **intent** in a neutral way—"list of Posts, with avatars,
navigable to details"—(see the `ui:` block in §3).
- Each **platform template** implements it using that platform's native language:
- Native MAUI → `CollectionView` + XAML + MVVM ViewModel
- Web → Razor component
- Same semantic source, platform-specific rendering. Just as a repository port is implemented
via an EF adapter: one intent, multiple adapters.

The UI templates **do have some personality**, but since this isn't a
production project, that is acceptable: the goal is a coherent skeleton, not a design system.

---

## 8. Rendering algorithm

```
load spec
validate invariants (§3): relations intra-module only; publishes/consumes well-formed
→ if it fails, REJECT

# module scope: once
for each module_template:
path   = template.path.expand(spec.module)
output = render(template, spec)
write(path, output, category=template.category)

# entity scope: once per entity
for each entity in spec.entities:
for each entity_template:
path   = template.path.expand(spec.module, entity.name)
output = render(template, spec, entity)
write(path, output, category=template.category)

# platform scope: Cartesian product entity × platform
for each platform in config.platforms:        # e.g., [maui, web]
for each entity in spec.entities:
if entity.ui exists:
render ui_template[platform] with entity.ui   # CRUD-page (category 1)

# host integration
add line  AddXModule()  to the composition root (idempotent)
```

**Writing rule by category:** category 1 artifacts are always overwritten;
category 2 artifacts are written only if they do not exist (seed);
the generator never touches category 3.

---

## 9. Template catalog

| Template             | Scope      | Category         | Path (expandable)                                   |
|----------------------|------------|------------------|-----------------------------------------------------|
| Entity / aggregate   | entity     | 1 immutable      | `{Module}/Domain/{Entity}.cs`                       |
| Repo port            | entity     | 1 immutable      | `{Module}/Domain/I{Entity}Repository.cs`            |
| EF repo adapter      | entity     | 1 immutable      | `{Module}/Infrastructure/Ef{Entity}Repository.cs`   |
| EF config            | entity     | 1 immutable      | `{Module}/Infrastructure/{Entity}Configuration.cs`  |
| Service              | entity     | 1 immutable      | `{Module}/Application/{Entity}Service.cs`           |
| API endpoints        | entity     | 1 immutable      | `{Module}/Api/{Entity}Endpoints.cs`                 |
| DbContext            | module     | 1 immutable      | `{Module}/Infrastructure/{Module}DbContext.cs`      |
| `AddXModule()`       | module     | 1 immutable      | `{Module}/{Module}ModuleExtensions.cs`              |
| Integration events   | module     | 1 immutable      | `Contracts/{Module}/{Event}.cs`                     |
| Typed API client     | module     | 1 immutable      | `Clients/{Module}Client.cs`                         |
| CRUD-page            | entity×plat| 1 immutable      | `App.{plat}/Pages/{Entity}ListPage.xaml(+.cs)`      |
| Navigation shell     | module     | 2 seed           | `App.{plat}/AppShell.xaml`                          |
| Feed / Profile       | —          | 3 manual         | *(not generated; consumes `Clients/*`)*             |

---

## 10. Sole output of this exercise

This document is the **only artifact** produced here (a design `.md` file). No code
is generated yet; this establishes the generator's contract for future implementation.

### Finalized decisions
- Spec by **module**, not by entity.
- Single canonical form; DDD as opt-in.
- Isolation: schema-per-module, no cross-references or cross-queries; events for external interaction.
- Dependency inversion: port in the module, shared adapter, binding in the host.
- **Native-per-platform** frontend; typed API clients as a shared artifact.
- Three artifact categories; feed/profile built manually atop generated rails.

### Pending refinement (next iteration)
- Complete grammar for the `ui:` block (what neutral expressiveness to allow without
leaking platform-specific decisions).
- EF migration strategy per module.
- Versioning of event contracts (`publishes`/`consumes`).

---

## 11. Enforcement — keeping the contract true

A contract that isn't mechanically enforced loses to entropy. Two layers, in
priority order:

1. **Spec-invariant validation at load (already implied by §3/§8).** The spec
   parser *rejects* a spec that violates an invariant — a `relation` pointing
   outside the module, a malformed `publishes`/`consumes`, a missing required
   field. Bad architectural state becomes *unrepresentable*, not merely
   detectable. (This requires strict parsing — the current v0 engine renders
   undefined values silently and must be tightened.)
2. **Regen-idempotency check.** Regenerate every spec into a clean tree and
   assert **zero diff** against the committed category-1 (immutable) files. This
   is the single check that makes *"the spec is the source"* true rather than
   aspirational: if it is green, drift into category-1 files is impossible. Add
   it to CI before any other guard.
3. **Category-1 edit guard (stretch).** Fail the build / pre-commit if an
   immutable generated file is hand-edited outside the generator.

---

## 12. Agent workflow (specs-only)

The agent's primary artifact is the **module spec**, not slice-shaped `.cs`:

```
1. author/edit   the module spec (entities, relations intra-module, publishes/consumes, ui)
2. generate      run the engine → category-1 files (always overwritten), category-2 seeds (once)
3. host          add AddXModule() (idempotent) + the DB/broker bindings — the only hand-wired line
4. novel only    write product logic in category-2/3 files (feed, profile, custom behavior)
5. verify        spec-validation (§11.1) + regen-idempotency (§11.2) + build + tests
```

> **Rule:** hand-writing category-1-shaped code is a *defect*, not a shortcut.
> If you're typing an entity, repo, `DbContext`, endpoint group, typed client, or
> CRUD page by hand, stop and either express it in the spec or extend a template
> (§4). Inference is reserved for category-3.

---

## 13. Current state → target gap (the v0 engine)

`code-engine/` today is the entity-level v0; this is the backlog to reach the
contract above.

| Area               | v0 today                                  | Target (this doc)                                      |
|--------------------|-------------------------------------------|--------------------------------------------------------|
| Spec unit          | entity-level (`post.entity.json`)         | module-level (`module` + `entities[]` + contracts)     |
| Scopes             | entity only                               | module / entity / platform (`§2`, `§8`)                |
| Service form       | two presets (`simple`/`rich`)             | single canonical form, DDD opt-in (`§1`)               |
| Spec validation    | `throwOnUndefined: false`, lax            | strict; reject on invariant violation (`§11.1`)        |
| Write rule         | skip-unless-`--force` for all files       | per-category: overwrite / seed-once / never (`§8`)     |
| File naming        | flat (`Post.cs`)                          | category-tagged paths (`§9`)                           |
| Frontend           | none                                      | native-per-platform CRUD pages + UI intent (`§5`,`§7`) |
| Typed clients      | none                                      | generated module artifact (`§5`,`§9`)                  |
| Enforcement        | none                                      | spec-reject + regen-idempotency (`§11`)                |

---

## 14. Roadmap (sequenced)

Dependency spine **0 → 1 → 2 → 3**. Phases 0–2 are engine-only (`src/`);
Phase 3 is template work.

- **Phase 0 — Lock the contract** ✅ *done*
- **Phase 1 — Module spec model** ✅ *done* — `module` + `entities[]` + `relations` +
  `publishes`/`consumes` ([`src/spec.js`](src/spec.js) `validateModuleSpec` /
  `normalizeModuleSpec`). Cross-module relations are rejected at load (§3, §11.1
  is real, not aspirational, for module specs). Single-entity specs keep working
  unchanged via the legacy `validateSpec`/`normalizeSpec` path
  (`isModuleSpec()` dispatches between them).
- **Phase 2 — Scope engine** ✅ *done* — [`src/engine.js`](src/engine.js)
  classifies each template path into **module** (renders once), **entity**
  (once per `entities[]`), or **platform** (`platforms/<platform>/`, entity ×
  declared platforms, only for entities with a `ui` block) scope, with the §6/§8
  writing rule: a filename segment of `.Seed.` is category-2 (written once,
  never touched again — not even by `--force`); everything else in a scoped path
  is category-1 (always regenerated, even *without* `--force`). Paths with no
  `module/`, `entity/`, or `platforms/<platform>/` prefix render exactly as
  before (`legacy` scope) — `simple-service` and `rich-domain` are byte-for-byte
  unaffected; see the dedicated test asserting this.
- **Phase 3 — first canonical preset** ✅ *buildable & tested* — the
  [`templates/canonical-module/`](templates/canonical-module) preset now emits a
  **complete, compiling, runnable module** from one spec
  ([`examples/posts.module.json`](examples/posts.module.json)) — four projects,
  zero hand-written `.cs`, building warning-clean under the repo's
  `TreatWarningsAsErrors`:
  - **`{Module}.Contracts`** — integration events (`publishes`) + wire DTOs +
    create requests. References only `EventBus`; no EF/Npgsql, so any consumer
    takes the contract without the backend (§3).
  - **`{Module}.Client`** — the typed `HttpClient`, the one shared frontend
    artifact (§5); references only `{Module}.Contracts`.
  - **`{Module}.API`** — domain aggregate + repo port/adapter + EF config +
    application service (publishing events via `IEventBus`) + versioned minimal-API
    endpoints (domain⇄DTO) + module `DbContext` (schema-per-module) +
    `Add{Module}Module()` + `Program.cs`. Verbose by design: `ILogger`,
    `CancellationToken`, XML docs, OpenAPI metadata, ProblemDetails — the
    ceremony is generated, not typed.
  - **`{Module}.FunctionalTests`** — the **test engine** (see *Test strategy*
    below): HTTP API end-to-end per entity, generated category-1.
  - Host integration is the single hand-wired step (§8): the new
    [`SocialLight.AppHost`](../src/SocialLight.AppHost) binds `postsdb` + the
    broker and references `Posts.API`; the legacy eShop host moved to
    `SocialLight.LegacyEShop`. `simple-service`/`rich-domain` are untouched — they
    remain the v0 reference, not replaced. Still open from §9/§10: MAUI native
    templates, the full `ui:` grammar, per-module EF migrations (today the module
    self-creates its schema via `EnsureCreated` in a `{Module}DbInitializer`),
    event-contract payloads/versioning.

  ### Test strategy — HTTP API end-to-end (generated)
  A functional test suite is redundant boilerplate, so the engine generates it
  (category-1). Per module: a `WebApplicationFactory<Program>` fixture boots the
  real `{Module}.API` in-process against a **real Postgres container** (Aspire
  `AddPostgres`, schema via `EnsureCreated`), and **swaps the broker binding for
  an in-memory `CapturingEventBus`** — which §4 explicitly sanctions ("RabbitMQ,
  Service Bus, in-memory for tests"). The swap is pure dependency inversion done
  in the fixture (remove the RabbitMQ `IEventBus` + its hosted service, add the
  capturing one), so **the module is untouched and the tests need no broker**.
  Each entity gets `create→201`, `get→200 round-trip`, `get-missing→404`,
  `list-contains`, `delete→204`; entities whose module `publishes {Entity}Created`
  additionally **assert the event was published**. This exercises the real
  pipeline (routing, versioning, JSON, EF/Postgres) — the only mock is the
  transport, the one thing the host is supposed to bind.
  - Strict, fail-loud **spec validation** ([`src/spec.js`](src/spec.js) `validateSpec`):
    rejects malformed specs (missing entity/fields, duplicate field names,
    multiple keys, bad `kind`/`events`) before any file renders — the §11.1 gate
    at the spec level.
  - **Regen-idempotency** check ([`src/fixtures.js`](src/fixtures.js),
    `node src/index.js verify`): regenerates every example spec and diffs against
    committed golden trees under `__fixtures__/`. `npm test` runs validation +
    idempotency. This is §11.2.
  - *Deferred:* fail-loud **rendering** (`throwOnUndefined: true`). The current
    templates use else-less inline-ifs (`{{ '?' if f.nullable }}`), which emit
    `undefined` on the false branch and would throw — turning it on requires
    template edits, so it waits for the canonical Phase-3 templates.
- **Phase 1 — Module spec model** *(src only)*: accept `module` + `entities[]` +
  `relations` + `publishes`/`consumes`; normalize each entity; keep single-entity
  specs working. Add the cross-module invariant rejection (§11.1 proper).
- **Phase 2 — Scope engine** *(src only)*: generalize the per-event fan-out into
  named **module / entity / platform** scopes (§8); per-category write rule
  (overwrite / seed-once / never) via a manifest, no template-body edits.
- **Phase 3 — Surface expansion** *(templates)*: single canonical form, typed
  clients, native platform CRUD pages, `ui:` intent.