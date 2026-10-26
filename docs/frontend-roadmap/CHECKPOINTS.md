# Human checkpoints

Results of the checkpoints in [TESTING-AND-REVIEW.md §5](TESTING-AND-REVIEW.md#5-human-checkpoints).

## Checkpoint 1 — after M0.4 (2026-10-25)

**Stack:** local Docker Compose demo stack (`sociallight-demo`), web image rebuilt from
`feat/frontend-roadmap` at `e1d0bc9`, then again with the two fixes below. Signed in as the
local demo account. Driven with the built-in browser plus a DOM audit script (horizontal
overflow, images without `alt`, unnamed buttons, touch targets, element positions).

| Check | 390 px | 768 px | 1280 px | Result |
|---|---|---|---|---|
| No horizontal page scroll (all 5 tabs) | ✓ | ✓ | ✓ | Pass |
| Images without `alt` | 0 | 0 | 0 | Pass (A-1 fixed) |
| Buttons without an accessible name | 0 | 0 | 0 | Pass |
| U-3: sidebar overlapping the main column at 768 | — | rail 16–256, main 272–746 | — | Pass (fixed) |
| U-1: chat window under the top bar on phones | controls at y=64, header ends at 57, 44×44 | — | — | Pass (fixed) |
| `wide` layout (Marketplace, Reels) hides the right rail | — | — | ✓ | Pass |
| Same card radius / padding / title style across tabs | ✓ | ✓ | ✓ | Pass |
| Light theme, and toggling light ↔ dark | ✓ | — | ✓ | Pass (no stale colours after toggling) |
| Follow buttons named per person (A-2) | "Follow UX Bob", … | | | Pass |

**Found and fixed during the checkpoint** (commit after `e1d0bc9`):
1. *Flash of the light theme on reload in dark mode.* The `.dark` class was set in a
   `useEffect` after the first render. `index.html` now applies the saved theme before the
   first paint, with the same default as `useUiPreferences` (dark).
2. *Handles broken mid-word in the 240 px rail at 768 px* ("@ux_bob_0 / 2").
   `UserLine`'s handle/meta line now truncates with an ellipsis.

**Accepted / carried forward (not blocking):**
- Author-name buttons in post headers and comments are 18–24 px tall (inline text links;
  meets WCAG 2.5.8's 24 px only for some). Revisit with M2, which makes every name open a
  profile.
- Marketplace category chips are 32 px tall on phones (below 44 px). Fold into M7.
- Seeded data shows odd handles (`@me`) and posts saying "Just now": data, not code.
- Still open from the M0.3/M0.4 reviews: `RelativeTime` not used in post headers (needs
  the ISO date on `Post`), `AsyncButton` unhandled rejection, `UserLine`'s hard-coded
  "Chat with …" tooltip (M2), event creation swallowing a failed POST (M5).

**Verdict:** approved. Resume the workflow with `{ "from": "M1" }`.

## Checkpoint 2 — after M4 (2026-10-25)

**Stack:** local Docker Compose demo stack, web image rebuilt from `feat/frontend-roadmap`
at `b4595e6` (previous image kept as `sociallight/web:checkpoint1`). Smoke specs run with
the system Chrome: `SL_WEB_URL=http://localhost:3000 PW_CHANNEL=chrome npx playwright test -c playwright.web.config.ts`.
Every spec registers fresh `smoke-*@example.test` accounts.

| Spec (L6) | Milestone | Result |
|---|---|---|
| `auth.smoke` — register, reload stays signed in | M0.1 | Pass |
| `ownership.smoke` — delete my post from its menu, gone after reload | M1 | Pass |
| `conversations.smoke` — comment, reply, like the reply, reply still nested after reload | M3 | Pass (the backend accepts nested `parentCommentId`, which the M3 review had flagged as unverified) |
| `profiles.smoke` — B opens A from People, sees A's post, follows | M2 | Pass |
| `friends.smoke` — two accounts: request, accept, both see "Friends"; A blocks B, B's post leaves A's feed | M4 | Pass after two test fixes (below) |

**Two-account risk probe (M4 review):** does a blocked author's post flash in the feed
before the block list loads? A temporary spec watched the DOM from the first paint
across 3 reloads: the post never appeared (0 mutations). Not reproducible on the local
stack; it can still race on a slow network because `loadRelationships` is not awaited
before the feed, so keep it as a follow-up.

**Fixed during the checkpoint (tests and tooling only, no app code):**
1. `friends.smoke`: A registered before B, so A's People list was loaded without B, and
   the widget shows 5 people until "See all". The spec now reloads and expands the list.
2. `friends.smoke`: the Home nav item is named "Home, N unread notifications" when there
   are alerts (correct accessibility), so the locator matches the prefix. Timeout raised
   to 120 s for the two-account flow.
3. `playwright.web.config.ts`: `PW_CHANNEL=chrome` runs on the system Chrome, so no
   browser download is needed.

**Carried forward (not blocking):**
- Pluralisation: "1 unread notifications", "1 friends".
- `createPost`: a network error on one image upload shows "Your post was not published"
  although the post exists (M3 review). Fix with M5, which reuses `createPostRaw`.
- A reply sent in a thread with more than 2 replies lands under "View more replies".
- Failed reads of blocks/friends/preferences keep the previous state silently.
- Repeated test-account names pile up in the People widget (data from smoke runs).

**Verdict:** approved. Resume the workflow with `{ "from": "M5" }`.
