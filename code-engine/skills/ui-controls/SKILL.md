---
name: ui-controls
description: Guidelines for generating UI from a code-engine module spec — the per-entity `ui:` intent block, the platform scope (web Razor today; MAUI native as the documented target), and the generated list page (category 1, regenerated) vs seed detail page (category 2, owned after first write). Use this when adding `ui` to a spec, generating CRUD pages, wiring generated pages into a web host, or extending code-engine with a new platform template.
---

# UI controls

How `code-engine` turns a spec into UI. The model: a spec records **neutral UI
intent** per entity; each **platform template** renders that intent in its
native language (DESIGN-STRATEGY.md §5, §7). One intent, multiple renders —
the UI mirror of ports and adapters. Read
[code-engine-ground](../code-engine-ground/SKILL.md) and
[crud-generator-strategy](../crud-generator-strategy/SKILL.md) first; UI is the
platform scope of the `canonical-module` preset.

## Current capability

- **Generated only by the `canonical-module` preset** (module spec). The entity presets emit no UI.
- **Web (Blazor/Razor) is the only wired platform today.** `config.platforms` defaults to `['web']` ([`code-engine.config.js`](../../code-engine.config.js)). MAUI native is the documented target, not yet templated.
- **Only entities that declare a `ui` block get pages.** An entity without `ui` is skipped in the platform scope.
- Generated pages consume the typed `<Module>Client` and `<Entity>Dto` from the generated `.Client`/`.Contracts` projects — the same contract a hand-built feed uses.

## The `ui:` intent block

Declare `ui` on an entity in the module spec:

```jsonc
{
  "name": "Post",
  "fields": [
    { "name": "Id", "type": "guid", "key": true },
    { "name": "Title", "type": "string" },
    { "name": "Body", "type": "string", "nullable": true }
  ],
  "ui": {
    "list":   { "primary": "Title", "secondary": "Body" },
    "detail": { "sections": ["Title", "Body"] }
  }
}
```

| Key | Consumed by | Effect |
|---|---|---|
| `ui.list.primary` | web list page (category 1) | Field name rendered as each row's primary label. Falls back to the key field when omitted. |
| `ui.list.secondary` | neutral intent | Recorded on the spec and available to templates; the current web list template does not render it. Extension point for richer/other-platform templates. |
| `ui.detail.sections` | neutral intent | Recorded on the spec; the current web detail seed renders all fields. Extension point. |

Field names in `ui` must match `fields[].name` on the same entity.

## What gets generated (web)

Per entity with `ui`, into `App.Web/Pages/` under `--out`:

| File | Category | Lifecycle | Content |
|---|---|---|---|
| `<Entity>ListPage.razor` | 1 (immutable) | Regenerated every run, even without `--force`. Do not hand-edit. | `@page "/<entities-kebab>"`; lists items via `Client.Get<EntityPlural>Async()`, labeled by `ui.list.primary`. |
| `<Entity>DetailPage.Seed.razor` | 2 (seed) | Written once, then yours to own — never regenerated, even with `--force`. | `@page "/<entities-kebab>/{Id}"`; loads one item via `Client.Get<Entity>Async(Id)`. Put layout, composition, and product decisions here. |

This split is deliberate: the list page is a direct projection of the spec, so
it is regenerated; the detail page is where unique presentation lives, so it is
handed off after first generation (DESIGN-STRATEGY.md §6).

The boundary stops at CRUD pages. Feeds, profiles, and onboarding are
**category 3** — never generated. They are hand-built against the same typed
client the generated pages use; the generator lays the rails, not the screen.

## Step-by-step: generate UI for a module

1. **Add `ui` to each entity that needs a page.** Set at least `ui.list.primary`. Omit `ui` on entities that should have no page (e.g. a child `Comment`).

2. **Dry-run** to confirm the page plan:
   ```powershell
   cd code-engine
   node src/index.js generate <spec>.module.json --out <target>/Modules/<Module> --dry-run
   ```
   Expect a `App.Web/Pages/<Entity>ListPage.razor` and `<Entity>DetailPage.Seed.razor` for each entity with `ui`.

3. **Generate:**
   ```powershell
   node src/index.js generate <spec>.module.json --out <target>/Modules/<Module>
   ```

4. **Inspect the pages.** The `.razor` files reference `<Module>Client` and `<Entity>Dto`. They are inert scaffolding until added to a web host project — generating them does not build or render anything on its own.

5. **Wire into a web host (manual).** Add the generated `App.Web/Pages/*.razor` to a Blazor host, register `<Module>Client` for DI, and add routes/nav. The detail seed is yours to extend; the list page stays generated.

6. **Own the detail page.** Edit `<Entity>DetailPage.Seed.razor` freely — subsequent `generate` runs leave it untouched. Do not edit the list page; change the spec's `ui` and regenerate instead.

## Extending to a new platform (e.g. MAUI native)

The platform scope renders the Cartesian product of `entities-with-ui × platforms`
(DESIGN-STRATEGY.md §8). To add a platform:

1. Create `templates/canonical-module/platforms/<platform>/` mirroring the `web/` folder (use the same `__Entity__…` filename tokens). Mark seed files with a `.Seed.` segment so they are written once.
2. Render the same `ui` intent in that platform's native language — e.g. MAUI native as `CollectionView` + XAML + an MVVM ViewModel.
3. Add the platform to `platforms` in [`code-engine.config.js`](../../code-engine.config.js) (`platforms: ['web', 'maui']`).
4. Regenerate; each entity with `ui` now produces a page per platform.

Templates may read the full entity context (`Entity`, `EntityPlural`,
`entityPluralKebab`, `fields`, `keyField`, `keyType`, and the `ui` block) — see
[`src/spec.js`](../../src/spec.js) for the available tokens.

## Reference

- Neutral-intent and native-per-platform rationale: [DESIGN-STRATEGY.md](../../DESIGN-STRATEGY.md) §5–§8.
- Current web templates: [`templates/canonical-module/platforms/web/App.Web/Pages/`](../../templates/canonical-module/platforms/web/App.Web/Pages).
- Example spec with `ui`: [`examples/posts.module.json`](../../examples/posts.module.json).
