# M3 — Richer posting and conversations

**Goal:** use the parts of Posts and Engagement that the web ignores: threaded replies
(`parentCommentId`), reactions on comments (polymorphic `targetType`), share with a
message (`commentary`), and several attachments per post (`post-medias.position`).

All paths relative to `src/main_fronted/src/`. Depends on M1 (comment menu) and M2
(`updatePost`, shared enrichment).

Not in this milestone (and why): post location (FeedItemDto does not carry it), post
visibility (not enforced server-side, track B4), editing (no PUT, B2), hashtags and
mentions (no backend).

## 1. Threaded replies

- `types.ts` `Comment`: add `parentCommentId: string | null`. Keep comments as a flat
  list in state; build the tree at render time (no `replies` field).
- `commentDtoToComment` maps `parentCommentId`.
- `useFeed.addComment(postId, content, parentCommentId: string | null = null)` sends
  `parentCommentId` in the body. Notify: replying notifies the parent comment's author
  (type `'comment'`, entityType `'Comment'`, entityId parent id) instead of the post author;
  no-op for self.
- `CommentThread`: top-level comments in server order; replies indented one level under
  their parent (`pl` 40px, a left border `border-line`). A reply to a reply is shown at
  the same level, prefixed with `@{name}` of the comment it answers. Each comment has a
  "Reply" text button (`aria-label="Reply to {name}"`) that opens an inline input
  under it; Enter sends, Escape cancels. After 2 replies show "View {n} more replies".
- Deleting a parent (M1) keeps its replies visible under a "Comment deleted" placeholder
  (the server does not cascade).

## 2. Reactions on comments

- Only "like" for comments (keeps the UI small; the API accepts any `reactionType`).
- Shared enrichment: the reactions fetch already loads every reaction; also tally rows
  with `targetType === 'Comment'` into `comment.likes` and `comment.likedByMe`, and keep
  `myCommentReactionIds: Map<commentId, reactionId>`.
- `toggleCommentLike(postId, commentId)`: optimistic; `POST /api/reactions` `{ targetType: 'Comment', targetId: commentId, reactionType: 'like' }`
  or `DELETE /api/reactions/{id}`; roll back and toast on failure.
- UI: "Like" text button with count, `aria-pressed`, `aria-label="Like comment by {name}"`.

## 3. Share with a message

- `sharePost(postId, commentary?: string)`: body `commentary: commentary?.trim() || null`.
- The share button opens a `ResponsiveDialog` "Share post" with an optional textarea
  ("Say something about this…", max 500 chars, counter) and a "Share" `AsyncButton`.
  Keep a quick path: the dialog's primary button works with an empty message.
- Where shares become visible (so the message is not written into the void): on a
  profile (M2), a second section "Shared" lists shares with `sharerId === userId`
  (`GET /api/shares`, filter, newest last as returned): each shows the commentary and the
  original post loaded with `postsApi.GET('/api/posts/{id}')` rendered as a compact,
  read-only `PostCard` variant (`variant="embedded"`: no menu, no comment box). A missing
  original shows "This post is no longer available".

## 4. Several attachments per post

- Composer (image type): `MediaPicker` in a list, up to 4 images; each upload appends;
  each thumbnail has "Remove image {n}". Publish stays disabled while any upload runs.
- `createPost`: after the post is created, create one `post-medias` row per file with
  `position` 0..n-1, sequentially. If some fail, keep the post, show the ones that
  succeeded, toast "{k} of {n} images were not attached".
- `Post` type: `images?: string[]` (keep `imageUrl` = first image for compatibility).
- Enrichment: collect **all** media for a post sorted by `position` (today only the first).
- `PostBody`: 1 image full width; 2 side by side; 3 = one large + two stacked; 4 = 2×2
  grid. Clicking opens a lightbox (`ResponsiveDialog`, arrow keys and buttons to move,
  `aria-label="Image {i} of {n}"`). Video posts keep one video.

## 5. Tests

- `addComment` with a parent sends `parentCommentId`; notifies the parent author.
- `CommentThread`: replies render under the parent; "Reply" opens an input; Enter calls
  `addComment(postId, text, parentId)`; reply-to-reply shows the `@name` prefix.
- `toggleCommentLike`: contract for create and delete; rollback on failure.
- `sharePost` with and without commentary (body has `null` when empty).
- Profile "Shared" section: lists the user's shares; missing original → fallback text.
- `createPost` with 3 images: three `POST /api/post-medias` with positions 0,1,2; one
  failing → toast with "1 of 3".
- `PostBody` with 4 images renders 4 buttons "Open image i of 4".

Live smoke (`e2e-web/conversations.smoke.spec.ts`): comment, reply to it, like the reply,
reload, the reply is still nested.

## Acceptance

- [ ] Replies, comment likes, share messages and multi-image posts persist across reload.
- [ ] Share messages are visible somewhere (profile "Shared" section).
- [ ] All tests pass; all gates green.
