# M1 — Content ownership: delete and dismiss

**Goal:** people can remove what they created, and dismiss notifications. Every module
already has `DELETE /{id}`; the web never calls most of them (KNOWN-ISSUES F-5 "no edit
or delete").

All paths relative to `src/main_fronted/src/`. Use `OverflowMenu` + `ConfirmDialog`
from M0.3 for every destructive action.

> **Security note for the reviewer.** The generated `DELETE` endpoints do not check
> ownership today (track B, item B3): any signed-in user can delete any row by id. This
> milestone only shows the controls to the owner; it does not make deletion safe. Do not
> claim otherwise in copy or comments.

## Owner rule

`isOwner = !!ownerId && ownerId === currentUser.id`. Never show a delete control when
`ownerId` is missing.

## 1. Posts

- Hook `useFeed`: `deletePost(postId): Promise<void>`
  1. `postsApi.DELETE('/api/posts/{id}', { params: { path: { id: postId } } })`.
  2. Non-2xx → throw `describeApiError(error, response, 'The post was not deleted')`.
  3. On success remove it from `posts`, then best-effort delete its media rows **in the
     same module**: `GET /api/post-medias`, filter `postId`, `DELETE /api/post-medias/{id}`
     for each, ignore failures (they are invisible orphans, not user-facing state).
  4. Do **not** delete comments/reactions/shares from the client: they belong to the
     Engagement module and must be cleaned by an event consumer (track B, B6).
- UI: `PostHeader` gets an `OverflowMenu` labelled "More actions for this post" with a
  danger item "Delete post", only for the owner. `ConfirmDialog`: title "Delete this
  post?", body "It will be removed from your profile and from your followers' feeds.",
  confirm "Delete". Toast "Post deleted" on success.
- Expose `deletePost` through `AppContextType`.

## 2. Comments

- Hook `useFeed`: `deleteComment(postId, commentId): Promise<void>` →
  `engagementApi.DELETE('/api/comments/{id}')`, then remove from that post's `comments`.
  Failure message "The comment was not deleted".
- UI: each comment in `CommentThread` whose `authorId === currentUser.id` gets a small
  `OverflowMenu` ("More actions for your comment") with "Delete comment" + confirm.

## 3. Stories

- Hook `useStories`: `deleteStory(storyId)` → `storiesApi.DELETE('/api/stories/{id}')`,
  remove from `stories`. Failure "The story was not deleted".
- UI: in the story viewer (`StoriesBar`), when the open story's `authorId === me`, a
  "Delete story" button (icon `Trash2`, `aria-label="Delete your story"`) with confirm;
  after success close the viewer.

## 4. Reels

- Hook `useReels`: `deleteReel(reelId)` → `reelsApi.DELETE('/api/reels/{id}')`, remove
  from the list. Failure "The reel was not deleted".
- UI: in `ReelPlayer`, owner-only `OverflowMenu` with "Delete reel" + confirm.

## 5. Events

- Hook `useEvents`: `deleteEvent(eventId)` → `eventsApi.DELETE('/api/events/{id}')`,
  then best-effort delete my own attendance row for it (same module). Failure "The event
  was not deleted".
- UI: in `EventsWidget`, owner (`organizerId === me`) gets "Cancel event" with confirm
  ("Cancel this event? People who said they are going will no longer see it.").

## 6. Groups

`GroupDto` has no owner field. Ownership is recorded through the creator's membership:

- In `useGroups.createGroup`, create the creator's membership with `role: 'owner'`
  instead of `'member'`.
- Keep a map `myRoleByGroup` (from `GET /api/group-members`, filtered by `userId === me`).
- `deleteGroup(groupId)` → `groupsApi.DELETE('/api/groups/{id}')`, then best-effort
  delete my membership row. Failure "The community was not deleted".
- UI: in the group detail view, when `myRoleByGroup.get(id) === 'owner'`, an
  `OverflowMenu` with "Delete community" + confirm. Groups created before this milestone
  have no owner and show no delete (say so in the report; it is correct).
- `reset()` clears `myRoleByGroup`.

## 7. Notifications

- Hook `useNotifications`: `dismissNotification(id)`:
  - ids starting with `notif-` are client-only items (from `addNotification`): remove
    locally;
  - otherwise `notificationsApi.DELETE('/api/notifications/{id}')`, remove on 2xx,
    toast "The notification was not removed" on failure.
- `clearNotifications()`: dismiss all currently listed, one request at a time; if any
  fail, keep those in the list and toast "Some notifications could not be removed".
- UI (`NotificationsMenu`): each row gets an icon button `aria-label="Dismiss notification from {actor}"`
  (`X`, 18px); the menu header gets a "Clear all" text button when the list is not empty.
  No confirm dialog for notifications (low stakes, matches common apps).

## 8. Tests

Hooks (`mockApi`):
- For each of `deletePost`, `deleteComment`, `deleteStory`, `deleteReel`, `deleteEvent`,
  `deleteGroup`, `dismissNotification`: contract (method + path with the id), success
  (item gone from state), failure (item kept, function rejects / toast called with a
  non-empty message).
- `deletePost` deletes the post's media rows and **no** engagement rows (assert no call
  to `/api/comments`, `/api/reactions`, `/api/shares` with `DELETE`).
- `createGroup` sends `role: 'owner'`.
- `clearNotifications` with one failing id keeps exactly that one.

Components:
- `PostHeader`/`PostCard`: owner sees "More actions for this post"; another user's post
  has no such button; confirm flow calls `deletePost`.
- `CommentThread`: only own comments have the menu.
- `NotificationsMenu`: dismiss button named per actor; "Clear all" calls `clearNotifications`.

Live smoke (`e2e-web/ownership.smoke.spec.ts`): register, post "smoke delete me",
delete it through the menu, reload, the text is gone.

## Acceptance

- [ ] The seven actions work from the UI for the owner and are absent for others.
- [ ] Every destructive action except notification dismiss goes through `ConfirmDialog`.
- [ ] No client-side deletion across modules (post → engagement).
- [ ] All tests above exist and pass; all gates green.
