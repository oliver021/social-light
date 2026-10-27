# M9 — One composer for every place you can post

**Goal:** the home composer (`FeedsTab`) can post text, images, video, links and polls.
The community composer (`GroupsTab`) can only post text, and organizations have no composer.
Extract one `PostComposer` that posts to a **target** (`home`, a community or an
organization), and one hook function that writes the post and links it to that target.
M10 and M11 build on it.

All paths relative to `src/main_fronted/src/`. Depends on M3 (rich posting) and M5
(community posts).

## Backend facts

| Resource | Body | Bound from JWT | Notes |
|---|---|---|---|
| `posts` | `authorId, contentType, visibility, status, body, location, scheduledAt, publishedAt, archivedAt` | `authorId` | Created by `createPostRaw` (M3) |
| `post-medias` | `postId, fileUrl, mediaType, position` | none | One row per attachment |
| `post-feeds` | `postId, feedType, targetId` | none | **`feedType` is a free string.** `'group'` is already used (M5). M11 adds `'organization'` |

No `PUT`, so a post's target is fixed at creation. `post-feeds` has no filters (B8), so
reads are "list all, filter in the browser", as in M5.

## 1. Hook: `createPostIn`

In `context/useFeed.ts`:

```ts
export type PostTarget =
  | { kind: 'home' }
  | { kind: 'group'; id: string; name: string }
  | { kind: 'organization'; id: string; name: string };
```

- `createPostIn(target, content, type, extra)`:
  1. `createPostRaw(content, type, extra)` (unchanged, writes the post and its media).
  2. If `target.kind !== 'home'`, `POST /api/post-feeds { postId, feedType: target.kind, targetId: target.id }`.
     On failure, delete the post again (`deletePost`, best-effort) and reject with the
     server's reason. The home feed keeps nothing. This is the M5 `createGroupPost` logic, moved.
  3. `addToFeed(post)` with the target link set (`groupId/groupName` today,
     `organizationId/organizationName` from M11), so the post shows at the top of Home and
     on my profile.
  4. Resolve with the created `Post`.
- `useGroups.createGroupPost` becomes a thin wrapper:
  `createPostIn({ kind: 'group', id, name }, …)`, then `loadGroupPosts(id)`. Keep its name
  and signature, because `GroupsTab` and its tests use it.
- `deletePost` also deletes the post's `post-feeds` rows (best-effort, like
  `deletePostMedia`). Today they stay behind as orphans that point at a deleted post.

## 2. Component: `components/post/PostComposer.tsx`

Move the composer UI out of `FeedsTab.tsx` without changing what the user sees on Home:
text, the image / video / link / poll extras (`MediaPicker`), the upload progress and the
error `Alert`.

```ts
interface PostComposerProps {
  target: PostTarget;
  /** Shown in the text box, e.g. "Share something with Design Club". */
  placeholder?: string;
  /** Accessible name of the text box. Default "Post text" (the smoke specs use it). */
  label?: string;
  /** Called after a 2xx with the new post. */
  onPosted?: (post: Post) => void;
}
```

- It calls `createPostIn(target, …)` from the context. It keeps the text when posting fails
  and shows the server's message inline. It clears only after success.
- `FeedsTab` renders `<PostComposer target={{ kind: 'home' }} />`. The Home accessible
  names stay the same ("Post text", "Post"), because the L6 specs use them.
- No new visual style: `Surface`, tokens and `PILL_BUTTON`, as the Home composer uses today.

## 3. Tests

- `PostComposer.test.tsx`: text post to home sends **no** `post-feeds` request. A
  `group` target sends `{ feedType: 'group', targetId }`. A link failure deletes the post
  and shows the server message, and the text stays.
- An image post to a group target writes `post-medias` and then `post-feeds`, in that order.
- `useFeed` `deletePost` deletes the post's `post-feeds` rows. A failure there does not
  fail the delete.
- The existing `FeedsTab`, `GroupsTab` and community tests still pass unchanged. That is
  the regression check for the move.
- The `check:rules` script stays green (no hex colours, no new raw `fetch`).

## Acceptance

- [ ] One composer component used by Home. Home looks and behaves as before.
- [ ] `createPostIn` is the only code path that links a post to a community or organization.
- [ ] Deleting a post leaves no `post-feeds` rows behind (best-effort).
- [ ] All tests pass; all gates green.
