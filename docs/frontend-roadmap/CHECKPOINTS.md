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
