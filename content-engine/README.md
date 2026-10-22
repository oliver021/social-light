# content-engine — synthetic-content host (dev only)

A separate .NET CLI host that populates socialLight with **synthetic content**
for development. It is *not* part of any production path and never ships; it
talks to the social network **only through the public API** (the same surface a
real client uses), so it respects module isolation.

It mirrors the project thesis (see [`../CLAUDE.md`](../CLAUDE.md) §0): the
**redundant structure is deterministic code**, and **inference is reserved for
the genuinely novel part** — here, the actual human-sounding text.

## Two modes

- **Seed mode (implemented).** Author a corpus of synthetic activity and replay
  it against the API. Three commands over a durable local **run**:
  1. `seed create` — LLM authoring → run artifacts (head + content/traces). Fully
     **resumable**: stop it and re-run the same command to continue.
  2. `seed push` — pure replay of the run → the social API (+ token sidecar &
     manifest, both kept local).
  3. `seed commit` — publish the run's head/content/traces to a Hugging Face
     dataset on request. Secrets never leave the machine.
- **Living mode (deferred).** A long-running agent that observes integration
  events and reacts as a participant (incl. 1:1 chat). Group chat is excluded
  for the LLM. Real-time SignalR is a prerequisite and not yet built.

## The run (durable local scope)

A *run* lives under `.runs/<runId>/` (gitignored — it holds secrets) and is split
into typed artifacts so generation can stop/resume across terminal sessions and
only publishable assets ever leave the machine:

| File | What | Leaves machine? |
|------|------|-----------------|
| `head.json` | run manifest: personas (+ LLM backstory) and the batch index | ✔ publishable |
| `content.NNN.json` | the normalized operation graph, sharded into batches | ✔ publishable |
| `traces.NNN.json` | raw LLM transcripts, aligned 1:1 to each batch's slots | ✔ publishable |
| `progress.jsonl` | append-only generation ledger (the **resume** key) | ✖ local only |
| `tokens.json` | `ref -> bearer token` sidecar from `push` | ✖ **secret** |
| `manifest.json` | `ref -> backend id` from `push` | ✖ local only |

At capacity the content/traces batches are the GB-scale corpus you push to a
registry; today we generate as little as a scenario needs. Resume is per-**slot**
(one bio, post, comment, or DM turn): a kill loses at most the in-flight slot.

## The normalization idea (how "LLM intent" becomes JSON)

The operation **graph** — which actors exist, who posts, who comments on what,
conversation turns, refs, ordering, timing — is built **deterministically from
the RNG seed** by [`SeedAuthor`](src/Generation/SeedAuthor.cs). The LLM only
fills **leaf text** (bios, post bodies, comments, DM lines). A completion is
therefore just a string dropped into a known slot — there is no fragile
"parse JSON out of the model" step, and a committed seed is schema-valid by
construction.

Operations are normalized to **API-intent** using **symbolic refs** (`@alice`,
`@p1`) instead of runtime ids. `push` resolves refs to the ids the backend
assigns and writes them to a **manifest** (`ref -> id`), which is how E2E tests
assert against handles/content, and how living mode will later know which
entities are its own.

Coherence is preserved by generating related slots as **sequential units** in a
single context — a persona's bio builds on its backstory, and a post's comments
are authored alongside the post body (never a detached cross pass). That is also
the anti-hallucination discipline.

## Usage

```powershell
# 1) author a run — needs only the llama.cpp server (OpenAI-compatible, :8080)
dotnet run --project content-engine -- `
  seed create content-engine/scenarios/tech-friends.plan.json `
  --run tech-friends --endpoint http://localhost:8080 --model gemma --concurrency 4
#   ^ stop any time; re-run the same line to resume. --fresh restarts from scratch.

# 2) replay against a running social API (writes tokens + manifest into the run)
dotnet run --project content-engine -- `
  seed push tech-friends --api http://localhost:5000 --identity http://localhost:5001

# 3) publish head/content/traces to a Hugging Face dataset (omit --repo for a dry run)
dotnet run --project content-engine -- `
  seed commit tech-friends --repo your-org/sociallight-seed
```

Runs default to `./.runs` (override with `--runs`). `seed create` needs **only**
the llama.cpp server, not a running backend — so it is runnable today. `seed
push` needs the social API + Identity (Phase 0). `seed commit` needs the Hugging
Face CLI (`pip install -U huggingface_hub`, `hf auth login`).

## Status / next

- **v0 (here):** CLI (`create`/`push`/`commit`); deterministic op-graph author;
  llama.cpp inference; resumable bounded-concurrency runner with a durable
  per-slot ledger; sequential units for coherence; validator; replay + token
  sidecar + manifest; Hugging Face publish.
- **Per-module from code-engine (next):** today [`OpCatalog`](src/Validation/Validation.cs)
  and the `push` binding switch in [`SeedPusher`](src/Push/SeedPusher.cs) are
  hand-written. The target is to **generate** the op `data` DTOs + JSON Schema +
  push bindings + typed clients per module from `src/app-specs/*.json`, so the
  seed grammar can never drift from the API. New code-engine template scope.
- **Living mode:** deferred to last.
