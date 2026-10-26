# M5 — Stories, groups and events, completed

**Goal:** finish the three modules the web uses half-way: story replies and a real
viewer, posts inside communities (`post-feeds`) with member lists, and full RSVP with
attendee lists and capacity.

All paths relative to `src/main_fronted/src/`. Depends on M1.

## 1. Stories

Backend: `story-replies` `{ storyId, userId (JWT), body }`, readable by anyone signed in.
`story-views` is readable only by the viewer, so "seen by" is **not** possible (track B5).

- `useStories`:
  - `loadStories` drops stories with `expiresAt <= now` and groups them by author
    (`storiesByAuthor`, newest last), authors ordered: me first, then others by their
    newest story.
  - `replyToStory(storyId, body)`: `POST /api/story-replies` `{ storyId, userId: me, body }`;
    notify the author (`'story_reply'`, entityType `'Story'`). Reject with
    "Your reply was not sent" on failure (input keeps the text).
  - `loadReplies(storyId)`: `GET /api/story-replies`, filter by `storyId`, resolve authors
    with `getProfile`.
  - `addStory` accepts video too (`mediaType: 'video'`, `MediaPicker kind="video"`).
- Viewer (`components/stories/StoryViewer.tsx`, moved out of `StoriesBar`):
  - Segmented progress bar per story of the author; images advance after 5 s, videos at
    `ended`; tap/click right half or `ArrowRight` = next, left half or `ArrowLeft` =
    previous, `Escape` closes; hold (pointer down) pauses. Respect reduced motion (no
    animated bar, still advances).
  - Others' stories: reply input "Reply to {name}…", Enter sends, shows "Sent" for 2 s.
  - My stories: a "Replies ({n})" button opening a list (`UserLine` + text).
  - `role="dialog"`, `aria-label="Story by {name}"`, focus trapped (MUI `Dialog`).
- Add `'story_reply'` to the notification types and texts.

## 2. Groups: posts inside a community

Backend: `post-feeds` `{ postId, feedType, targetId }` (Posts module). Use
`feedType: 'group'`, `targetId: groupId`.

- `useGroups`:
  - `loadGroupPosts(groupId)`: `GET /api/post-feeds` filter `feedType === 'group' && targetId === groupId`;
    `GET /api/posts`, keep those ids; map with a new `postDtoToPost(dto, profile)` mapper
    (author resolved with `getProfile`); run the shared enrichment from M2. Order by
    `publishedAt` desc.
  - `createGroupPost(groupId, content, type, extra)`: reuse `useFeed`'s create path
    (expose a `createPostRaw` that returns the created post) then
    `POST /api/post-feeds` `{ postId, feedType: 'group', targetId: groupId }`. If that
    second call fails, delete the just-created post (same module, so this is a rollback,
    not cross-module cleanup) and reject "Your post was not added to the community".
  - Only members see the composer in the group view.
  - `loadMembers(groupId)`: `GET /api/group-members` filter `groupId`, resolve profiles.
- Home feed: a post that has a `group` post-feed row shows "{author} › {group name}" in
  its header (the enrichment adds `groupId`/`groupName`; clicking the group opens it).
- Group view: `PageHeader` with cover (if `coverImage`), name, privacy `StatusChip`
  (from `privacyType`), member count; tabs "Posts" and "Members". Members list with role
  `StatusChip` ("Owner" for `owner`).
- Create group dialog: optional cover image (`MediaPicker`) → `coverImage`; avatar image
  → `avatar`. Do **not** add an "approval required" option (nobody can approve: the
  member's `userId` is bound from the JWT). Privacy is a label only; the dialog says
  "Posts in this community can be seen by anyone signed in." for honesty.

## 3. Events: full RSVP, attendees, capacity

Backend: `event-attendances` `{ eventId, userId (JWT), status }`, readable by anyone.
No PUT: changing an answer = delete my row + create the new one (the same toggle
pattern reactions use; it replaces my own state, not content).

- Statuses: `'going' | 'interested' | 'not_going'`.
- `useEvents.setRsvp(eventId, status | null)`: delete my existing row if any, then
  create the new one unless `null`. Optimistic, with rollback + toast on failure.
- Selectors: `attendeesOf(eventId)` → `{ going: Person[], interested: Person[] }`,
  `myRsvp(eventId)`.
- Capacity: when `capacity` is set and `going.length >= capacity`, the "Going" option is
  disabled with the label "Full" (unless I am already going). The server does not
  enforce this; do not claim it does.
- Event detail (`components/events/EventDetail.tsx`, `ResponsiveDialog`): title,
  date range formatted with `Intl.DateTimeFormat` in the viewer's time zone (show the
  zone name), location, description, organizer (`UserLine`, opens profile), RSVP
  segmented buttons (`role="radiogroup"`), "{n} going · {m} interested" with avatar
  stack, and "Add to calendar" which downloads a generated `.ics` file (`Blob` +
  `URL.createObjectURL`, `text/calendar`, UID = event id).
- "See all events" in `EventsWidget` opens a list dialog: upcoming sorted by
  `startDate`, a "Show past events" switch.
- Create event dialog: add `capacity` (optional positive integer) and end date ≥ start
  date validation with inline errors.

## 3b. Carried from the reviews and checkpoints (do these too)

- **Event creation swallows failures** (M0.4 review): `EventsWidget.handleCreate` does not
  await `createEvent`, and `useEvents.createEvent` ignores a failed POST. Make
  `createEvent` reject with `describeApiError(…, 'The event was not created')`; the
  dialog awaits it, stays open with the message on failure, closes only on success.
  `rsvpEvent`/`setRsvp` must roll back and toast on failure (§3 already requires it).
- **Multi-image post reports "not published" on a network error** (M3 review,
  checkpoint 2): in `useFeed.createPost` wrap each `post-medias` POST in `try/catch` and
  count a thrown request as a failed attachment, so the post is kept and the toast says
  "{k} of {n} images were not attached". `createGroupPost` reuses this path.
- Tests: `createEvent` failure keeps the dialog open with the message; `createPost` with
  one image request rejecting (network) keeps the post and toasts "1 of 3".

## 4. Tests

- Stories: expired filtered; grouping/order; `replyToStory` contract + failure keeps
  text; viewer keyboard navigation (ArrowRight moves to the next story, Escape closes);
  "Replies" button only on my own story.
- Groups: `loadGroupPosts` filters by feed rows; `createGroupPost` creates the feed row,
  and on its failure deletes the post (assert the `DELETE /api/posts/{id}`); composer
  hidden for non-members; members list shows "Owner".
- Events: `setRsvp` going→interested sends DELETE then POST with `status: 'interested'`;
  rollback on failure; "Full" disables Going; `.ics` content contains `DTSTART`, `SUMMARY`
  and the event id (test the pure builder function).

Live smoke (`e2e-web/community.smoke.spec.ts`): create a community, post in it, see the
post in the group and with "› {group}" in the home feed; create an event, mark
Interested, reload, still Interested.

## Acceptance

- [ ] Story replies work both ways; viewer navigates by keyboard and pointer.
- [ ] Community posts persist and are linked to the community.
- [ ] RSVP has three states, capacity is shown honestly, attendees are listed.
- [ ] All tests pass; all gates green.
