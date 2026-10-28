import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { UserProfile, Post, Reactions, Comment } from '../types';
import { postsApi, engagementApi, feedApi, mediaUrl, describeApiError, messageOf } from '../api/gateway';
import { feedItemToPost, newPostToPost } from '../api/mappers';
import { usePersistentState } from './usePersistentState';
import { type ToastSeverity } from './useToast';
import {
  applyPatches,
  enrichAuthors,
  enrichComments,
  enrichTargetLinks,
  enrichMedia,
  enrichReactions,
  enrichShares,
  type PostPatch,
} from './feedEnrichment';

/** A post carries at most this many images (M3). */
export const MAX_POST_IMAGES = 4;

/** The image urls of an image post: `imageUrls` (M3) or the legacy single `imageUrl`. */
function attachedImageUrls(extra: any): string[] {
  const urls: unknown[] = Array.isArray(extra?.imageUrls)
    ? extra.imageUrls
    : typeof extra?.imageUrl === 'string' ? [extra.imageUrl] : [];
  return urls.filter((u): u is string => typeof u === 'string' && u.length > 0).slice(0, MAX_POST_IMAGES);
}

interface Deps {
  myUserId: MutableRefObject<string>;
  currentUser: UserProfile;
  /** Record a notification for another user (from useNotifications). */
  notify: (recipientId: string | undefined, type: string, entityType: string, entityId: string) => void;
  showToast: (message: string, severity?: ToastSeverity) => void;
}

/** One person's posts (a profile timeline), with its own loading and error state. */
export interface ProfileTimeline {
  userId: string;
  posts: Post[];
  loading: boolean;
  error: string | null;
}

/** The posts of one community (M5), shown while its page is open. */
export interface GroupFeed {
  groupId: string;
  posts: Post[];
}

/** The posts of the organization being viewed (M11), shown while its page is open. */
export interface OrganizationFeed {
  organizationId: string;
  posts: Post[];
}

/**
 * Where a new post is shown and linked (M9): my home feed, a community, or an organization.
 * A community or an organization is linked through a post-feed row; `createPostIn` is the
 * only code path that does this.
 */
export type PostTarget =
  | { kind: 'home' }
  | { kind: 'group'; id: string; name: string }
  | { kind: 'organization'; id: string; name: string };

/** Where an enrichment result lands: the home feed, a timeline, or a community's posts. */
type Target =
  | { list: 'feed' }
  | { list: 'timeline'; userId: string; seq: number }
  | { list: 'group'; groupId: string; seq: number }
  | { list: 'organization'; organizationId: string; seq: number };

/**
 * The home feed, a profile timeline, and everything that mutates a post: create, react,
 * share, vote, comment, delete. The feed is composed server-side (Feed.API) in one call;
 * engagement counts/threads/own-reactions are folded in afterwards by the shared
 * enrichment in feedEnrichment.ts, so the feed and a profile timeline use the same code.
 */
export function useFeed({ myUserId, currentUser, notify, showToast }: Deps) {
  const [posts, setPosts] = usePersistentState<Post[]>('nexus_posts', () => []);
  // The timeline of the profile being viewed. Not persisted: it is re-read on open.
  const [timeline, setTimeline] = useState<ProfileTimeline | null>(null);
  // The posts of the community being viewed (M5). Not persisted: it is re-read on open.
  const [groupFeed, setGroupFeedState] = useState<GroupFeed | null>(null);
  // The posts of the organization being viewed (M11). Not persisted: it is re-read on open.
  const [organizationFeed, setOrganizationFeedState] = useState<OrganizationFeed | null>(null);
  // Bumped by every community load, so a slow response for a previous community is dropped.
  const groupSeq = useRef(0);
  // Bumped by every organization load, so a slow response for a previous organization is dropped.
  const organizationSeq = useRef(0);
  // Maps a postId -> the current user's reaction id on it, so a toggle can DELETE it.
  const myReactionIds = useRef<Map<string, string>>(new Map());
  // Maps a commentId -> the current user's like id on that comment (M3).
  const myCommentReactionIds = useRef<Map<string, string>>(new Map());
  // Comments whose like is being saved, so a double click does not send two requests.
  const pendingCommentLikes = useRef<Set<string>>(new Set());
  // Bumped by every timeline load, so a slow response for a previous profile is dropped.
  const timelineSeq = useRef(0);

  // Post lists are updated only through these, so one change lands in both the home feed and
  // a profile timeline when the post appears in both.
  const updatePost = (postId: string, fn: (post: Post) => Post) => {
    const map = (list: Post[]) => list.map((p) => (p.id === postId ? fn(p) : p));
    setPosts((prev) => map(prev));
    setTimeline((t) => (t ? { ...t, posts: map(t.posts) } : t));
    setGroupFeedState((g) => (g ? { ...g, posts: map(g.posts) } : g));
    setOrganizationFeedState((o) => (o ? { ...o, posts: map(o.posts) } : o));
  };

  const findPost = (postId: string): Post | undefined =>
    posts.find((p) => p.id === postId)
    ?? timeline?.posts.find((p) => p.id === postId)
    ?? groupFeed?.posts.find((p) => p.id === postId)
    ?? organizationFeed?.posts.find((p) => p.id === postId);

  // Apply enrichment results to the list they were loaded for. A timeline result is dropped
  // when that timeline was replaced while the request was in flight.
  const commit = (target: Target, patch: PostPatch | PostPatch[] | null) => {
    const patches = patch === null ? [] : Array.isArray(patch) ? patch : [patch];
    if (patches.length === 0) return;
    if (target.list === 'feed') {
      setPosts((prev) => applyPatches(prev, patches));
      return;
    }
    if (target.list === 'group') {
      if (groupSeq.current !== target.seq) return;
      setGroupFeedState((g) => (g && g.groupId === target.groupId ? { ...g, posts: applyPatches(g.posts, patches) } : g));
      return;
    }
    if (target.list === 'organization') {
      if (organizationSeq.current !== target.seq) return;
      setOrganizationFeedState((o) => (o && o.organizationId === target.organizationId
        ? { ...o, posts: applyPatches(o.posts, patches) }
        : o));
      return;
    }
    if (timelineSeq.current !== target.seq) return;
    setTimeline((t) => (t && t.userId === target.userId ? { ...t, posts: applyPatches(t.posts, patches) } : t));
  };

  // Each enrichment paints as soon as it resolves; a failed one leaves its field as it was.
  // Comments and reactions land in one step: the comment likes are applied to the comments,
  // so the comments must be in place first.
  const enrichAll = (list: Post[], target: Target) => {
    enrichAuthors(list).then((patch) => commit(target, patch)).catch(() => {});
    Promise.allSettled([enrichComments(list), enrichReactions(list, myUserId.current)])
      .then(([comments, reactions]) => {
        const patches: PostPatch[] = [];
        if (comments.status === 'fulfilled' && comments.value) patches.push(comments.value);
        if (reactions.status === 'fulfilled' && reactions.value) {
          const result = reactions.value;
          // Replace my reaction ids for these posts only, so the other list keeps its own.
          for (const p of list) myReactionIds.current.delete(p.id);
          for (const [postId, mine] of result.mine) myReactionIds.current.set(postId, mine.reactionId);
          for (const [commentId, mine] of result.mineComments) myCommentReactionIds.current.set(commentId, mine.reactionId);
          patches.push(result.patch, result.commentPatch);
        }
        commit(target, patches);
      })
      .catch(() => {});
    enrichShares(list).then((patch) => commit(target, patch)).catch(() => {});
    enrichMedia(list).then((patch) => commit(target, patch)).catch(() => {});
    enrichTargetLinks(list).then((patch) => commit(target, patch)).catch(() => {});
  };

  const findComment = (postId: string, commentId: string): Comment | undefined =>
    findPost(postId)?.comments.find((c) => c.id === commentId);

  const updateComment = (postId: string, commentId: string, fn: (c: Comment) => Comment) =>
    updatePost(postId, (p) => ({ ...p, comments: p.comments.map((c) => (c.id === commentId ? fn(c) : c)) }));

  const loadFeed = async () => {
    const { data } = await feedApi.GET('/api/feed/home');
    if (!data) return;
    const mapped = data.map(feedItemToPost);
    setPosts(mapped);
    // The feed paints immediately; engagement and author resolution follow in the background.
    enrichAll(mapped, { list: 'feed' });
  };

  // The posts of one user (their own profile or someone else's), from Feed.API. A slow
  // response for a profile I already left is ignored.
  const loadTimeline = async (userId: string) => {
    const seq = ++timelineSeq.current;
    // Keep the posts already shown for this user while reloading, so a refresh does not blank them.
    setTimeline((t) => ({ userId, posts: t?.userId === userId ? t.posts : [], loading: true, error: null }));
    try {
      const { data, error, response } = await feedApi.GET('/api/feed/user/{userId}', { params: { path: { userId } } });
      if (seq !== timelineSeq.current) return;
      if (!data) throw new Error(describeApiError(error, response, 'Could not load these posts'));
      const mapped = data.map(feedItemToPost);
      setTimeline({ userId, posts: mapped, loading: false, error: null });
      enrichAll(mapped, { list: 'timeline', userId, seq });
    } catch (err) {
      if (seq !== timelineSeq.current) return;
      const message = messageOf(err, 'Could not load these posts');
      setTimeline((t) => ({ userId, posts: t?.userId === userId ? t.posts : [], loading: false, error: message }));
    }
  };

  // Create a post on my home feed and report a refusal as a toast. Composers that keep the
  // text on failure call createPostIn directly instead.
  const addPost = async (content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', _extraData?: any) => {
    try {
      await createPostIn({ kind: 'home' }, content, type, _extraData);
    } catch (err) {
      showToast(messageOf(err, 'Your post was not published'));
    }
  };

  // The Posts-module half of a create: the post row, then one post-media row per attachment.
  // Nothing is shown here; the caller decides where the new post goes (the home feed, or a
  // community). Throws a readable message when the post itself is refused. An attachment that
  // fails, by refusal or by a network error, is counted and reported, and the post is kept.
  const createPostRaw = async (content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', _extraData?: any): Promise<Post> => {
    const { data, error, response } = await postsApi.POST('/api/posts', {
      body: {
        contentType: type,
        visibility: 'public',
        status: 'published',
        body: content,
        location: null,
        scheduledAt: null,
        publishedAt: null,
        archivedAt: null,
      },
    });
    if (!data) throw new Error(describeApiError(error, response, 'Your post was not published'));

    let created = newPostToPost(data, currentUser);
    if (type === 'image') {
      // One post-media row per image, positions 0..n-1 in the order chosen. A failed row is
      // skipped: the post stays, and the ones that were saved are shown.
      const urls = attachedImageUrls(_extraData);
      const attached: string[] = [];
      for (const [position, url] of urls.entries()) {
        let saved = false;
        try {
          const res = await postsApi.POST('/api/post-medias', {
            body: { postId: data.id, fileUrl: url, mediaType: 'image', position },
          });
          saved = res.response.ok && !!res.data;
        } catch {
          saved = false; // a network error is a failed attachment, not a failed post
        }
        const shown = mediaUrl(url);
        if (saved && shown) attached.push(shown);
      }
      if (attached.length > 0) created = { ...created, type: 'image', images: attached, imageUrl: attached[0] };
      const failed = urls.length - attached.length;
      if (failed > 0) showToast(`${failed} of ${urls.length} images were not attached`);
    } else if (type === 'video' && _extraData?.videoUrl) {
      // Persist the upload as a post-media row, then show it on the optimistic post.
      const url: string = _extraData.videoUrl;
      try {
        const res = await postsApi.POST('/api/post-medias', {
          body: { postId: data.id, fileUrl: url, mediaType: 'video', position: 0 },
        });
        if (res.response.ok && res.data) {
          created = { ...created, type: 'video', videoUrl: mediaUrl(url) };
        } else {
          showToast(describeApiError(res.error, res.response, 'Your post was saved without its media'));
        }
      } catch (err) {
        showToast(messageOf(err, 'Your post was saved without its media'));
      }
    }
    return created;
  };

  // Show a post I just created at the top of my home feed and of my own profile timeline.
  // Used by createPost, and by a community post (which arrives with its community link).
  const addToFeed = (created: Post) => {
    setPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
    setTimeline((t) => (t && t.userId === currentUser.id ? { ...t, posts: [created, ...t.posts.filter((p) => p.id !== created.id)] } : t));
  };

  // Create a post and place it where the target says (M9). The post row and its attachments
  // come first; a community or organization then gets its post-feed link. A refused link
  // deletes the just-created post again (best-effort), so no orphan post stays in my feed,
  // and the promise rejects with the reason so the composer keeps the text.
  // A community or organization post is shown at the top of Home and of my profile, with its
  // link (the community or organization name after "›").
  const createPostIn = async (
    target: PostTarget,
    content: string,
    type: 'text' | 'link' | 'image' | 'video' | 'poll',
    extra?: any,
  ): Promise<Post> => {
    const created = await createPostRaw(content, type, extra);
    if (target.kind !== 'home') {
      const linkError = await postsApi.POST('/api/post-feeds', {
        body: { postId: created.id, feedType: target.kind, targetId: target.id },
      }).then(
        (res) => (res.response.ok ? null : describeApiError(res.error, res.response, 'Your post was not added to the community')),
        (err) => messageOf(err, 'Your post was not added to the community'),
      );
      if (linkError) {
        deletePost(created.id).catch(() => {});
        throw new Error(linkError);
      }
    }
    if (target.kind === 'group') {
      const placed: Post = { ...created, groupId: target.id, groupName: target.name };
      addToFeed(placed);
      return placed;
    }
    if (target.kind === 'organization') {
      const placed: Post = { ...created, organizationId: target.id, organizationName: target.name };
      addToFeed(placed);
      return placed;
    }
    if (target.kind === 'home') {
      addToFeed(created);
      // Reconcile with the server's composed view (ordering, counts) without blocking the UI.
      loadFeed().catch(() => {});
    }
    return created;
  };

  // Shows a community's posts (already mapped to the UI shape) and enriches them in place.
  // A newer call for another community replaces this one; a late enrichment is dropped.
  const setGroupFeed = (groupId: string, mapped: Post[]) => {
    const seq = ++groupSeq.current;
    setGroupFeedState({ groupId, posts: mapped });
    enrichAll(mapped, { list: 'group', groupId, seq });
  };

  // Shows an organization's posts (already mapped to the UI shape) and enriches them in place
  // (M11). A newer call for another organization replaces this one; a late enrichment is dropped.
  const setOrganizationFeed = (organizationId: string, mapped: Post[]) => {
    const seq = ++organizationSeq.current;
    setOrganizationFeedState({ organizationId, posts: mapped });
    enrichAll(mapped, { list: 'organization', organizationId, seq });
  };

  // Persist through the Engagement API (userId bound from the JWT) and keep the
  // optimistic count update. Clicking the active reaction removes it; clicking a
  // different one swaps (delete old + create new) so a user holds one reaction.
  const reactToPost = (postId: string, reactionType: keyof Reactions) => {
    const previousReaction = findPost(postId)?.currentUserReaction ?? null;
    const previousId = myReactionIds.current.get(postId);
    const removing = previousReaction === reactionType;

    updatePost(postId, (p) => {
      const reactions = { ...p.reactions };
      if (previousReaction) reactions[previousReaction] = Math.max(0, reactions[previousReaction] - 1);
      if (!removing) reactions[reactionType] += 1;
      return { ...p, reactions, currentUserReaction: removing ? null : reactionType };
    });

    (async () => {
      // Whether the old reaction is already gone on the server, so a failure can be undone exactly.
      let previousRemoved = !previousId;
      try {
        if (previousId) {
          const del = await engagementApi.DELETE('/api/reactions/{id}', { params: { path: { id: previousId } } });
          if (!del.response.ok) throw new Error(describeApiError(del.error, del.response, 'Your reaction was not removed'));
          myReactionIds.current.delete(postId);
          previousRemoved = true;
        }
        if (!removing) {
          // openapi-fetch resolves on HTTP errors instead of throwing, so check the response.
          const { data, error, response } = await engagementApi.POST('/api/reactions', {
            body: { targetType: 'Post', targetId: postId, reactionType },
          });
          if (!data) throw new Error(describeApiError(error, response, 'Your reaction was not saved'));
          myReactionIds.current.set(postId, data.id);
        }
      } catch (err) {
        showToast(messageOf(err, 'Your reaction was not saved'));
        // Undo the optimistic change in every list (home, timeline, community) to what the
        // server now holds: the new reaction was not saved; the old one is gone only if its
        // DELETE went through.
        updatePost(postId, (p) => {
          const reactions = { ...p.reactions };
          if (!removing) reactions[reactionType] = Math.max(0, reactions[reactionType] - 1);
          if (previousReaction && !previousRemoved) reactions[previousReaction] += 1;
          return { ...p, reactions, currentUserReaction: previousRemoved ? null : previousReaction };
        });
        // Then re-read the server's tallies where a loader exists.
        loadFeed().catch(() => {});
        if (timeline?.posts.some((p) => p.id === postId)) loadTimeline(timeline.userId).catch(() => {});
      }
    })();
  };

  // Persist through the Engagement API (sharerId bound from the JWT), optimistically
  // bump the count.
  // Resolves once the server has accepted the share. On failure the count rolls back, a toast
  // shows the reason, and the promise rejects so the share dialog stays open with the text.
  const sharePost = async (postId: string, commentary?: string): Promise<void> => {
    const text = commentary?.trim() || null;
    updatePost(postId, (p) => ({ ...p, sharesCount: p.sharesCount + 1 }));
    try {
      const { error, response } = await engagementApi.POST('/api/shares', {
        body: { targetType: 'Post', targetId: postId, commentary: text },
      });
      if (!response.ok) throw new Error(describeApiError(error, response, 'The post was not shared'));
    } catch (err) {
      updatePost(postId, (p) => ({ ...p, sharesCount: Math.max(0, p.sharesCount - 1) }));
      const message = messageOf(err, 'The post was not shared');
      showToast(message);
      throw new Error(message);
    }
  };

  const votePoll = (postId: string, optionId: string) => {
    updatePost(postId, (post) => {
      if (!post.poll) return post;
      const alreadyVoted = post.poll.userVotedOptionId;
      if (alreadyVoted === optionId) return post; // No duplicate votes

      const updatedOptions = post.poll.options.map((opt) => {
        let change = 0;
        if (opt.id === optionId) change = 1;
        else if (opt.id === alreadyVoted) change = -1;
        return { ...opt, votes: opt.votes + change };
      });

      return {
        ...post,
        poll: {
          ...post.poll,
          options: updatedOptions,
          totalVotes: post.poll.totalVotes + (alreadyVoted ? 0 : 1),
          userVotedOptionId: optionId,
        },
      };
    });
  };

  // Comment through the Engagement API (polymorphic target: a Post), then append
  // optimistically to the thread. authorId is bound from the JWT on the server.
  // A reply passes the id of the comment it answers as parentCommentId. Rejects with a
  // readable message when the server does not accept the comment, so the composer keeps the text.
  const addComment = async (postId: string, content: string, parentCommentId: string | null = null): Promise<void> => {
    const { data, error, response } = await engagementApi.POST('/api/comments', {
      body: { targetType: 'Post', targetId: postId, parentCommentId, body: content },
    });
    if (!data) throw new Error(describeApiError(error, response, 'Your comment was not posted'));
    const post = findPost(postId);
    const newComment: Comment = {
      id: data.id,
      authorId: currentUser.id,
      author: { name: currentUser.name, handle: currentUser.handle, avatar: currentUser.avatar },
      content,
      createdAt: 'Just now',
      parentCommentId,
      likes: 0,
      likedByMe: false,
    };
    updatePost(postId, (p) => ({ ...p, comments: [...p.comments, newComment] }));
    // A reply notifies the author of the comment it answers; a comment notifies the post's
    // author. Both are no-ops for my own content.
    if (parentCommentId) {
      notify(findComment(postId, parentCommentId)?.authorId, 'comment', 'Comment', parentCommentId);
    } else {
      notify(post?.authorId, 'comment', 'Post', postId);
    }
  };

  // Like or unlike a comment (Engagement reactions with targetType 'Comment'). Optimistic;
  // on failure the like rolls back and a toast shows the reason. Never rejects.
  const toggleCommentLike = async (postId: string, commentId: string): Promise<void> => {
    const current = findComment(postId, commentId);
    if (!current || pendingCommentLikes.current.has(commentId)) return;
    const wasLiked = !!current.likedByMe;
    const previousLikes = current.likes ?? 0;
    const previousId = myCommentReactionIds.current.get(commentId);

    pendingCommentLikes.current.add(commentId);
    updateComment(postId, commentId, (c) => ({
      ...c,
      likedByMe: !wasLiked,
      likes: Math.max(0, previousLikes + (wasLiked ? -1 : 1)),
    }));
    try {
      if (wasLiked) {
        if (!previousId) throw new Error('Your like was not removed: reload the comments and try again');
        const { error, response } = await engagementApi.DELETE('/api/reactions/{id}', { params: { path: { id: previousId } } });
        if (!response.ok) throw new Error(describeApiError(error, response, 'Your like was not removed'));
        myCommentReactionIds.current.delete(commentId);
      } else {
        const { data, error, response } = await engagementApi.POST('/api/reactions', {
          body: { targetType: 'Comment', targetId: commentId, reactionType: 'like' },
        });
        if (!data) throw new Error(describeApiError(error, response, 'Your like was not saved'));
        myCommentReactionIds.current.set(commentId, data.id);
      }
    } catch (err) {
      updateComment(postId, commentId, (c) => ({ ...c, likedByMe: wasLiked, likes: previousLikes }));
      showToast(messageOf(err, 'Your like was not saved'));
    } finally {
      pendingCommentLikes.current.delete(commentId);
    }
  };

  // Delete my post (Posts module). On success the post leaves the feed and any timeline, and
  // its media and post-feed rows (same module) are removed best-effort. Engagement rows (comments,
  // reactions, shares) are left to the Engagement module's event consumer (track B, B6),
  // never deleted from here.
  const deletePost = async (postId: string): Promise<void> => {
    const { error, response } = await postsApi.DELETE('/api/posts/{id}', { params: { path: { id: postId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The post was not deleted'));
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTimeline((t) => (t ? { ...t, posts: t.posts.filter((p) => p.id !== postId) } : t));
    setGroupFeedState((g) => (g ? { ...g, posts: g.posts.filter((p) => p.id !== postId) } : g));
    setOrganizationFeedState((o) => (o ? { ...o, posts: o.posts.filter((p) => p.id !== postId) } : o));
    myReactionIds.current.delete(postId);
    deletePostMedia(postId).catch(() => {});
    deletePostFeeds(postId).catch(() => {});
  };

  // Attachments are separate post-media rows; they are invisible orphans if left behind,
  // so each failure is ignored on purpose.
  const deletePostMedia = async (postId: string) => {
    const { data } = await postsApi.GET('/api/post-medias');
    if (!data) return;
    await Promise.all(
      data
        .filter((m) => m.postId === postId)
        .map((m) => postsApi.DELETE('/api/post-medias/{id}', { params: { path: { id: m.id } } }).catch(() => {})),
    );
  };

  // The post-feed rows that link a deleted post to a community or organization (M9). Left
  // behind they point at a post that no longer exists, so they are removed best-effort: a
  // failure here never fails the delete itself.
  const deletePostFeeds = async (postId: string) => {
    const { data } = await postsApi.GET('/api/post-feeds');
    if (!data) return;
    await Promise.all(
      data
        .filter((f) => f.postId === postId)
        .map((f) => postsApi.DELETE('/api/post-feeds/{id}', { params: { path: { id: f.id } } }).catch(() => {})),
    );
  };

  // Delete my comment (Engagement module). A comment with replies stays in the thread as a
  // "Comment deleted" placeholder, so its replies are not orphaned; the server does not cascade.
  const deleteComment = async (postId: string, commentId: string): Promise<void> => {
    const { error, response } = await engagementApi.DELETE('/api/comments/{id}', { params: { path: { id: commentId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The comment was not deleted'));
    myCommentReactionIds.current.delete(commentId);
    const hasReplies = (findPost(postId)?.comments ?? []).some((c) => c.parentCommentId === commentId);
    updatePost(postId, (p) => ({
      ...p,
      comments: hasReplies
        ? p.comments.map((c) => (c.id === commentId
          ? { ...c, authorId: undefined, content: '', likes: 0, likedByMe: false, deleted: true }
          : c))
        : p.comments.filter((c) => c.id !== commentId),
    }));
  };

  // Forget the previous account's cached posts (used when the signed-in user changes).
  const reset = () => {
    myReactionIds.current.clear();
    myCommentReactionIds.current.clear();
    timelineSeq.current += 1; // drop any timeline response still in flight
    groupSeq.current += 1; // and any community response
    organizationSeq.current += 1; // and any organization response
    setTimeline(null);
    setGroupFeedState(null);
    setOrganizationFeedState(null);
    setPosts([]);
  };

  // loadTimeline is handed to effects as a dependency, so its identity must not change on
  // every render (a load re-renders, which would re-run the effect and load again forever).
  const loadTimelineLatest = useRef(loadTimeline);
  loadTimelineLatest.current = loadTimeline;
  const stableLoadTimeline = useCallback((userId: string) => loadTimelineLatest.current(userId), []);

  return {
    posts,
    timeline,
    loadFeed,
    loadTimeline: stableLoadTimeline,
    groupFeed,
    setGroupFeed,
    organizationFeed,
    setOrganizationFeed,
    createPostRaw,
    createPostIn,
    addToFeed,
    addPost,
    reactToPost,
    sharePost,
    votePoll,
    addComment,
    toggleCommentLike,
    deletePost,
    deleteComment,
    reset,
  };
}
