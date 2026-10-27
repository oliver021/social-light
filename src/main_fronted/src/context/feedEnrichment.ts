// Shared enrichment for any list of posts (the home feed and a profile timeline). Each
// function fetches what it needs once and returns a pure per-post patch. A patch leaves
// posts outside its own id set untouched, so a batch can be applied to any list that
// holds some of the same posts.
import type { Post, Reactions } from '../types';
import { postsApi, engagementApi, groupsApi, organizationsApi, getProfile, mediaUrl } from '../api/gateway';
import { commentDtoToComment, toReactionKey, emptyReactions, withHandle } from '../api/mappers';

/** A pure transform for one post. Returns the post unchanged when it is out of scope. */
export type PostPatch = (post: Post) => Post;

/** One reaction of mine on a post or a comment: its reaction id (so a toggle can DELETE it) and kind. */
export interface MyReaction {
  reactionId: string;
  key: keyof Reactions;
}

export interface ReactionEnrichment {
  patch: PostPatch;
  /** Applies the like tallies to the comments of the posts in this batch. */
  commentPatch: PostPatch;
  /** My reaction per post id, for the postIds in this batch only. */
  mine: Map<string, MyReaction>;
  /** My like per comment id (every comment reaction I hold), so an unlike can DELETE it. */
  mineComments: Map<string, MyReaction>;
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

/**
 * Attachments are separate post-media rows. Every image of a post is kept in position order
 * (`images`, with `imageUrl` as the first one); a video post keeps its first video.
 */
export async function enrichMedia(posts: Post[]): Promise<PostPatch | null> {
  const ids = idSet(posts);
  const { data } = await postsApi.GET('/api/post-medias');
  if (!data) return null;
  const byPost = new Map<string, { fileUrl: string; mediaType: string; position: number }[]>();
  for (const m of data) {
    if (!ids.has(m.postId)) continue;
    const list = byPost.get(m.postId) ?? [];
    list.push({ fileUrl: m.fileUrl, mediaType: m.mediaType, position: Number(m.position) || 0 });
    byPost.set(m.postId, list);
  }
  if (byPost.size === 0) return null;
  for (const list of byPost.values()) list.sort((a, b) => a.position - b.position);
  return (p) => {
    const list = byPost.get(p.id);
    if (!list || list.length === 0) return p;
    const first = list[0];
    if (/video/i.test(first.mediaType)) {
      return { ...p, type: 'video', videoUrl: mediaUrl(first.fileUrl) };
    }
    const images = list
      .filter((m) => !/video/i.test(m.mediaType))
      .map((m) => mediaUrl(m.fileUrl))
      .filter((url): url is string => !!url);
    return { ...p, type: 'image', images, imageUrl: images[0] };
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
 * Fetch all reactions once. Post reactions are grouped into per-post tallies, and MY reaction
 * (with its id) is recorded per post. Comment reactions (targetType 'Comment') are tallied into
 * each comment's `likes` / `likedByMe`, and my like per comment is recorded with its id.
 */
export async function enrichReactions(posts: Post[], myUserId: string): Promise<ReactionEnrichment | null> {
  const ids = idSet(posts);
  const { data } = await engagementApi.GET('/api/reactions');
  if (!data) return null;

  const tallies = new Map<string, Reactions>();
  const mine = new Map<string, MyReaction>();
  const commentLikes = new Map<string, { count: number; mine: boolean }>();
  const mineComments = new Map<string, MyReaction>();
  for (const r of data) {
    const key = toReactionKey(r.reactionType);
    if (r.targetType === 'Post' && ids.has(r.targetId)) {
      const tally = tallies.get(r.targetId) ?? emptyReactions();
      tally[key] += 1;
      tallies.set(r.targetId, tally);
      if (r.userId === myUserId) mine.set(r.targetId, { reactionId: r.id, key });
    } else if (r.targetType === 'Comment') {
      const cur = commentLikes.get(r.targetId) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.userId === myUserId) {
        cur.mine = true;
        mineComments.set(r.targetId, { reactionId: r.id, key });
      }
      commentLikes.set(r.targetId, cur);
    }
  }

  const patch: PostPatch = (p) => {
    if (!ids.has(p.id)) return p;
    return tallies.has(p.id)
      ? { ...p, reactions: tallies.get(p.id)!, currentUserReaction: mine.get(p.id)?.key ?? null }
      : { ...p, reactions: emptyReactions(), currentUserReaction: null };
  };
  // Every comment of a post in this batch gets its tally, or zero when nobody liked it.
  const commentPatch: PostPatch = (p) => {
    if (!ids.has(p.id) || p.comments.length === 0) return p;
    return {
      ...p,
      comments: p.comments.map((c) => ({
        ...c,
        likes: commentLikes.get(c.id)?.count ?? 0,
        likedByMe: commentLikes.get(c.id)?.mine ?? false,
      })),
    };
  };
  return { patch, commentPatch, mine, mineComments };
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

/**
 * Community and organization links (M5, M11): a post with a `group` post-feed row shows its
 * community's name and id, and one with an `organization` row shows its organization's. The
 * post-feed rows are read once; a community or organization is looked up only when a post in
 * this batch links to one of that kind. Posts without a link are left as they are.
 */
export async function enrichTargetLinks(posts: Post[]): Promise<PostPatch | null> {
  const ids = idSet(posts);
  const { data: feeds } = await postsApi.GET('/api/post-feeds');
  if (!feeds) return null;
  const groupByPost = new Map<string, string>();
  const organizationByPost = new Map<string, string>();
  for (const f of feeds) {
    if (!ids.has(f.postId)) continue;
    if (f.feedType === 'group') groupByPost.set(f.postId, f.targetId);
    else if (f.feedType === 'organization') organizationByPost.set(f.postId, f.targetId);
  }
  if (groupByPost.size === 0 && organizationByPost.size === 0) return null;

  const [groups, organizations] = await Promise.all([
    groupByPost.size > 0 ? groupsApi.GET('/api/groups').then((r) => r.data ?? []) : Promise.resolve([]),
    organizationByPost.size > 0 ? organizationsApi.GET('/api/organizations').then((r) => r.data ?? []) : Promise.resolve([]),
  ]);
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const organizationNameById = new Map(organizations.map((o) => [o.id, o.name]));
  return (p) => {
    let next = p;
    const groupId = groupByPost.get(p.id);
    if (groupId) next = { ...next, groupId, groupName: groupNameById.get(groupId) ?? 'Community' };
    const organizationId = organizationByPost.get(p.id);
    if (organizationId) {
      next = { ...next, organizationId, organizationName: organizationNameById.get(organizationId) ?? 'Organization' };
    }
    return next;
  };
}

/** Apply patches in order. Pure: returns a new array, never mutates the input. */
export function applyPatches(posts: Post[], patches: PostPatch[]): Post[] {
  return patches.reduce((list, patch) => list.map(patch), posts);
}
