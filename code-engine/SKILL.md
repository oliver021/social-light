---
name: code-engine
description: Scaffold a socialLight service's vertical slice (entity, EF context, minimal API, integration events, or DDD aggregate + commands) from a small entity spec JSON. Use this INSTEAD of hand-writing the repetitive eShop-style files for a new entity, so the boilerplate is consistent and not re-derived by inference each time.
---

# code-engine

A spec-driven generator. You describe an entity once as JSON; the tool renders
the matching set of `.cs` files from Nunjucks templates. Prefer this over
generating the same boilerplate by hand — it keeps the eShop-style slice
consistent and frees you to focus on the parts that are actually novel.

> **Design contract:** this skill is the *operational how-to* for the tool as it
> exists today. The authoritative design — the canonical module form, the
> module-level spec grammar, the isolation invariants, the three artifact
> categories, and the writing rules — lives in
> [`DESIGN-STRATEGY.md`](DESIGN-STRATEGY.md). Read it before extending the
> engine; where it and this doc differ, **DESIGN-STRATEGY.md wins**.
>
> **Current state vs target:** the tool now supports **both** shapes. The
> original **entity-level** spec (`simple-service`, `rich-domain` — §"Entity
> spec schema" below) is the v0 reference and is unchanged. The **module-level**
> spec (`module` + `entities[]` + `relations` + `publishes`/`consumes` — §"Module
> spec schema" below) renders across module/entity/platform scopes into the
> `canonical-module` preset, which now emits a **complete, compiling, tested
> module** — four projects (`{Module}.Contracts`, `{Module}.Client`,
> `{Module}.API`, `{Module}.FunctionalTests`) that build warning-clean and pass
> HTTP end-to-end tests. Pass either shape to `generate`; it's auto-detected by
> the presence of `entities[]`.

## When to use

- Adding a new entity/service slice to socialLight (a Posts, Profile, Social
  feature, etc.).
- You're about to write the usual `Model/`, `Apis/`, `Infrastructure/`,
  `IntegrationEvents/` (or DDD `AggregatesModel/` + `Commands/`) files.

If only one small bespoke file is needed, just write it. Use code-engine when
the *redundant slice* is what you'd otherwise type out.

## One-time setup

```powershell
cd code-engine
npm install
```

## Usage

```powershell
# from code-engine/
node src/index.js generate <spec.json> --out <target-dir> [--preset <name>] [--dry-run] [--force]

# preview without writing
node src/index.js generate examples/post.entity.json --out ../src --dry-run

# generate a full module (4 projects) into src/Modules/<Module>/
node src/index.js generate examples/posts.module.json --out ../src/Modules/Posts --force

# list available presets
node src/index.js list-presets

# regen-idempotency check: regenerate the example specs and diff against the
# committed golden trees in __fixtures__/ (the "spec is the source" guarantee)
node src/index.js verify
node src/index.js verify --update   # rewrite fixtures after an intentional change
npm test                            # strict-validation tests + verify
```

Specs are now **strictly validated** before anything renders: a malformed spec
(missing `entity`/`fields`, duplicate field names, more than one `key`, unknown
`kind`, malformed `events`) is rejected with all problems listed at once, rather
than silently producing broken output.

`--out` is where files land; the generated relative paths
(`Model/Post.cs`, `Apis/PostsApi.cs`, …) are created underneath it. Existing
files are skipped unless `--force` is passed. The preset defaults from the
spec's `preset` or `kind` field, so usually you don't pass `--preset`.

## Entity spec schema

```jsonc
{
  "entity": "Post",            // required. PascalCase entity name
  "kind": "simple",            // "simple" (CRUD, model: Catalog) | "rich" (DDD, model: Ordering)
  "module": "Posts",           // optional. defaults to entity. drives namespaces
  "service": "Posts.API",      // optional. defaults to "<module>.API"
  "namespace": "...",          // optional. defaults to "socialLight.<service>"
  "context": "PostsContext",   // optional. DbContext name. defaults to "<module>Context"
  "preset": "simple-service",  // optional. overrides the kind->preset mapping
  "fields": [                  // required, non-empty
    { "name": "Id", "type": "guid", "key": true },
    { "name": "Content", "type": "string" },
    { "name": "MediaUrl", "type": "url", "nullable": true }
  ],
  "events": ["PostCreated", "PostDeleted"]   // optional integration/domain events
}
```

Field `type` is a friendly name mapped to a C# type (`guid`→`Guid`,
`datetime`→`DateTime`, `string`→`string`, …). Unknown types pass through
verbatim, so domain types work too. Add project-wide type shortcuts and custom
template filters in [`code-engine.config.js`](code-engine.config.js).

## Module spec schema (canonical-module preset)

```jsonc
{
  "module": "Posts",            // required. PascalCase module name
  "schema": "posts",            // optional. Postgres schema. defaults to snake_case(module)
  "routePrefix": "/api",        // optional. defaults to "/api/<kebab-module>"
  "entities": [                 // required, non-empty
    {
      "name": "Post",
      "fields": [ { "name": "Id", "type": "guid", "key": true }, { "name": "Title", "type": "string" } ],
      "relations": [ { "to": "Comment", "kind": "oneToMany" } ],  // "to" MUST be an entity in this same spec
      "ui": { "list": { "primary": "Title", "secondary": "Body" } }  // entities without "ui" get no CRUD page
    },
    { "name": "Comment", "fields": [ { "name": "Id", "type": "guid", "key": true }, { "name": "Text", "type": "string" } ] }
  ],
  "publishes": ["PostCreated", "PostDeleted"],  // outbound integration-event contracts
  "consumes": ["UserDeleted"]                   // inbound (documented only; no consumer is generated yet)
}
```

A `relations[].to` pointing at an entity outside this spec is **rejected at
validation time** — see [`DESIGN-STRATEGY.md`](DESIGN-STRATEGY.md) §3, §11.

## Presets and what they emit

| preset             | model           | scope(s)             | files generated |
|--------------------|-----------------|-----------------------|-----------------|
| `simple-service`   | Catalog (v0)    | entity-level spec only | `Model/<Entity>.cs`, `Model/<Entity>Requests.cs`, `Infrastructure/<Context>.cs`, `Apis/<Plural>Api.cs`, `Apis/<Plural>Services.cs`, `IntegrationEvents/<Entity>IntegrationEventService.cs`, `IntegrationEvents/Events/<Event>IntegrationEvent.cs` (one per event) |
| `rich-domain`       | Ordering (v0)   | entity-level spec only | `AggregatesModel/<Entity>Aggregate/<Entity>.cs`, `.../I<Entity>Repository.cs`, `Application/Commands/Create<Entity>Command.cs` + handler |
| `canonical-module`  | DESIGN-STRATEGY.md §9 | module / entity / platform | a complete 4-project module — see "What `canonical-module` emits" below |

### What `canonical-module` emits (full module)

Generate into `../src/Modules/<Module>` — the preset lays out four projects:

- **`<Module>.Contracts/`** *(module + entity scope)* — `<Module>.Contracts.csproj`,
  `IntegrationEvents/<Event>.cs` (per `publishes`), `Dtos/<Entity>Dto.cs`,
  `Dtos/Create<Entity>Request.cs`. Only depends on `EventBus` (no EF) so consumers
  take the contract without the backend.
- **`<Module>.Client/`** *(module scope)* — `<Module>.Client.csproj`,
  `<Module>Client.cs` (typed `HttpClient`). Depends only on `<Module>.Contracts`.
- **`<Module>.API/`** — *module scope:* `<Module>.API.csproj`, `Program.cs`,
  `GlobalUsings.cs`, `appsettings.json`, `<Module>ModuleExtensions.cs`,
  `Api/<Module>Api.cs`, `Infrastructure/<Context>.cs`,
  `Infrastructure/<Module>DbInitializer.cs`; *entity scope:* `Domain/<Entity>.cs`,
  `Domain/I<Entity>Repository.cs`, `Application/<Entity>Service.cs`,
  `Infrastructure/Ef<Entity>Repository.cs`, `Infrastructure/<Entity>Configuration.cs`,
  `Api/<Entity>Endpoints.cs`.
- **`<Module>.FunctionalTests/`** — *module scope:* csproj, `GlobalUsings.cs`,
  `<Module>ApiFixture.cs`, `CapturingEventBus.cs`; *entity scope:*
  `<Entity>ApiTests.cs` (HTTP end-to-end).
- **`App.Web/Pages/`** *(platform scope, web, only entities with `ui`)* —
  `<Entity>ListPage.razor` (category 1), `<Entity>DetailPage.Seed.razor`
  (category 2). Inert until wired into a web host.

**Host integration (the one hand-wired step, §8):** add a `<ProjectReference>` to
`<Module>.API` in the AppHost and three lines — `postgres.AddDatabase("<module>db")`,
`builder.AddProject<Projects.<Module>_API>(...)` with `.WithReference(...)` to the
db + broker. See [`src/SocialLight.AppHost`](../src/SocialLight.AppHost).

**Build & test the generated module:**

```powershell
# from repo root
dotnet build src/Modules/<Module>/<Module>.API/<Module>.API.csproj
dotnet test  src/Modules/<Module>/<Module>.FunctionalTests/<Module>.FunctionalTests.csproj  # needs Docker (Postgres)
```

### Writing rule for `canonical-module` (DESIGN-STRATEGY.md §6, §8)

- A template path rooted at `module/`, `entity/`, or `platforms/<platform>/`
  opts into scoped rendering; everything else renders exactly once (legacy
  behavior, unaffected — that's all of `simple-service`/`rich-domain`).
- Within a scoped path, a filename segment of `.Seed.` marks **category 2**:
  written once, then left alone forever — **even with `--force`**.
- Everything else in a scoped path is **category 1**: always regenerated,
  **even without `--force`**. Hand edits to these files do not survive the next
  `generate` run by design — see §2.

## Extending (this is the experimental, flexible part)

- **New output file:** drop a `.njk` into a preset folder. Filenames use
  `__token__` placeholders (`__Entity__`, `__EntityPlural__`, `__contextName__`,
  `__event__`); a path containing `__event__` is rendered once per event.
- **New preset:** add a folder under `templates/`. Its name becomes the preset.
- **Template context:** every key from the normalized spec plus `Entity`,
  `entity`, `EntityPlural`, `entityPluralKebab`, `fields[].csType`, `keyField`,
  `createdEvent`, etc. (see [`src/spec.js`](src/spec.js)).
- **Custom types / filters:** edit [`code-engine.config.js`](code-engine.config.js).

Generated code follows the conventions in the repo's [`CLAUDE.md`](../CLAUDE.md)
and the design in [`DESIGN-STRATEGY.md`](DESIGN-STRATEGY.md). Per the three
artifact categories defined there: *immutable* generated files are regenerated
and never hand-edited; *seed* files (`.Seed.` in the name) are yours to own after
first generation; *manual* code is hand-built on the generated rails. The
`canonical-module` preset implements that split (always-overwrite category 1 /
write-once category 2); the legacy `simple-service`/`rich-domain` presets keep
the v0 skip-unless-`--force` behavior.
