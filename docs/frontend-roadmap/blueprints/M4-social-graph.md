# M4 — Social graph: friends, blocks, mutes

**Goal:** use the three SocialGraph resources the web ignores — `friends`, `blocks`,
`user-preferences` — next to the `follows` it already uses.

All paths relative to `src/main_fronted/src/`. New hook `context/useRelationships.ts`,
wired into `AppContext`. Depends on M2 (profiles) for the entry points.

## Backend facts (read before designing anything)

| Resource | Body | Bound from JWT | Readable by |
|---|---|---|---|
| `friends` | `requesterId, recipientId, status, acceptedAt` | `requesterId` | requester **or** recipient |
| `blocks` | `blockerId, blockedId, reason` | `blockerId` | the blocker only |
| `user-preferences` | `userId, entityType, entityId, preferenceType, expiresAt` | `userId` | the owner only |

There is **no PUT**. A friend request cannot be "updated to accepted"; acceptance is a
second row. Nobody can learn that they were blocked (by design, and by `readScope`).

## 1. Friends

Model (document it in a comment at the top of the hook):

- A pair is **friends** if any row between them (either direction) has `status: 'accepted'`.
- Otherwise, a row `me → them` with `status: 'pending'` means **requested**; a row
  `them → me` pending means **incoming**; no row means **none**.

Operations:
- `sendFriendRequest(userId)`: `POST /api/friends` `{ requesterId: me, recipientId: userId, status: 'pending', acceptedAt: null }`;
  then `notify(userId, 'friend_request', 'User', me)`.
- `acceptFriend(userId)`: `POST /api/friends` `{ requesterId: me, recipientId: userId, status: 'accepted', acceptedAt: new Date().toISOString() }`;
  notify the requester (`'friend_accept'`). Keep their pending row (it is history).
- `declineFriend(userId)`: `DELETE /api/friends/{id}` of their pending row.
- `cancelFriendRequest(userId)`: `DELETE` my pending row.
- `unfriend(userId)`: `DELETE` every row of the pair, one by one; if one fails, reload and
  toast "Could not remove the friendship completely".
- Selector `relationTo(userId): 'none' | 'requested' | 'incoming' | 'friends'` and
  `friends: string[]`, `incomingRequests: { userId, requestId }[]`.

UI:
- `PersonProfile` (M2): next to Follow, a friendship button driven by `relationTo`:
  "Add friend" → "Request sent" (menu: "Cancel request") → for incoming "Accept" +
  "Decline" → "Friends" (menu: "Unfriend", with confirm).
- `Widgets`: a "Friend requests" `Surface` above People, shown only when
  `incomingRequests` is non-empty, max 3 rows with Accept/Decline (`aria-label` with the
  name), "See all" opens a dialog with the full list.
- My profile header: "{n} friends" (my own friends only — other people's friend lists
  are not readable, so do not show a count on someone else's profile).
- `notificationToItem`: texts for `friend_request` ("{actor} sent you a friend request")
  and `friend_accept` ("{actor} accepted your friend request"); add both to the
  `NotificationItem['type']` union.

## 2. Blocks

- `blockUser(userId, reason?)`: `POST /api/blocks` `{ blockerId: me, blockedId: userId, reason: reason ?? null }`;
  then best-effort: unfollow (existing `unfollowUser`), `unfriend`, and close any open
  chat window with them.
- `unblockUser(userId)`: `DELETE /api/blocks/{id}`.
- Selector `isBlocked(userId)`.
- Effect, **in my own views only**: hide posts, comments, stories, reels and people rows
  of blocked users; the Messenger does not open a chat with them ("You blocked this
  person. Unblock to send messages."); their profile shows a minimal header with
  "Unblock". Apply the filtering in selectors (`visiblePosts`, `visibleStories`, …), not
  by deleting state.
- Copy must be honest: the confirm dialog says "You won't see their posts, comments or
  messages. They won't be told." — never "they can't see you" (the backend does not
  enforce that).
- Entry points: `PostHeader` menu on others' posts "Block {name}"; `PersonProfile` menu
  "Block"; Messenger chat header menu "Block".

## 3. Mutes, snoozes, hidden posts (`user-preferences`)

| Action | Body | Effect in my views |
|---|---|---|
| Hide post | `entityType: 'Post', entityId: postId, preferenceType: 'hide', expiresAt: null` | post not shown in home feed; an "Undo" snackbar for 6 s |
| Snooze {name} 30 days | `entityType: 'User', preferenceType: 'snooze', expiresAt: now + 30 days` | their posts/stories not in home feed or stories bar until it expires |
| Mute {name} | `entityType: 'User', preferenceType: 'mute', expiresAt: null` | same as snooze, no end |

- Preferences with `expiresAt` in the past are ignored and deleted best-effort on load.
- Muted/snoozed people stay visible on their own profile (it is a feed preference).
- `removePreference(id)` = `DELETE /api/user-preferences/{id}` (used by Undo and settings).
- Entry points: `PostHeader` menu on others' posts: "Hide post", "Snooze {name} for 30 days", "Mute {name}".

## 4. Settings: "Blocked and muted"

My profile gets a "Privacy" button that opens a `ResponsiveDialog` with two lists:
blocked people (Unblock) and muted/snoozed people (with "until {date}" for snoozes,
Unmute). `EmptyState` when empty.

## 5. Loading and reset

`loadRelationships()` runs after login with `loadPeople` (three GETs in parallel).
`reset()` clears everything on logout or user change (KNOWN-ISSUES D-1/D-2: no data of a
previous account may survive).

## 6. Tests

Hook (`mockApi`):
- `relationTo` for each of the four states from fixture rows, including an accepted row
  in the *other* direction.
- Contract tests for every operation (bodies as in §1–§3; `acceptedAt` is an ISO string
  on accept and `null` on request).
- `unfriend` deletes all rows of the pair; one failure → toast + reload.
- `blockUser` calls `POST /api/blocks` then unfollows; `visiblePosts` drops the blocked
  author's posts and comments.
- Expired snooze is ignored and a `DELETE` is sent for it.
- `reset` empties all state.

Components:
- `PersonProfile` shows the right friendship button per state.
- `PostHeader` menu on another user's post has Hide/Snooze/Mute/Block; on my own post it
  has none of them (only M1's Delete).
- Block confirm dialog contains "They won't be told" and not "can't see you".

Live smoke (`e2e-web/friends.smoke.spec.ts`, two browser contexts): A sends a request,
B accepts, both see "Friends"; A blocks B, B's post disappears from A's feed.

## Acceptance

- [ ] Friend request / accept / decline / cancel / unfriend work between two accounts.
- [ ] Block, mute, snooze and hide change only my views and are reversible from settings.
- [ ] No count or list is shown that the API cannot actually provide.
- [ ] All tests pass; all gates green. Human checkpoint 2 is due after this milestone.
