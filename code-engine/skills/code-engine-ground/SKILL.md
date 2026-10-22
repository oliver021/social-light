---
name: code-engine-ground
description: Operational reference for the code-engine generator — its CLI commands (generate, generate-portal, list-presets, verify), the two spec shapes (entity-level and module-level), the four presets, and the three artifact categories with their overwrite rules. Use this whenever running or explaining code-engine, choosing a preset, or determining what files the generator emits, before hand-writing a repetitive vertical slice.
---

# code-engine — ground reference

`code-engine` is a deterministic spec → template generator. It reads a spec JSON
and renders the matching `.cs` (and `.razor`, `.csproj`, `.json`) files from
Nunjucks templates. No inference runs during generation: the same spec always
produces the same output.

This skill is the operational map of the tool as it exists today. For task
workflows, read the focused skills next to it:

- Authoring specs and generating slices/modules → [crud-generator-strategy](../crud-generator-strategy/SKILL.md)
- Generating UI pages and platform templates → [ui-controls](../ui-controls/SKILL.md)
- Canonical design, invariants, rendering algorithm → [DESIGN-STRATEGY.md](../../DESIGN-STRATEGY.md) (authoritative; wins on any conflict)

## Scope of this tool

**The engine is agnostic; the *templates* are the stack.** Nothing in the core is tied to .NET — the spec grammar (entities, fields, relations, events, `ui` intent), the CLI, validation, the module/entity/platform rendering algorithm, and the three artifact categories are all stack-invariant. The stack lives entirely in two pluggable places: the **preset template folders** (`.cs`/`.razor`/`.js`/`.py`/`.cpp`/`.ts`/ or whatever files) and the **`typeMap` in `code-engine.config.js`** (friendly type → language type). 

The scope is generating a vertical slice or module from a spec. It does not matter the stack/framework/language — the engine is agnostic. The stack is expressed in the templates and type map.

## Setup

Run once, from the `code-engine/` directory:

```powershell
cd code-engine
npm install
```

Node ≥ 18 is required. Dependencies are `commander` and `nunjucks` only.

## Commands

Run from `code-engine/`. The entry point is `node src/index.js <command>`.

| Command | Purpose |
|---|---|
| `generate <spec> [-o <dir>] [-p <preset>] [--dry-run] [-f]` | Render one spec. Auto-detects entity vs module spec by the presence of `entities[]`. |
| `generate-portal <specsDir> [-o <dir>] [-p admin-portal] [--dry-run] [-f] [--skip-missing]` | Fan-in (aggregate) generation: render an admin portal from every `*.module.json` in a directory. |
| `list-presets` | List the preset folder names found under `templates/`. |
| `verify [-u]` | Regenerate the example specs and diff against the committed golden trees in `__fixtures__/`. `-u`/`--update` rewrites the fixtures after an intentional template change. |

Flags for `generate`:

| Flag | Effect |
|---|---|
| `-o, --out <dir>` | Directory the generated paths are created under. Defaults to `.`. |
| `-p, --preset <name>` | Override the preset. Defaults to the spec's `preset`, then `kind`, then `simple-service` (entity) / `canonical-module` (module). |
| `--dry-run` | Print the file plan without writing. |
| `-f, --force` | Overwrite existing files (affects legacy presets and category-1 paths only — see writing rules below). |

npm script shortcuts: `npm run generate`, `npm run presets`, `npm run demo`,
`npm run verify`, `npm run fixtures:update`, `npm test` (runs `node --test`,
which includes strict-validation tests plus `verify`).

Output markers in the console plan: `+` written, `=` skipped (exists, kept),
`·` planned (dry run).

## Spec shapes

The generator accepts two shapes and detects which by inspecting the JSON.
A spec with an `entities[]` array is a **module spec**; otherwise it is an
**entity spec**. Both are strictly validated before any file renders; a
malformed spec is rejected with every problem listed at once.

### Entity spec (v0, single slice)

```jsonc
{
  "entity": "Post",            // required, PascalCase
  "kind": "simple",            // "simple" (CRUD) | "rich"/"domain" (DDD). default simple
  "module": "Posts",           // optional, defaults to entity
  "service": "Posts.API",      // optional, defaults to "<module>.API"
  "namespace": "...",          // optional, defaults to "<RootNamespace>.<service>"
  "context": "PostsContext",   // optional DbContext name
  "preset": "simple-service",  // optional, overrides the kind→preset map
  "fields": [                  // required, non-empty
    { "name": "Id", "type": "guid", "key": true },
    { "name": "Content", "type": "string" },
    { "name": "MediaUrl", "type": "url", "nullable": true }
  ],
  "events": ["PostCreated", "PostDeleted"]   // optional
}
```

### Module spec (canonical, full module)

```jsonc
{
  "module": "Posts",            // required, PascalCase
  "schema": "posts",            // optional Postgres schema, defaults to snake_case(module)
  "routePrefix": "/api",        // optional, defaults to "/api/<kebab-module>"
  "entities": [                 // required, non-empty
    {
      "name": "Post",
      "fields": [
        { "name": "Id", "type": "guid", "key": true },
        { "name": "Title", "type": "string" },
        { "name": "AuthorId", "type": "guid", "fromPrincipal": true }
      ],
      "relations": [{ "to": "Comment", "kind": "oneToMany" }],  // "to" must be in THIS spec
      "ui": { "list": { "primary": "Title" } }                 // entities without "ui" get no page
    },
    { "name": "Comment", "fields": [ { "name": "Id", "type": "guid", "key": true }, { "name": "Text", "type": "string" } ] }
  ],
  "publishes": ["PostCreated", "PostDeleted"],  // outbound event contracts
  "consumes": ["UserDeleted"],                  // inbound (documented; handler emitted as a seed)
  "realtime": { "messageEntity": "Message", "groupField": "ChatId", "senderField": "SenderId" }  // optional SignalR hub
}
```

A `relations[].to` that names an entity outside the spec is **rejected at
validation time** — the format cannot express a cross-module foreign key.
Cross-module data flows through `publishes`/`consumes` instead. See
[DESIGN-STRATEGY.md](../../DESIGN-STRATEGY.md) §3.

Field `type` is a friendly name mapped to a C# type; unknown types pass through
verbatim. The full type table and field options (`key`, `nullable`,
`fromPrincipal`, …) are documented in
[crud-generator-strategy](../crud-generator-strategy/SKILL.md).

## Presets and what they emit

| Preset | Style | Spec scope | Emits |
|---|---|---|---|
| `simple-service` | CRUD | entity | `Model/`, `Apis/`, `Infrastructure/`, `IntegrationEvents/` slice files (no csproj) |
| `rich-domain` | DDD aggregate | entity | `AggregatesModel/<Entity>Aggregate/`, `Application/Commands/` |
| `canonical-module` | DESIGN-STRATEGY §9 | module + entity + platform | a complete 4-project module (Contracts, Client, API, FunctionalTests) + web pages |
| `admin-portal` | aggregate (fan-in) | many module specs | a Blazor admin portal whose nav/grids reference every module's typed client |

`canonical-module` lays out four projects under `--out`:

- `<Module>.Contracts/` — DTOs and integration-event records (depends only on `EventBus`; no EF).
- `<Module>.Client/` — typed `HttpClient` (`<Module>Client`); depends only on `.Contracts`.
- `<Module>.API/` — Program, endpoints, EF `DbContext`, repositories, services, per-entity domain.
- `<Module>.FunctionalTests/` — HTTP end-to-end tests (need Docker for Postgres).
- `App.Web/Pages/` — one list page + one detail page per entity that declares `ui` (see [ui-controls](../ui-controls/SKILL.md)).

## Artifact categories and writing rules

The generator classifies every output by how it may be edited afterward
(DESIGN-STRATEGY.md §6, §8):

1. **Generated and immutable (category 1)** — regenerated from the spec, never hand-edited.
2. **Seed (category 2)** — generated once, then owned by hand; never regenerated.
3. **Manual on generated rails (category 3)** — never generated (feeds, profiles, onboarding).

How the writing rule maps onto the presets:

- **Legacy presets** (`simple-service`, `rich-domain`): every file is skipped if it already exists unless `--force` is passed.
- **`canonical-module` scoped paths** (anything rooted at `module/`, `entity/`, or `platforms/<platform>/`):
  - A filename segment of `.Seed.` marks **category 2** — written once, then left alone **even with `--force`**.
  - Everything else is **category 1** — always regenerated **even without `--force`**. Hand edits to these files do not survive the next `generate` run by design.

## Host integration (the one hand-wired step)

The generator does not touch your application host. After generating a
`canonical-module`, register the generated `<Module>.API` project with the host
by hand. With the bundled .NET/Aspire template family that is a
`<ProjectReference>` to `<Module>.API` plus three lines in the AppHost —
`AddDatabase("<module>db")`, `AddProject<...>(...)`, and `.WithReference(...)` to
the database and broker. This is the only step done by hand around a generated
module.

## Extending the engine

- **New output file:** drop a `.njk` into a preset folder. Filenames use `__token__` placeholders (`__Entity__`, `__EntityPlural__`, `__contextName__`, `__module__`, `__event__`); a path containing `__event__` renders once per event.
- **New preset:** add a folder under `templates/`; its name becomes the preset.
- **Custom types / filters:** edit [`code-engine.config.js`](../../code-engine.config.js) (`typeMap` and `filters` merge over the built-in defaults).
- **Template context:** every normalized spec key plus derived tokens (`Entity`, `EntityPlural`, `keyField`, `fields[].csType`, `createdEvent`, …) — defined in [`src/spec.js`](../../src/spec.js).

After any template change, run `node src/index.js verify` to confirm the example
specs still regenerate byte-for-byte; run `verify --update` to accept an
intentional change and commit the updated `__fixtures__/`.
