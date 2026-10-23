# socialLight: known issues from a QA walkthrough

## Intro

**What was tested.** The product use cases of the socialLight demo, exercised against the local Docker Compose stack built from the demo images. Web: http://localhost:3000. API: the same origin under `/bff` (the gateway is reached through that proxy). Gateway on http://localhost:8088 returns 404 on `/`, as expected. Run date: 2026-10-22, roughly 21:50 to 22:25 UTC.

**Method.**
- Automated: `curl` against the `/bff` API (registration, token, CRUD probes, read-only cross-account comparisons, header and timing checks). Small JS snippets run inside the page to inject test files, read localStorage and audit the DOM.
- Manual-style: the built-in browser was driven through the UI (clicks, typing, screenshots, network and console reads). File inputs were filled from the page because the browser tool has no file chooser.
- Source reading: used only to explain observed behaviour. Nothing was changed. No git commands were run. `deploy/` and `src/` were read, never written.

**Test data.** Three test accounts on the local stack: `qa-a@example.com` (Alice), `qa-b@example.com` (Bob), `qa-c@example.com` (Carol). They created posts (text, image, video), a story, a reel, a group, an event, follows, comments, reactions and chat messages. Nothing was cleaned up. Passwords are not recorded here.

**Caveats that affect reading the results.**
- Two or three accounts were used in one browser profile, so localStorage is shared between them. Some observations (cross-account cache, live chat delivery) are confounded by this and are marked as such.
- The served web bundle is older than the repo source in at least one file (see T-1). Behaviour below is what the demo image does. Where the source differs, that is noted.

> **Status note (added after the walkthrough).** F-4 and T-1 describe the *local* test stack, whose web image was older than the repo. The public demo (social.th3light.us) was rebuilt from the current source and now shows the password-policy and login error messages. Everything else below was confirmed against the same backend code that the public demo runs. S-1 (two different users receive byte-identical notification, follow, message and chat lists) and the profile `PUT` 500 on an empty display name were independently re-checked with curl.

## Update log

- Authorization (S-1, S-2, S-3) fixed in the generated modules via `readScope` / `fromPrincipal` (commit `b43b727`).
- A UX pass fixed the client-side items marked **Status: Fixed** below. Entries without a status line were not re-tested after that pass.

## Summary

| # | Use case | Status | Key evidence |
|---|---|---|---|
| 1 | Auth: register, login, logout, session, duplicates | Partial | Login OK (200), wrong password 400. Reload keeps session. Duplicate email shows "Login failed (400)". Weak-password text not shown (served build). |
| 2 | Profile: edit, avatar, persistence | Partial | Avatar upload works (200, persisted). Profile PUT returned 500 three times while the UI reported success. Bio existed only in localStorage. |
| 3 | Social graph: follow, unfollow, counts, suggestions | Works | Follow POST 201, unfollow DELETE 204. Following/followers counts updated. Suggestions come from the Profile API. |
| 4 | Posts and feed: text, image, video, scoping, ordering | Partial | Text, image and video posts saved (201). Feed showed only followed users' posts (empty before follow, populated after). No edit or delete. No timestamps, so no time-based order. |
| 5 | Engagement: react, comment, counts, notifications | Works | Reaction and comment saved once, counts shown. Author got comment and follow notifications. Reactions do not notify. |
| 6 | Stories: create with image, view | Works | Image story created (24 h expiry). Viewer shows image and caption. Follower (Alice) sees the story bubble. |
| 7 | Reels: upload, play, limits | Partial | 3 s WebM uploaded, plays, listed after reload. The 90 s and 25 MB limits are client-side only. Oversize UI path not completed. |
| 8 | Groups and Events | Partial | Group join works (API 201, UI shows "Subscribed"). No UI to create a group. Event create and RSVP work via API. Event UI form not driven. |
| 9 | Chat: DM, history, real-time | Partial | DM from Nodes to Join persists and live delivery seen in an open tab. Chat from a post author goes to a fake user id. First message of a new DM silently dropped. History API is global. |
| 10 | Marketplace: catalog, listing draft, checkout | Works | 101 catalog items with images. Listing saves as local draft (intended). Checkout disabled (intended). |
| 11 | Search | Partial | Matches posts, groups and local market items. Does not match people. |
| 12 | Responsive: 390x844 and 768x1024 | Partial | No horizontal overflow on the feed at either size. At 390 a chat window covers the screen and its close control sits under the top bar. At 768 the profile sidebar overlaps the composer. |
| 13 | Accessibility spot-check | Partial | Auth tab order logical; header and composer buttons labelled. 8 visible images lack alt. Helper text low contrast (estimated). |
| 14 | Robustness: API errors shown or swallowed | Partial | Several failures are swallowed (profile PUT, hub send). Error strings are generic. Oversize upload not completed. |
| 15 | Security hygiene (read-only observations) | Broken | Any logged-in user can read other users' notifications, follows, friend rows, chat participants and chat messages. |

Totals: **Works 4, Partial 10, Broken 1, Not testable 0** (Not testable items are listed under each category instead of as separate use cases).

What worked well: registration validation on the server, session persistence, follow graph, post and media storage, story and reel media serving, catalog browsing, group membership, 401 responses on protected endpoints, live chat delivery when both sides have the chat open.

---

## 1. Functional bugs

### F-1. Profile save shows success when the server rejected it; typed handle is not what gets saved
**Severity: High**

> **Status: Fixed in the web client: success is shown only after a 2xx, server errors are shown, the typed handle is sent. A duplicate handle still returns 500 from the server (see F-2), now shown as a readable error.**

- **Observed.** In "Customize Profile", changing the name, handle and bio and pressing Update Config closes the dialog, shows the new values and adds a notification "Config dispatcher: successfully synchronized your user profile". The browser's `PUT /bff/api/profiles/me` returned 500 three times in a row. The server kept the previous values. After reload, the sidebar showed the server name and handle plus a bio that existed only in localStorage (the server bio was null).
- **How to reproduce.** Sign in as `qa-a`. My profile, Customize Profile, change Unique Handle to `qa_alice_02` and the bio, Update Config. Then `GET /bff/api/profiles/me` with that user's token: handle and bio are unchanged. Reload the page: the bio still shows.
- **Cause.** Verified from source: `context/useProfile.ts` updates state before awaiting the PUT and ignores non-2xx responses. `components/ProfileTab.tsx` (`handleProfileUpdate`) adds the success notification unconditionally. `api/mappers.ts` (`userToUpdateRequest`) sends `username` in preference to the handle typed in the dialog. The 500 class was reproduced with curl (F-2). The exact body the browser sent was not captured, so the link from the dialog's handle to the 500 is inferred.
- **Workaround.** Check the network log before trusting the UI. Avoid changing the handle. Reload after saving to see what the server kept.

### F-2. Server returns 500 for conflicts and validation errors, and saves malformed input
**Severity: Medium**

- **Observed** (curl, `PUT /bff/api/profiles/me`, test account): handle `me` (already used by a seeded profile) returns 500. Empty `displayName` returns 500. `avatarUrl: "not a url"` returns 200 and is saved. Handle `bad handle!` (with spaces and `!`) returns 200 and is saved.
- **Cause.** Unverified. Server logs were not read. The 500s look like unhandled unique-constraint and validation exceptions. Duplicate email on registration does return a proper 409.
- **Workaround.** Validate handle and name in the client. Do not rely on the server for format checks.

### F-3. Duplicate registration shows a misleading error
**Severity: Medium**

- **Observed.** Sign up with an existing email (`qa-a@example.com`) and a different password: the error shown is "Login failed (400)". The "account already exists" message is never shown. With the same password, the user is silently signed in to the existing account.
- **How to reproduce.** Sign up tab, enter an existing email, any valid password, Create Account.
- **Cause.** Verified from source: `api/auth.ts` treats HTTP 409 from registration as success, then calls `login` with the new password.
- **Workaround.** Use Sign in for existing accounts.

### F-4. Weak-password messages are not shown (the served build is stale)
**Severity: Medium**

- **Observed.** Sign up with password `abc`: UI shows "Registration failed (400)". The server response contains per-rule messages (PasswordTooShort, PasswordRequiresUpper, PasswordRequiresDigit, PasswordRequiresNonAlphanumeric).
- **Cause.** Verified: the repo source (`src/main_fronted/src/api/auth.ts`) parses `body.errors` and shows the messages. The served bundle (`/assets/index-DenlwABQ.js`) only throws with the status code. See T-1.
- **Workaround.** Rebuild the web image (T-1). Until then, read the 400 response body in devtools.

### F-5. Feed has no timestamps and no defined order
**Severity: Medium**

- **Observed.** Every post shows "Just now". The feed response has `publishedAt: null` and no creation time. Three posts by one author all have the same `score` (0.0204...). In one test the UI showed them oldest first (the order they were created), which is the reverse of a usual feed. With identical scores, no part of the contract defines the order.
- **How to reproduce.** Create two or three posts. Compare the order and the `score` values in `GET /bff/api/feed/home`.
- **Cause.** Verified from API responses. The feed contract has no creation timestamp.
- **Workaround.** None in the UI.

### F-6. Search does not find people
**Severity: Low**

> **Status: Fixed in the client: the header search matches people by name and handle.**

- **Observed.** Search "Bob" shows "No people, posts or products match 'Bob'", although QA Bob appears in Nodes to Join. Search "Carol" shows only three posts, no person.
- **Cause.** Verified from source: `components/Navbar.tsx` matches groups, local market items and posts. People are not searched, despite the placeholder "Search people, posts and products".
- **Workaround.** Use the Nodes to Join list.

---

## 2. Incomplete / intentional scope

### I-1. Checkout and payment are not built (INTENTIONAL)
Marketplace cards show a disabled "Checkout unavailable in this demo" control. CLAUDE.md section 0 records that payment is intentionally unbuilt. Not a bug.

### I-2. Marketplace listings are local drafts (INTENTIONAL)
"List an Item" saves to localStorage (`nexus_market_items`) and shows "Local draft, not in catalog". The README and CLAUDE.md describe this. Not a bug.

### I-3. Post edit and delete do not exist (not declared as intentional)
**Severity: Low.** Post cards offer React, Comment and Share only. Source shows no edit or delete path in `context/useFeed.ts`.

### I-4. Groups cannot be created in the UI (not declared as intentional)
**Severity: Medium.** Communities shows whatever groups exist in the database, and the database starts empty. Group creation is reachable only through the API (`POST /bff/api/groups` returned 201 with `CreateGroupRequest`). Joining works: the UI shows "Subscribed" after the API join, and the group shows "1 nodes".

> **Status: Fixed in the client: a 'Create community' dialog exists (not exercised in a browser; treat as untested).**

### I-5. Reactions do not notify the post author
**Severity: Low.** Source calls `notify` only for follows and comments (`context/useFeed.ts`, `context/useSocial.ts`). After Alice reacted with "Wow", Carol's notifications contained only the follow and the comment.

### I-6. Event creation UI not exercised (Not testable)
Event create (`POST /bff/api/events` returned 201) and RSVP (`POST /bff/api/event-attendances` returned 201) work through the API. The UI form in the Upcoming Events widget was not driven.

### I-7. Visibility, blocks and group privacy not exercised (Not testable)
No private or friends-only posts were created, and no blocks or private groups were set up. Visibility rules are therefore untested.

---

## 3. Real-time and messaging

### RT-1. Chat opened from a post author's avatar goes to a user id that does not exist
**Severity: High**

> **Status: Fixed: chat from a post author uses the author's real user id and adds both participants.**

- **Observed.** As Alice, click Carol's avatar on her post, then send "QA hello". The message shows in the chat window and is saved, but in a chat whose only participant is Alice. Carol is not a member, so she never receives it. The network log shows the peer participant creation (`POST /bff/api/chat-participants`) returning 400.
- **How to reproduce.** Sign in as Alice. Click the author avatar on one of Carol's posts. Send a message. `GET /bff/api/chat-participants` shows one row for that chat.
- **Cause.** Verified from source: `components/PostCard.tsx` (around lines 95 to 104, and 417 to 445) builds the peer id from the display name (`user-<name>`) or from mock ids (`sarah-1`, `elena-1`, `dave-1`, `linus-1`). The real `userId` is not used. The browser's localStorage holds an active chat with `userId: "user-qa-carol"`.
- **Workaround.** Start chats from Nodes to Join, which uses the real user id.

### RT-2. The first message in a new DM is dropped without any error
**Severity: Medium**

> **Status: Fixed in the client: chat, both participants and the message are created in order; errors are shown. Still open: the recipient's open page does not join the new chat's hub group until reload (RT-3, needs a hub change).**

- **Observed.** Start a new DM from Nodes to Join, type a message and press Enter immediately. The input clears, the message never appears and is not stored. No error is shown. A second message in the same chat is stored and shown.
- **Cause.** Unverified. Source suggests a race: `context/useChat.ts` `sendMessage` returns early when the chat id is not yet mapped, and hub errors are swallowed with `.catch(() => {})`.
- **Workaround.** Wait until the chat is open and visible before sending, and check that the message appears.

### RT-3. A recipient whose page loaded before the chat existed does not see the new chat until reload
**Severity: Medium** (confounded by the shared browser profile)

- **Observed.** Carol's tab, loaded before the DM existed, showed no thread for it. The thread appeared after reload.
- **Cause.** Suspected from source: `loadChats` joins hub groups only at login, and nothing joins the other participant to a newly created chat (`context/useChat.ts`). Not confirmed with separate browser profiles.
- **Workaround.** Reload the recipient's page after a new DM starts.

### RT-4. Live delivery works when both clients already have the chat open (observed, positive)
Alice sent "live msg three from Alice". It appeared in Carol's already-open tab within about three seconds, without reload, and it is stored on the server. Caveat: both tabs shared localStorage, so this is not a clean two-browser test.

### RT-5. Chat history API returns messages from chats the caller is not in
**Severity: High.** See S-2 (security). Listed here because it is a messaging defect as well.

---

## 4. Media

**Worked (observed):** image post (`POST /bff/api/posts` 201, then `POST /bff/api/post-medias` 201); video post (WebM, 94 KB); reel (WebM, 107 KB, stored with duration 3 s, plays before reload and appears in the list after reload); story with image; avatar upload (`POST /bff/api/v1/media` 200, then profile `avatarUrl` set). Media is served from `/bff/blobs/` with the right content types (`image/png`, `video/webm`).

### M-1. Reel duration limit (90 s) is enforced only in the browser
**Severity: Low** (source-verified, not exercised at runtime). `components/ReelsTab.tsx` sets `MAX_REEL_SECONDS = 90`. The server's `Reel` domain (`Reels.API/Domain/Reel.cs`) and `CreateReelRequest` take any duration without a check.

### M-2. Oversized-upload error path not completed (Not testable)
A 26 MB file was injected into the reel dialog. The dialog closed before the result could be read, so the error text was not observed. The client-side rules (25 MB video, 10 MB image, MP4/WebM/JPEG/PNG/WebP/GIF) exist in `api/gateway.ts` (`uploadMedia`) but were not exercised.

### M-3. Media files are readable without a token
**Severity: Medium.** `GET http://localhost:3000/bff/blobs/<sha256>.png` returns 200 with no Authorization header. Names are content hashes, so guessing is hard, but any link leaks the file. Visibility of media attached to private posts was not tested because no private posts exist.

---

## 5. Data and persistence

### D-1. Profile fields fall back to the previous account's cached values
**Severity: High** (shared devices; the UI shows values the server does not hold)

> **Status: Fixed: server values win over cache, a server null clears the field.**

- **Observed.** Account Alice had a bio and handle saved in the browser. Logging out and registering `qa-c@example.com` ("QA Carol") in the same browser: the sidebar showed the handle "@bad handle!" and Alice's bio. Carol's server profile had no handle and no bio.
- **How to reproduce.** In one browser, sign in as one account, set a bio, log out, register a second account. The second account shows the first account's bio.
- **Cause.** Verified from source: `api/mappers.ts` `profileToUser` uses `bio: p.bio ?? prev.bio` and `username: p.handle ?? prev.username`. The `prev` state is the localStorage copy (`nexus_user`, via `usePersistentState`), so a null on the server never clears a stale value.
- **Workaround.** Use a separate browser profile or private window per account.

### D-2. Logout keeps per-user data in localStorage
**Severity: Medium** (privacy on shared devices). After logout, `nexus_user`, `nexus_chat_messages`, `nexus_active_chats`, `nexus_notifications`, `nexus_groups` and `nexus_market_items` remain. Only `nexus_posts` and `nexus_authenticated` are removed (`context/useAuth.ts` logout). Verified by reading localStorage after logout. Another account in the same browser saw the previous account's chat windows.

> **Status: Fixed: logout clears all per-user `nexus_*` state (dark-mode preference is kept).**
- **Workaround.** Clear site data for the origin after logout.

### D-3. The previous user's posts appear briefly before the new user's feed loads
**Severity: Low.** On first load in Alice's tab, Carol's cached posts were visible before the feed request returned. Source: the feed reads `nexus_posts` on mount (`context/useFeed.ts`).

### D-4. Hard-coded profile content is presented as data
**Severity: Medium.**
- `components/ProfileTab.tsx` shows "42 Nodes Published" as a constant (line 153). Carol had 3 posts and Alice had 0; the number never changes.
- "Developer node aligned" (line 102) is a constant tagline shown under every user's handle.
- The "Grid Interests Focus" box with "Lookup new technology interest..." is present. Whether interests persist was not tested.
- A user with no handle is shown as "@me", a placeholder from `INITIAL_USER` in `data.ts`.

### D-5. Hard-coded identities in code paths
**Severity: Low.** Source only: `context/useNotifications.ts` maps the actor names "Sarah Kim", "Elena Rostova" and "Dave Morrison" to fixed avatars. `context/useChat.ts` (`messageDtoToChat`) maps the current user's messages to the sender id `current-user-1`. `components/PostCard.tsx` special-cases the handle `@oliverdev` (3 occurrences). Not all of these paths were exercised live.

### D-6. Seeded test debris in the demo database
**Severity: Low.** The first things a reviewer sees in Stories and Reels: a story with media URL `ddd` (renders as a broken image), the reels "Phase 4 test reel" and "Noise test, 10 seconds", and comments and messages "ddddd", "dddd" and "jj" by the seeded demo user. Profiles "Alice Demo" (handle `me`) and "Bob Demo" are seeded.

### D-7. Avatar preview shows an eShop sample image
**Severity: Low.** The Customize Profile dialog showed an "eShop reference application" diagram as the avatar for an account whose server avatar was null. The cached local avatar pointed at that image. Its origin was not traced.

---

## 6. UX and responsive

### U-1. At 390 px a restored chat window covers the screen and its close control is under the top bar
**Severity: Medium.** At 390x844, a chat window restored from localStorage fills the viewport. Its title and close control sit under the 56 px sticky top bar. The Close button measured at x=333, y=0 (the other at 0,0 with zero size). The bottom tab bar is hidden while the window is open, so Store and other tabs cannot be reached until the window is closed.

> **Status: Fixed: restored chats start minimised on phones and the close control is reachable.**
- **How to reproduce.** Open a chat on a desktop-size window, then resize to 390x844 and reload. Try to close the chat.

### U-2. At 390 px chat windows overlap the composer and feed
**Severity: Low.** Restored chat windows sit over the composer and the first posts.

### U-3. At 768 px the profile sidebar overlaps the stories bar and composer and clips its text
**Severity: Medium.** A zoomed capture shows the sidebar card over the stories row and the composer, with "Alice Edited" cut off. Horizontal scroll was not present (scroll width equal to viewport) at 390 px or 768 px on the feed.

> **Status: Fixed: MUI and Tailwind breakpoints are aligned; the tablet layout no longer overlaps.**

### U-4. Error messages are generic
**Severity: Medium.** A wrong password shows "Login failed (400)", the same generic text used for other login failures. Registration failures show "Registration failed (400)". Neither says which field is wrong or why.

### U-5. Enter does not submit a comment
**Severity: Low.** In "Join node thread...", pressing Enter does nothing. The Post comment button works.

> **Status: Fixed: Enter submits a comment.**

### U-6. Positive
The 390 px feed shows the bottom navigation (Home, Groups, Store, Reels, Profile) with no horizontal overflow. The 768 px feed has no horizontal overflow.

---

## 7. Accessibility

Spot-check only. Not a full WCAG audit.

### A-1. Eight visible images have no alt attribute
**Severity: Medium.** A DOM audit on the feed found 61 visible `<img>` elements, 8 of them without an `alt` attribute. Avatars and post media need alt text, decorative images need `alt=""`.

### A-2. Helper text has low contrast (estimated)
**Severity: Medium.** "Sign in to your account." and "Create an account to get started." use `oklch(0.705 0.015 286)` on a white card. By OKLCH lightness the ratio is roughly 2.6:1, below the 4.5:1 needed for 14 px text. This is an estimate from the colour value, not a measurement. The DOM contrast audit was not reliable for translucent chip backgrounds, so no other contrast failures are claimed.

### A-3. Repeated "Connect" buttons
**Severity: Low.** The people list has about 30 buttons with the same accessible name, "Connect", with no person name in the label. Screen-reader users cannot tell them apart.

### A-4. Wordmark looks faint (unexplained)
**Severity: Low.** The "socialLight" wordmark on the sign-in card looks very faint in screenshots, while its computed colour is black. The cause was not determined.

### A-5. Positive
Sign-in tab order is email, password, Sign In, Sign up, matching the visual order. Header and composer icon buttons have labels (Open search, Switch to dark mode, Open messenger, Notifications, Account panel, Attach image, Attach video, Add poll, Attach link).

### A-6. Not tested
Screen-reader behaviour, focus handling in chat windows, keyboard use of the composer and feed, and colour contrast beyond the helper text.

---

## 8. Security and hardening

Observed from outside, read-only, with test accounts. Nothing was brute-forced or fuzzed.

### S-1. Other users' notifications, follows, friend rows and chat participants are readable by any logged-in user
**Severity: High.** Verified with two tokens (`qa-a`, `qa-b`):

> **Status: fixed for notifications, chats, chat participants, messages, chat mutes/blocks/requests, friends, blocks and preferences** (`readScope` in the module specs; commit `b43b727`). Verified with three accounts: a notification addressed to B is visible to B only (A, the actor, and C get nothing; `GET /{id}` returns 404 for C). **Intentionally still readable by any signed-in user:** the follow graph (follower counts need it). **Not yet scoped:** message attachments, reactions, read receipts and pins (they reference a message, not a chat).
- `GET /bff/api/notifications`, `/api/follows`, `/api/friends` and `/api/chat-participants` return byte-identical bodies for both accounts.
- The notification list contains rows whose `recipientId` is neither account.
- The UI filters notifications by recipient in the browser (`context/useNotifications.ts`, `loadNotifications`). The server does not scope these lists.
- **How to reproduce.** Call each endpoint with two tokens and compare the bodies.

### S-2. Any logged-in user can read chat messages they are not part of
**Severity: High.** `GET /bff/api/messages` with the token of `qa-c` returned four messages from a chat between two other accounts. Later it also returned messages from Alice's chats. The UI filters by chat id (`context/useChat.ts`, `loadChatHistory` and `loadChats`).

> **Status: fixed** (same change). C no longer sees messages or chats of A and B; B and A still do.

### S-3. Write endpoints take the acting user's id from the request body (source-verified, not runtime-tested)
**Severity: High (suspected).** `CreateFollowRequest.FollowerId` is taken from the body (`SocialGraph.API/Api/FollowEndpoints.cs`, line 62). `CreateReelRequest.CreatorId` is taken from the body (`Reels.API/Api/ReelEndpoints.cs`, line 65). Chat endpoints take `userId` and `createdBy` from the body (`context/useChat.ts`). The comment in `context/useSocial.ts` says the social-graph service "doesn't bind it from the JWT yet". A runtime probe was not completed: the sandbox declined a write that would create a follow edge on behalf of another account, and it was not retried. To verify, make one write on the local stack and delete it.

> **Status: fixed for follows, friends, blocks, preferences, reels, reel views, stories, story views/replies, events, attendances, group members, chat (chat, message, reaction, receipt, block, request, mute) and notification actors.** The acting user now comes from the JWT `sub`; a body that claims another id is ignored (verified: posting a follow with `followerId = B` as A stores `followerId = A`).

### S-4. Public development OAuth client with a literal secret; the SPA uses the password grant
**Severity: High for any non-demo deployment; Medium for this demo.** `src/main_fronted/src/api/auth.ts` hard-codes the client id `social-tests` and its client secret. The same values are in the served bundle. The SPA posts the username and password straight to `/bff/connect/token` (resource-owner password grant). The README notes the dev client is still seeded.

### S-5. Account enumeration on registration
**Severity: Low.** `POST /bff/api/account/register` with an existing email returns 409 with the message "A user with that email already exists."

### S-6. No rate limiting visible on the token endpoint
**Severity: Medium** (headers only). One failed password grant returned 400 with no `RateLimit*` or `Retry-After` headers. This is not a brute-force test; it only shows that no such headers are present.

### S-7. API documentation is publicly reachable
**Severity: Low.** `/swagger` (200), `/swagger/index.html` (200) and `/openapi/v1.json` (200) all respond without a token.

### S-8. Missing browser hardening headers; framework header exposed
**Severity: Low to Medium.** The web index response includes `X-Powered-By: Express`. No `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` or `Referrer-Policy` was observed.

### S-9. Bearer token stored in sessionStorage
**Severity: Low** (design note). `sl_access_token` lives in sessionStorage, so any script injected into the SPA could read it. With no CSP (S-8), there is no mitigation.

### S-10. Third-party image hosts at runtime
**Severity: Low.** Avatars and covers load from `api.dicebear.com` and `images.unsplash.com`. This leaks viewer IP addresses to those hosts.

### S-11. Positive (observed)
- Without a token, `/bff/api/feed/home`, `/api/posts`, `/api/notifications`, `/api/chats` and `/api/profiles/me` return 401.
- SignalR negotiate without a token returns 401.
- CORS preflight from a foreign origin returns 405 with no `Access-Control-Allow-Origin` header.
- Catalog browsing is anonymous by design.

---

## 9. Performance

Measured on the local stack with a single user. Numbers are indicative, not load tests.

| Measurement | Result |
|---|---|
| Web shell (`/`) time to first byte | about 1 ms |
| Web shell DOMContentLoaded / load | about 44 ms / 46 ms (JS cached) |
| JS bundle size | 866,254 bytes, no Content-Encoding (not compressed) |
| Password-grant token request | about 60 ms |
| `GET /bff/api/feed/home` | 8 to 13 ms, 1 KB for three posts |
| `GET /bff/api/posts` | 34 KB for 75 posts; 78 items later |
| Authenticated first load | 26 API calls, slowest single call 38 ms |
| `GET /bff/api/profiles/{id}` on first load | 7 calls, one per author (N+1 pattern) |
| `GET /bff/api/comments`, `reactions` | about 21 KB each, global, on every feed load |

### P-1. List endpoints are unbounded and ignore paging parameters
**Severity: Medium.** `GET /bff/api/posts` returned all 78 rows for `?pageSize=5`, `?page=1&pageSize=5` and `?take=5`. Other list endpoints were not checked for paging.

### P-2. Feed refresh fetches global collections on every load
**Severity: Medium** (scaling). `enrichComments`, `enrichReactions`, `enrichShares` and `enrichMedia` in `context/useFeed.ts` fetch all comments, reactions, shares and post-media rows across all users on each load. Cost grows with platform data, not with the size of the feed. Not a problem at 78 posts, but it will be.

### P-3. Web bundle is not compressed
**Severity: Low.** Requested with `Accept-Encoding: gzip`, the 866 KB bundle was returned uncompressed.

### P-4. Profile lookups are per author
**Severity: Low.** Seven separate `/api/profiles/{id}` calls on first load. A batch lookup would remove them.

---

## 10. Testing and deployment

### T-1. The served web image is older than the repo source
**Severity: Medium for the demo; High for judging the code.** Verified: `src/main_fronted/src/api/auth.ts` parses `body.errors` on registration. The served bundle (`/assets/index-DenlwABQ.js`) contains only `throw new Error(\`Registration failed (${status})\`)`. Other differences were not enumerated. Rebuild and redeploy the web image, then repeat the auth checks (F-4) and the profile checks (F-1).

### T-2. README is out of date on chat
**Severity: Low.** The README "Demo status" section lists "real-time chat transport (SignalR)" as not done. In this run the SignalR hub negotiated, and live delivery worked between two open clients (RT-4).

### T-3. Test data remains on the local stack
**Severity: Info.** Accounts `qa-a`, `qa-b` and `qa-c` and their content remain: posts, a story, a reel, a group, an event, follows, comments, reactions and chat messages. Remove them before any reviewer-facing run.

### T-4. Browser tool status annotations
**Severity: Info.** Some successful requests (a 204 DELETE, and several 500 PUTs) were annotated `net::ERR_ABORTED` by the browser tool. Not investigated. The status codes were confirmed with curl where it mattered.

### T-5. No automated test suite was run in this review
**Severity: Info.** The repo's own tests (for example `clients/typescript/test`) were not run. Findings here come from manual and curl checks only.

---

## Not tested / limits of this review

- Other browsers and real mobile devices. Native clients are not shipped (README).
- Private and friends-only visibility, blocks, group privacy, moderation.
- Oversized-upload UI path and the server-side response to oversized media (M-2). The 90 s reel limit at runtime (M-1).
- Runtime impersonation through body-supplied ids (S-3). The probe was declined by the sandbox and not retried.
- Keyboard use of the composer and feed, screen readers, full WCAG audit. Contrast figures are estimates.
- Other users' profiles through the UI (only through the API).
- Event creation through the UI (I-6), and group creation (none exists in the UI).
- Load, stress and brute-force testing: out of scope and not done.
- Two-browser real-time behaviour: all accounts shared one browser profile, so localStorage cross-talk affects the chat and profile observations (RT-3, RT-4, D-1, D-2).
- Feed ordering was compared on three posts by one author only.
- The browser tool's ERR_ABORTED annotations (T-4) were not investigated.
