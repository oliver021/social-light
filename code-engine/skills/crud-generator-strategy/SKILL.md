---
name: crud-generator-strategy
description: Step-by-step procedure for authoring a code-engine spec and generating a CRUD vertical slice or a full canonical module. Use this when writing an entity or module spec JSON, choosing field types, modeling relations/events/owner-binding, validating with --dry-run, or running generate to scaffold Model/Apis/Infrastructure or a 4-project module. Reach for this before hand-typing repetitive per-entity .cs files.
---

# CRUD generation strategy

Procedure for turning a domain entity into generated source with `code-engine`.
Read [code-engine-ground](../code-engine-ground/SKILL.md) first for the command
and preset map; this skill covers the authoring workflow and the spec rules.

## When to use

Use the generator when the work is a **redundant vertical slice** — the
model, EF context, repository, endpoints, DTOs, and integration events that
every entity needs. If only one small bespoke file is required, write it
directly; the generator is for the repetitive surface, not one-offs.

## Step 1 — Choose scope and preset

| Goal | Spec shape | Preset | `--out` target |
|---|---|---|---|
| One CRUD slice inside an existing service | entity spec, `kind: simple` | `simple-service` | the existing service project dir (e.g. `<target>/Posts.API`) |
| One DDD aggregate + create command | entity spec, `kind: rich` | `rich-domain` | the existing domain/API project dir |
| A whole new module (4 projects, tested) | module spec (`entities[]`) | `canonical-module` | the module root (e.g. `<target>/Modules/Posts`) |

The entity presets emit slice files only (no `.csproj`), so point `--out` at a
project that already exists. The `canonical-module` preset emits its own
projects, so point `--out` at the module container directory.

## Step 2 — Write the spec

### Fields

Each field is an object (or a bare string for a `string` field). Options:

| Key | Type | Meaning |
|---|---|---|
| `name` | string | Required. Must be a valid C# identifier. |
| `type` | string | Friendly type name (table below). Defaults to `string`. |
| `key` | bool | Marks the primary key. At most one field per entity. |
| `nullable` | bool | Emits a nullable C# type; excludes the field from required init. |
| `required` | bool | Forces required init. Defaults to true for non-nullable, non-key fields. |
| `fromPrincipal` | bool | Owner field bound from the JWT `sub` claim server-side; dropped from the Create request DTO. |

### Type map

`type` is resolved case-insensitively. Unknown names pass through verbatim, so
domain types (`MediaRef`, an enum, …) work without configuration.

| Friendly | C# | Friendly | C# |
|---|---|---|---|
| `string`, `text` | `string` | `bool`, `boolean` | `bool` |
| `int`, `integer` | `int` | `datetime`, `date`, `timestamp` | `DateTime` |
| `long` | `long` | `datetimeoffset` | `DateTimeOffset` |
| `short` | `short` | `decimal`, `money` | `decimal` |
| `guid`, `uuid` | `Guid` | `double` / `float` | `double` / `float` |
| `byte` | `byte` | `bytes` | `byte[]` |

Project shortcuts configured in [`code-engine.config.js`](../../code-engine.config.js)
extend this map (the bundled config maps `userid` → `Guid`, `url` → `string`,
`media` → `string`). Add project-wide shortcuts there, not in individual specs.

### Relations (module spec only)

Declare relations on the parent entity:

```jsonc
"relations": [{ "to": "Comment", "kind": "oneToMany" }]
```

- `to` **must** name an entity declared in the same module spec — a name outside the spec is rejected (no cross-module foreign keys; use `publishes`/`consumes`).
- `kind` is one of `oneToMany` | `manyToOne` | `oneToOne` | `manyToMany` (defaults to `oneToMany`).
- For a `oneToMany`/`oneToOne` parent, give the child a `<Parent>Id` field (e.g. `Post` → `Comment.PostId`). The generated functional tests use this to seed the parent row before the child, so the Postgres FK constraint holds.

### Events

- Entity spec: `events: ["PostCreated", "PostDeleted"]`.
- Module spec: `publishes` (outbound contracts) and `consumes` (inbound). Events named `<Entity>Created` / `<Entity>Deleted` are wired to that entity's service automatically; the consumed-event handler is emitted as a `.Seed` for you to own.

### Owner binding (`fromPrincipal`)

Mark the field that holds the caller's identity with `"fromPrincipal": true`.
The generator drops it from the Create DTO and binds it from the JWT `sub`
claim in the endpoint, so a client cannot spoof ownership. Use this for
`AuthorId`, `OwnerId`, and similar.

## Step 3 — Validate with a dry run

```powershell
cd code-engine
node src/index.js generate examples/posts.module.json --out <target>/Modules/Posts --dry-run
```

`--dry-run` prints the file plan and runs full validation without writing.
Resolve every reported problem before generating. The validator rejects, all at
once:

- missing `entity`/`module`, missing or empty `fields`/`entities`;
- a field name that is not a valid C# identifier;
- two fields whose PascalCase forms collide;
- more than one `key` field (composite keys are unsupported);
- an unknown `kind` (`simple`/`rich`/`domain`) or relation `kind`;
- a `relations[].to` pointing outside the module;
- a malformed `events`/`publishes`/`consumes` entry.

## Step 4 — Generate

```powershell
# entity slice into an existing service project
node src/index.js generate examples/post.entity.json --out <target>/Posts.API

# full module (4 projects) into the module container
node src/index.js generate examples/posts.module.json --out <target>/Modules/Posts
```

Re-running is safe and idempotent. With `canonical-module`, category-1 files are
always rewritten (do not hand-edit them — edits do not survive); `.Seed.` files
are written once and then left alone. With the legacy presets, existing files
are kept unless you pass `--force`.

## Step 5 — Build, test, and wire the host (module only)

```powershell
dotnet build <target>/Modules/Posts/Posts.API/Posts.API.csproj
dotnet test  <target>/Modules/Posts/Posts.FunctionalTests/Posts.FunctionalTests.csproj   # needs Docker (Postgres)
```

Then register the module with your application host by hand — a `ProjectReference`
to `Posts.API` plus the three lines listed in
[code-engine-ground](../code-engine-ground/SKILL.md#host-integration-the-one-hand-wired-step).

## Worked example — a simple CRUD slice

Input ([`examples/post.entity.json`](../../examples/post.entity.json)):

```json
{
  "entity": "Post",
  "service": "Posts.API",
  "kind": "simple",
  "fields": [
    { "name": "Id", "type": "guid", "key": true },
    { "name": "AuthorId", "type": "guid" },
    { "name": "Content", "type": "string" },
    { "name": "MediaUrl", "type": "url", "nullable": true },
    { "name": "CreatedAt", "type": "datetime" }
  ],
  "events": ["PostCreated", "PostDeleted"]
}
```

Emits `Model/Post.cs`, `Model/PostRequests.cs`, `Infrastructure/PostsContext.cs`,
`Apis/PostsApi.cs`, `Apis/PostsServices.cs`,
`IntegrationEvents/PostIntegrationEventService.cs`, and one
`IntegrationEvents/Events/<Event>IntegrationEvent.cs` per event.

## Worked example — a full module

[`examples/posts.module.json`](../../examples/posts.module.json) defines `Post`
(with `AuthorId` as `fromPrincipal`, a `oneToMany` to `Comment`, and a `ui`
block) and `Comment`, publishing `PostCreated`/`PostDeleted` and consuming
`UserDeleted`. It generates the four `Posts.*` projects plus a list and detail
page for `Post` (the entity that declares `ui`). For the UI portion, see
[ui-controls](../ui-controls/SKILL.md).

## Tips

- Keep the spec the source of truth: change the model in the spec and regenerate, rather than editing category-1 output.
- Put owner/identity fields under `fromPrincipal` so they never enter a request body.
- Run `node src/index.js verify` after editing any template to confirm generation stays idempotent against `__fixtures__/`.
- Module names are conventionally already plural (`Posts`, `Orders`); the generator does not pluralize them again.
