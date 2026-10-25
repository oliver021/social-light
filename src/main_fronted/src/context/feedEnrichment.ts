// Shared enrichment for any list of posts (the home feed and a profile timeline). Each
// function fetches what it needs once and returns a pure per-post patch. A patch leaves
// posts outside its own id set untouched, so a batch can be applied to any list that
// holds some of the same posts.
import type { Post, Reactions } from '../types';
import { postsApi, engagementApi, getProfile, mediaUrl } from '../api/gateway';
import { commentDtoToComment, toReactionKey, emptyReactions, withHandle } from '../api/mappers';

/** A pure transform for one post. Returns the post unchanged when it is out of scope. */
export type PostPatch = (post: Post) => Post;

/** One reaction of mine on a post: its reaction id (so a toggle can DELETE it) and kind. */
export interface MyReaction {
  reactionId: string;
  key: keyof Reactions;
}

export interface ReactionEnrichment {
  patch: PostPatch;
  /** My reaction per post id, for the postIds in this batch only. */
  mine: Map<string, MyReaction>;
}

const idSet = (posts: Post[]) => new Set(posts.map((p) => p.id));

/** Resolve each author's handle from Profile (cached). Authors without one keep ''. */
export async function enrichAuthors(posts: Post[]): Promise<PostPatch | null> {
  const authorIds = [...new Set(posts.map((p) => p.authorId).filter((id): id is string => !!id))];
  if (authorIds.length === 0) return null;
  const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
  const handleById = new Map(authorIds.map((id, i) => [id, withHandle(profiles[i]?.handle)]));
  return (p) => (p.authorId && handleById.has(p.authorId)
    ? { ...p, author: { ...p.author, handle: handleById.get(p.authorId)! } }
    : p);
}

/** Attachments are separate post-media rows; the first one by position is shown. */
export async function enrichMedia(posts: Post[]): Promise<PostPatch | null> {
  const ids = idSet(posts);
  const { data } = await postsApi.GET('/api/post-medias');
  if (!data) return null;
  const first = new Map<string, { fileUrl: string; mediaType: string; position: number }>();
  for (const m of data) {
    if (!ids.has(m.postId)) continue;
    const position = Number(m.position) || 0;
    const cur = first.get(m.postId);
    if (!cur || position < cur.position) first.set(m.postId, { fileUrl: m.fileUrl, mediaType: m.mediaType, position });
  }
  if (first.size === 0) return null;
  return (p) => {
    const m = first.get(p.id);
    if (!m) return p;
    const isVideo = /video/i.test(m.mediaType);
    return isVideo
      ? { ...p, type: 'video', videoUrl: mediaUrl(m.fileUrl) }
      : { ...p, type: 'image', imageUrl: mediaUrl(m.fileUrl) };
  };
}

/** Share counts per post (Engagement lists every share; group by target). */
export async function enrichShares(posts: Post[]): Promise<PostPatch | null> {
  const ids = idSet(posts);
  const { data } = await engagementApi.GET('/api/shares');
  if (!data) return null;
  const counts = new Map<string, number>();
  for (const s of data) {
    if (s.targetType !== 'Post' || !ids.has(s.targetId)) continue;
    counts.set(s.targetId, (counts.get(s.targetId) ?? 0) + 1);
  }
  return (p) => (ids.has(p.id) ? { ...p, sharesCount: counts.get(p.id) ?? 0 } : p);
}

/**
 * Fetch all reactions once, group them per post into tallies, and record MY reaction (with
 * its id) per post. Posts in the batch with no reactions get an empty tally.
 */
export async function enrichReactions(posts: Post[], myUserId: string): Promise<ReactionEnrichment | null> {
  const ids = idSet(posts);
  const { data } = await engagementApi.GET('/api/reactions');
  if (!data) return null;
  const relevant = data.filter((r) => r.targetType === 'Post' && ids.has(r.targetId));

  const tallies = new Map<string, Reactions>();
  const mine = new Map<string, MyReaction>();
  for (const r of relevant) {
    const key = toReactionKey(r.reactionType);
    const tally = tallies.get(r.targetId) ?? emptyReactions();
    tally[key] += 1;
    tallies.set(r.targetId, tally);
    if (r.userId === myUserId) mine.set(r.targetId, { reactionId: r.id, key });
  }
  const patch: PostPatch = (p) => {
    if (!ids.has(p.id)) return p;
    return tallies.has(p.id)
      ? { ...p, reactions: tallies.get(p.id)!, currentUserReaction: mine.get(p.id)?.key ?? null }
      : { ...p, reactions: emptyReactions(), currentUserReaction: null };
  };
  return { patch, mine };
}

/** Real comment threads per post, with each distinct author resolved through Profile. */
export async function enrichComments(posts: Post[]): Promise<PostPatch | null> {
  const ids = idSet(posts);
  const { data } = await engagementApi.GET('/api/comments');
  if (!data) return null;
  const relevant = data.filter((c) => c.targetType === 'Post' && ids.has(c.targetId));
  if (relevant.length === 0) return null;

  const authorIds = [...new Set(relevant.map((c) => c.authorId))];
  const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
  const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));

  const byPost = new Map<string, ReturnType<typeof commentDtoToComment>[]>();
  for (const c of relevant) {
    const list = byPost.get(c.targetId) ?? [];
    list.push(commentDtoToComment(c, profileById.get(c.authorId) ?? null));
    byPost.set(c.targetId, list);
  }
  return (p) => (byPost.has(p.id) ? { ...p, comments: byPost.get(p.id)! } : p);
}

/** Apply patches in order. Pure: returns a new array, never mutates the input. */
export function applyPatches(posts: Post[], patches: PostPatch[]): Post[] {
  return patches.reduce((list, patch) => list.map(patch), posts);
}
