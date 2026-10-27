# M10 — Communities: full posting and owner moderation

**Goal:** today a member can post only plain text in a community, and an owner cannot
remove anything. With M9's composer, members post everything they can post on Home. The
owner can take a post out of the community and remove a member.

All paths relative to `src/main_fronted/src/`. Depends on M9.

## Backend facts

| Resource | Body | Bound from JWT | Notes |
|---|---|---|---|
| `groups` | `name, description, avatar, coverImage, privacyType, approvalRequired` | none | No owner field. The owner is read from the `group-members` row with `role: 'owner'` (M5) |
| `group-members` | `groupId, userId, role` | **`userId`** | Nobody can add another person, so roles cannot be given to others before B12 |
| `post-feeds` | `postId, feedType, targetId` | none | A community post = a `post-feeds` row with `feedType: 'group'` |

**Authorization gap, written down on purpose:** `DELETE` does not check ownership (B3), and
`POST /api/post-feeds` does not check membership (B13). This milestone **shows** owner-only
controls only to the owner and the composer only to members (ground rule 6). The server
does not enforce either rule yet. Do not describe these controls as secure in UI copy or
in comments. B12 and B13 close the gap. The controls below keep working after it closes,
because the owner is the one who is allowed.

## 1. Posting

- `GroupsTab` community page, Posts tab: replace the text-only form with
  `<PostComposer target={{ kind: 'group', id, name }} placeholder={`Share something with ${name}`} label="Post in this community" />`.
  Keep the accessible name "Post in this community", because `community.smoke` uses it.
- Only members (`activeGroup.joined`) see the composer. Non-members see a one-line prompt
  "Join to post in this community" with the Join button. No disabled composer.
- After posting, the list reloads (`loadGroupPosts`, as today).

## 2. Owner moderation

In `context/useGroups.ts`:

- `removePostFromGroup(groupId, postId)`: find the `post-feeds` rows with
  `feedType: 'group', targetId: groupId, postId`, then `DELETE` each one. The **post stays**
  on its author's profile and Home. It just leaves the community. Update `setGroupFeed`
  only after a 2xx. Reject with the server's reason.
- `removeMember(groupId, memberRowId)`: `DELETE /api/group-members/{id}`, then update
  `membersByGroup` and the member count after a 2xx. The owner row cannot be removed (no
  control for it).

In the UI:

- `PostCard` gets an optional `extraMenuItems` prop (or the equivalent in `PostHeader`'s
  menu). On a community page, the owner sees "Remove from community" on every post that
  is not theirs. Their own posts already have "Delete post" (M1). Confirm with
  `ConfirmDialog`: "Remove this post from {community}? It stays on {author}'s profile."
- Members tab: the owner sees a "Remove {name}" icon button (≥ 44 px, `aria-label` naming
  the person) on every non-owner row, with a `ConfirmDialog`.
- Everyone else sees neither control.

## 3. Tests

- The composer appears for members only; a non-member sees the join prompt.
- An image post in a community sends `post-medias` and a `post-feeds` row with
  `feedType: 'group'` and this community's id.
- "Remove from community" is visible only to the owner, and not on the owner's own posts.
  It deletes only the matching `post-feeds` rows, never `/api/posts/{id}`.
- "Remove member" is visible only to the owner, never on the owner row. The list updates
  only after a 2xx. A failure shows the server message and the list is unchanged.
- Live smoke: extend `e2e-web/community.smoke.spec.ts`. A posts an **image** in the
  community. B joins, posts, and A removes B's post from the community. B still sees that
  post on B's profile.

## Acceptance

- [ ] Members can post text, images, video, links and polls in a community.
- [ ] The owner can remove a post from the community, and the post stays with its author.
- [ ] The owner can remove a member. The owner row cannot be removed.
- [ ] Owner-only controls are invisible to others. The server gap is noted in the code next to the calls (one line each, pointing at B12/B13).
- [ ] All tests pass; all gates green.
