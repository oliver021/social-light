# Testing and review strategy

How every milestone of the [frontend roadmap](README.md) is proven and reviewed. The
principle: **an implementer's report is a claim, not evidence.** Each milestone passes
through gates that a separate agent re-runs, and a reviewer that did not write the code.

## 1. Test layers

| Layer | Tool | Runs where | Who writes it | Blocks the milestone? |
|---|---|---|---|---|
| L1 Type check | `npx tsc --noEmit` | workflow, every milestone | n/a | yes (0 errors; baseline is 0) |
| L2 Build | `npx vite build` | workflow, every milestone | n/a | yes |
| L3 Unit: hooks | Vitest + `renderHook` + `mockApi` | workflow, every milestone | implementer | yes |
| L4 Unit: components | Vitest + Testing Library + user-event | workflow, every milestone | implementer | yes |
| L5 Static rules | `npm run check:rules` (grep script from M0.1) | workflow, every milestone | M0.1 | yes |
| L6 Live smoke | Playwright, `e2e-web/` | human checkpoints, needs the stack | implementer (written), human (run) | at checkpoints only |
| L7 Visual matrix | browser screenshots | human checkpoints | n/a | at checkpoints only |

### L3: hooks (the most important layer)

The domain hooks (`context/useFeed.ts`, `useChat.ts`, …) take explicit `Deps` and return
functions, so they are testable without the whole `AppProvider`.

- Use the `mockApi` helper from `src/test/mockApi.ts` (M0.1). It stubs `globalThis.fetch`,
  routes by `METHOD /bff/api/...` path, records every call, and returns JSON or a status.
- For every backend call a milestone adds, write at least:
  1. **Contract test:** the right method + path, and the body has the fields the blueprint
     lists (e.g. `parentCommentId` is the parent's id, not `null`).
  2. **Success test:** state after a 2xx is what the UI should show.
  3. **Failure test:** on a 4xx/5xx the state rolls back (or never changes) and
     `showToast` is called with a non-empty message. This guards ground rule 6.
- Optimistic updates must have a rollback test.

### L4: components

- Render the component with the `renderWithProviders` helper (M0.1), which wraps a test
  `ThemeProvider` and a stub app context built from `makeAppContext(overrides)`.
- Query by role and accessible name (`getByRole('button', { name: /delete post/i })`),
  never by class names. This doubles as an accessibility check.
- Owner-only controls: one test that the control **is** shown to the owner and one that it
  is **not** shown to someone else.
- Destructive actions: the confirm dialog appears, Cancel does nothing, Confirm calls the
  hook.

### L5: static rules (`scripts/check-rules.mjs`, added in M0.1)

Fails with a list of `file:line` when, inside `src/main_fronted/src` (excluding `test/`,
`index.css` and `components/ui/theme.ts`):

- a hex colour literal appears (`#rgb`, `#rrggbb`) — enabled from M0.2 on;
- a `violet-` or `fuchsia-` Tailwind class appears — enabled from M0.2 on;
- a raw `fetch(` or `XMLHttpRequest` outside `api/gateway.ts` and `api/auth.ts`;
- `addNotification(` is called with a hard-coded person name;
- `console.log(` is left in non-test code.

Each rule has an id; a milestone turns a rule on by adding its id to `ENABLED_RULES` in
the script, never by deleting the rule. M0.1 enables the fetch, notification and
console rules; M0.2 enables the colour rules once it has removed every violation.

### L6: live smoke

`e2e-web/` with its own `playwright.web.config.ts` at the repo root (uses the root
`@playwright/test`), base URL `process.env.SL_WEB_URL ?? 'http://localhost:3000'`.
Every spec starts with `test.skip(!process.env.SL_WEB_URL, 'needs the running stack')`, so
the workflow can type-check them without a stack. Each feature milestone adds one spec
for its happy path (blueprints name it). Accounts: register a fresh
`smoke-<milestone>-<n>@example.test` user in the spec itself; never hard-code a password
other than the one generated in the spec.

Run: `SL_WEB_URL=http://localhost:3000 npx playwright test -c playwright.web.config.ts`.

### L7: visual matrix (checkpoints)

Widths 390, 768, 1280 × light and dark × tabs Home, Groups, Market, Reels, Profile, plus
the open Messenger and one dialog. Check: no horizontal scroll, nothing under the top
bar, same card radius/padding/title size across tabs, focus ring visible, contrast of
muted text, empty states and skeletons appear.

## 2. The gates (every milestone)

Run from `src/main_fronted/`:

```bash
npx tsc --noEmit
npx vite build
npx vitest run
npm run check:rules
```

And from the repo root, the scope check (must print nothing):

```bash
git status --porcelain | grep -vE '^.. (src/main_fronted/|e2e-web/|playwright\.web\.config\.ts|docs/frontend-roadmap/)'
```

Before M0.1 lands only the first two exist; M0.1's own gates are the four above once it
has added them.

## 3. Review loop per milestone (what the workflow does)

```
implement (Haiku) ──► gates (Haiku, independent re-run) ──► review (Sonnet) ──┐
       ▲                                                                   │
       └──────────── fix (Haiku), with the blocking list ◄── rejected ──────┘
                                         approved ──► commit "feat(web): <id> <title>"
```

1. **Implement.** A Haiku agent gets the ground rules, the blueprint and this file.
2. **Gates.** A *different* Haiku agent runs §2 and returns the raw pass/fail per gate.
   It does not edit code. If any gate fails, the review is skipped and the failure output
   goes straight to a fix round.
3. **Review.** A Sonnet agent reads `git diff` (staged + unstaged + untracked) against the
   last milestone commit and checks the rubric in §4. It returns
   `{ approved, blocking[], nonBlocking[] }`. It must cite `file:line` for every blocking
   item and must not edit code.
4. **Fix.** A Haiku agent gets only the blocking items (and failed-gate output), fixes
   them, and re-runs the gates itself. Then back to step 2.
5. **Stop rule.** After `maxFixRounds` (default 2) rejected rounds, the workflow stops and
   reports. The next milestone never starts on a rejected base.
6. **Commit.** On approval the workflow commits only the milestone's files on
   `feat/frontend-roadmap`. Non-blocking notes go into the final report, not into code.

Why a stronger reviewer: Haiku is fast and good at following a precise blueprint, and
weaker at noticing what the blueprint did not say (a swallowed error, a control shown to
the wrong user). The review is where a stronger model costs the least for the most
catch. To run the review on Haiku too, change `REVIEW_MODEL` in the workflow script.

## 4. Review rubric

Blocking (any one rejects the milestone):

- **R1 Acceptance:** an acceptance criterion in the blueprint is not met or not tested.
- **R2 Honesty:** success shown before a 2xx, an error swallowed, a control that does
  nothing, or a client-side imitation of a missing backend feature.
- **R3 Ownership/safety:** an owner-only control shown to non-owners; another user's id
  sent in a field the blueprint marks "bound from the JWT"; data of the previous account
  kept after logout (every new persisted state must be cleared in the hook's `reset`).
- **R4 Contract:** a backend call not through the typed clients, wrong path/verb/body, or
  an endpoint the blueprint did not list.
- **R5 Design system:** after M0.2, a new hex colour, `violet-`/`fuchsia-` class, ad-hoc
  radius/shadow, or a re-implemented primitive that already exists in `components/ui`.
- **R6 Tests:** a new backend call without its contract + failure test; a new
  owner-only/destructive control without its component test; a test that asserts nothing
  (no `expect`) or mocks the hook it is meant to test.
- **R7 Scope:** files changed outside the allowed paths, or new npm dependencies.
- **R8 Regressions:** an existing feature removed or broken, an existing test deleted or
  weakened to pass.

Non-blocking (recorded, not fixed in the loop): naming, small duplication, copy tone,
possible follow-ups.

## 5. Human checkpoints

The workflow cannot see the running UI. These checkpoints are for a person (or a Claude
session with the built-in browser) against the Docker stack in `deploy/`:

| After | Check |
|---|---|
| M0.4 | Full L7 visual matrix; approve the look before features build on it. |
| M4 | L6 smoke for M1–M4; two accounts: friend request, block hides content. |
| M8 | All L6 smoke specs; final L7 pass; then `/code-review high` on the whole branch. |
| M11 | Phase 2: `community` and `organizations` smoke (image post in a community, owner removes a post and a member, org post linked from Home); L7 at 390/1280 on both detail pages; `/code-review high` on M9–M11. |

Results of each checkpoint go into `docs/frontend-roadmap/CHECKPOINTS.md` (date, stack
build, pass/fail per item, screenshots path).

## 6. Definition of done (whole roadmap)

- Every milestone committed with green gates and an approved review.
- The three checkpoints recorded as passed.
- `KNOWN-ISSUES.md` updated: items fixed by the roadmap marked **Status: Fixed**.
- The analysis gap list re-run: every gap is either closed or listed under "out of
  scope" in the README with its track B item.
