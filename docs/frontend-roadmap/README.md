# Frontend roadmap: use what the backend already offers

Target app: `src/main_fronted` (React 19 + MUI 9 + Tailwind 4, Express BFF proxy in `server.ts`).
Source of the gap list: the frontend-vs-backend analysis of 2026-10-24 (the backend exposes
32 resources across the routed generated modules; the web touches 18).

This folder is written to be executed **one milestone at a time by Haiku agents** through
the workflow in [`frontend-roadmap.workflow.js`](frontend-roadmap.workflow.js).
Every milestone has a blueprint in [`blueprints/`](blueprints) that is self-contained: an
agent that reads only `README.md` (this file, for the ground rules), its blueprint and
[`TESTING-AND-REVIEW.md`](TESTING-AND-REVIEW.md) must be able to finish the milestone.

## Milestones

| # | Milestone | Blueprint | Depends on | Size |
|---|---|---|---|---|
| **M0.1** | Test harness and baseline (Vitest + Testing Library) | [M0.1](blueprints/M0.1-test-harness.md) | none | S |
| **M0.2** | Design tokens and a single MUI theme | [M0.2](blueprints/M0.2-tokens-theme.md) | M0.1 | M |
| **M0.3** | UI primitives and the layout shell | [M0.3](blueprints/M0.3-primitives-layout.md) | M0.2 | M |
| **M0.4** | Visual quality pass over every tab | [M0.4](blueprints/M0.4-visual-pass.md) | M0.3 | M |
| **M1** | Content ownership: delete and dismiss | [M1](blueprints/M1-content-ownership.md) | M0.3 | S |
| **M2** | Other people's profiles | [M2](blueprints/M2-profiles.md) | M0.3 | M |
| **M3** | Richer posting and conversations | [M3](blueprints/M3-rich-posting.md) | M1 | M |
| **M4** | Social graph: friends, blocks, mutes | [M4](blueprints/M4-social-graph.md) | M2 | M |
| **M5** | Stories, groups and events, completed | [M5](blueprints/M5-stories-groups-events.md) | M1 | M |
| **M6** | Messenger, completed | [M6](blueprints/M6-messenger.md) | M0.3 | M |
| **M7** | Marketplace: full catalog and semantic search | [M7](blueprints/M7-marketplace.md) | M0.3 | S |
| **M8** | Organizations | [M8](blueprints/M8-organizations.md) | M2 | M |
| **B** | Backend track (not for the Haiku workflow) | [B](blueprints/B-backend-track.md) | none | L |

M0.x is the pre-step the user asked for: tokens, layout, components and visual quality
come **before** any feature, so every feature milestone builds on the same primitives
instead of adding a seventh way to draw a card.

The workflow runs them in the order of the table, strictly one after another (each
milestone sees the previous one's committed result). Track B is backend work through
`code-engine` and the gateway; it is listed so the dependencies are visible, and is done
by a human or a stronger model, not by this workflow.

## What is deliberately out of scope

- **Checkout / payment** (Basket writes, order creation): intentionally undone, see
  CLAUDE.md "Scope: payment/checkout". Do not touch `buyMarketItem` beyond what M7 says.
- **Editing** posts, comments, messages: the generated modules have no `PUT`/`PATCH`
  (track B, item B2). No milestone may fake editing with delete + recreate.
- **"Seen by" for stories and view counts for reels**: `story-views` and `reel-views` are
  read-scoped to the viewer (`readScope: viewerId`), so an author cannot read them. Needs
  track B (B5) first.
- **Post visibility** (public / followers / only me): stored but not enforced by Feed.API.
  A client-only filter would be fake privacy, so the selector waits for B4.
- **Group join approval, assigning roles to others**: `GroupMember.userId` is bound from the
  JWT, so nobody can add another person. Display only.
- Modules not routed by the gateway (Moderation, Recommendation, Threads, Pages, Jobs,
  Gaming): need track B (B1) and a regenerated SDK first.

## Ground rules (every milestone, every agent)

1. **Scope of files.** Change only `src/main_fronted/**` and, for tests, the files the
   blueprint names. Never edit `clients/typescript/generated/**` (generated, category 1),
   anything under `src/Modules`, `src/app-specs`, `code-engine`, or `deploy`.
2. **Git.** The implementer never runs `git commit`, `push`, `stash`, `reset`, `checkout`
   or `clean`. The workflow commits once per approved milestone on the branch
   `feat/frontend-roadmap`.
3. **Dependencies.** No new npm dependencies, except the exact dev dependencies M0.1 lists.
   Use what is installed: MUI, lucide-react, motion, react-dropzone, openapi-fetch.
4. **Typed clients only.** Every backend call goes through the clients in
   `src/api/gateway.ts` (`postsApi`, `chatApi`, …). Never hand-write a `fetch` to `/bff/api`
   (the only existing exception is `uploadMedia`, which needs XHR progress).
5. **Owner fields.** Fields marked "bound from the JWT" in a blueprint are overwritten by
   the server; still send the current user id (the request type requires it), never
   another user's id.
6. **Honest UI.** Nothing pretends. Show success only after a 2xx, show the server's
   message on failure (`describeApiError` / `messageOf` + `showToast`), hide a control
   rather than show one that does nothing.
7. **Style.** Use the tokens and primitives from M0.2/M0.3 (`components/ui/*`). After M0.2
   no new hex colours, no `violet-*`/`fuchsia-*` classes and no ad-hoc radii in
   components. English UI copy, sentence case, plain social-network words.
8. **Accessibility.** Every new control has an accessible name (`aria-label` that names
   the target, e.g. "Delete post by Ana"), touch targets ≥ 44 px, images have `alt`.
9. **Gates.** Before reporting done, run the gates in
   [TESTING-AND-REVIEW.md §2](TESTING-AND-REVIEW.md#2-the-gates-every-milestone) and paste the
   tail of each output in the report. A milestone with a red gate is not done.
10. **Report.** End with: files changed (one line each, with why), tests added, gate
    results, and anything you could not do and why. Do not claim what you did not run.

## How to run it

The workflow script is [`frontend-roadmap.workflow.js`](frontend-roadmap.workflow.js) (kept
here, not in `.claude/`, because `.claude/` is git-ignored in this repo). From a Claude Code
session in this repo, ask to run the workflow with
`scriptPath: docs/frontend-roadmap/frontend-roadmap.workflow.js`. Arguments (all optional):

```json
{ "from": "M2", "only": ["M2", "M3"], "maxFixRounds": 2, "stopAtCheckpoints": true }
```

- `from`: skip the milestones before this id (resume after a stop or a checkpoint).
- `only`: run just these ids, in table order.
- `maxFixRounds`: review → fix cycles per milestone before the workflow stops (default 2).
- `stopAtCheckpoints`: pause after M0.4, M4 and M8 for the human checkpoints of
  [TESTING-AND-REVIEW.md §5](TESTING-AND-REVIEW.md#5-human-checkpoints) (default `true`).

Per milestone the workflow runs: implement (Haiku) → gates re-run by a separate Haiku
agent → review (Sonnet) → fix (Haiku) if rejected → commit on `feat/frontend-roadmap`.
The setup step creates the branch, commits this folder, and runs `npm ci` in the repo root
and in `src/main_fronted`.

The workflow stops at the first milestone that is still rejected after the fix rounds, so
a broken milestone never becomes the base of the next one. Its changes stay uncommitted
for inspection.
