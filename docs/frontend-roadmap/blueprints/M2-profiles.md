# M2 — Other people's profiles

**Goal:** clicking a person anywhere opens their profile: header, their posts, follow and
message buttons. Today the Profile tab only shows the signed-in user, and
`GET /api/feed/user/{userId}` (Feed.API `GetUserAsync`) is never called.

All paths relative to `src/main_fronted/src/`.

## 1. Navigation state (no router; keep the tab model)

In `useUiPreferences` (or `AppContext` if the tab state lives there):

- `viewedProfileId: string | null` — `null` means "my profile".
- `openProfile(userId: string)`: if `userId === currentUser.id` set `null`, else the id;
  remember the current tab in `profileReturnTab`; switch `activeTab` to `'profile'`;
  scroll the window to the top.
- `closeProfile()`: set `viewedProfileId = null` and go back to `profileReturnTab`.
- Selecting the Profile tab from any navigation shows **my** profile
  (`viewedProfileId = null`).
- Not persisted in localStorage (a reload lands on my profile; that is fine).
- `logout`/user change resets both.

## 2. Shared enrichment (refactor first, no behaviour change)

Move the enrichment steps of `useFeed` (`enrichAuthors`, `enrichMedia`, `enrichShares`,
`enrichReactions`, `enrichComments`) into `context/feedEnrichment.ts` as pure async
functions `(posts: Post[], ctx: { myUserId: string }) => Promise<Partial<Post>[]-patch>`
or equivalent, so the home feed and a profile timeline use the same code. Keep
`myReactionIds` handling in `useFeed`. The M0.1 `useFeed` tests must still pass unchanged.

## 3. Timeline state in `useFeed`

- New state `timeline: { userId: string; posts: Post[]; loading: boolean; error: string | null } | null`.
- `loadTimeline(userId)`: `feedApi.GET('/api/feed/user/{userId}', { params: { path: { userId } } })`,
  map with `feedItemToPost`, run the shared enrichment, set state. Failure sets `error`
  with `describeApiError(…, 'Could not load these posts')`.
- Every post mutation (`reactToPost`, `sharePost`, `addComment`, `deletePost`,
  `deleteComment`) must update the post **wherever it appears**: write one helper
  `updatePost(postId, fn)` that maps both `posts` and `timeline.posts`, and use it in all
  mutations. `reactToPost` must find the post in either list.
- `reset()` clears `timeline`.

## 4. Profile view

`ProfileTab` renders:
- `viewedProfileId === null` → today's own-profile view, but its post list now comes from
  `loadTimeline(currentUser.id)` instead of filtering the home feed.
- otherwise `PersonProfile` (new, `components/profile/PersonProfile.tsx`):
  - Header (`Surface`): `UserAvatar size="xl"`, display name, `@handle` (hidden when
    empty), bio, location, "Joined {month year}" from `ProfileDto.createdAt`.
  - Counts: followers = follows with `followingId === userId`; following = follows with
    `followerId === userId` (from the follow list `useSocial` already loads; add a
    selector `countsFor(userId)` to `useSocial`).
  - Actions: Follow / Following pill (existing `followUser`/`unfollowUser`), "Message"
    button (existing `openChatWithUser` with the real `userId`).
  - "Back" button (`ArrowLeft`, `aria-label="Back"`) calls `closeProfile`.
  - Posts: `timeline.posts` with `PostCard`; `PostSkeleton` while loading; `InlineError`
    with retry on error; `EmptyState` "No posts yet".
  - Profile data from `getProfile(userId)`; not found → `EmptyState` "This profile is not
    available" with a Back action.

## 5. Make people clickable everywhere

Pass `onOpen={() => openProfile(id)}` (via `UserLine`/`UserAvatar`) in: post header,
comment author, People widget rows, search results of type person (open profile instead
of the current behaviour; keep the old behaviour for posts/groups/items), Messenger chat
header, story viewer author, reel creator, event organizer, notification actor (if the
notification has `actorId`; add it to `NotificationItem` from the DTO).

## 6. Tests

- `useUiPreferences`/context: `openProfile(me)` sets `null`; `openProfile(other)` sets the
  id and tab; `closeProfile` returns to the previous tab.
- `useFeed.loadTimeline`: contract `GET /api/feed/user/{id}`; error state on 500.
- `updatePost`: reacting to a post that exists only in `timeline` updates it there and
  sends `POST /api/reactions`.
- `PersonProfile`: shows name/handle/counts; Follow calls `followUser(userId)`; Message
  calls `openChatWithUser` with that `userId`; Back calls `closeProfile`; not-found state.
- `PostHeader`: clicking the author name calls `openProfile(authorId)`.

Live smoke (`e2e-web/profiles.smoke.spec.ts`): user A posts; user B (second context)
opens A from the People widget, sees the post, follows.

## Acceptance

- [ ] Every place listed in §5 opens the right profile.
- [ ] `GET /api/feed/user/{userId}` is used for both my and other profiles.
- [ ] Engagement on a profile timeline works and stays consistent with the home feed.
- [ ] All tests pass; all gates green.
