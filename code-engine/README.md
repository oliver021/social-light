# Code Engine Generator

A deterministic spec → template generator for socialLight. It reads a spec JSON
and renders the matching `.cs` / `.razor` / `.csproj` files from Nunjucks
templates — no inference during generation, so the same spec always produces the
same output.

## Curated skills

The operating knowledge for this tool is split into three skills under
[`skills/`](skills), each in standard Anthropic skill format:

| Skill | Use it for |
|---|---|
| [code-engine-ground](skills/code-engine-ground/SKILL.md) | The operational map: CLI commands (`generate`, `generate-portal`, `list-presets`, `verify`), the two spec shapes, the four presets, and the artifact categories with their overwrite rules. |
| [crud-generator-strategy](skills/crud-generator-strategy/SKILL.md) | Step-by-step authoring of a spec and generating a CRUD slice or a full 4-project module: field types, relations, events, owner-binding, validation, build/test/host-wiring. |
| [ui-controls](skills/ui-controls/SKILL.md) | Generating UI from the `ui:` intent block: the platform scope, generated list page vs seed detail page, wiring into a web host, and adding a new platform template. |

## Design and quickstart

- [DESIGN-STRATEGY.md](DESIGN-STRATEGY.md) — the authoritative design: the canonical module form, spec grammar, isolation invariants, rendering algorithm, and writing rules. It wins on any conflict.
- [SKILL.md](SKILL.md) — the original single-file operational doc (kept for the `code-engine` skill entry referenced from the repo `CLAUDE.md`).

## Quickstart

```powershell
cd code-engine
npm install
node src/index.js list-presets
node src/index.js generate examples/posts.module.json --out ../src/Modules/Posts --dry-run
```
