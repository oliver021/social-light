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

/** Where an enrichment result lands: the home feed, or the timeline it was loaded for. */
type Target = { list: 'feed' } | { list: 'timeline'; userId: string; seq: number };

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
  };

  const findPost = (postId: string): Post | undefined =>
    posts.find((p) => p.id === postId) ?? timeline?.posts.find((p) => p.id === postId);

  // Apply enrichment results to the list they were loaded for. A timeline result is dropped
  // when that timeline was replaced while the request was in flight.
  const commit = (target: Target, patch: PostPatch | PostPatch[] | null) => {
    const patches = patch === null ? [] : Array.isArray(patch) ? patch : [patch];
    if (patches.length === 0) return;
    if (target.list === 'feed') {
      setPosts((prev) => applyPatches(prev, patches));
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

  // Create through Posts API (authorId bound from the JWT, not the body), prepend
  // optimistically, then refresh the composed feed in the background.
  const addPost = async (content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', _extraData?: any) => {
    try {
      await createPost(content, type, _extraData);
    } catch (err) {
      showToast(messageOf(err, 'Your post was not published'));
    }
  };

  const createPost = async (content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', _extraData?: any) => {
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
        const res = await postsApi.POST('/api/post-medias', {
          body: { postId: data.id, fileUrl: url, mediaType: 'image', position },
        });
        const shown = mediaUrl(url);
        if (res.response.ok && res.data && shown) attached.push(shown);
      }
      if (attached.length > 0) created = { ...created, type: 'image', images: attached, imageUrl: attached[0] };
      const failed = urls.length - attached.length;
      if (failed > 0) showToast(`${failed} of ${urls.length} images were not attached`);
    } else if (type === 'video' && _extraData?.videoUrl) {
      // Persist the upload as a post-media row, then show it on the optimistic post.
      const url: string = _extraData.videoUrl;
      const res = await postsApi.POST('/api/post-medias', {
        body: { postId: data.id, fileUrl: url, mediaType: 'video', position: 0 },
      });
      if (res.response.ok && res.data) {
        created = { ...created, type: 'video', videoUrl: mediaUrl(url) };
      } else {
        showToast(describeApiError(res.error, res.response, 'Your post was saved without its media'));
      }
    }
    setPosts((prev) => [created, ...prev]);
    // My own new post also shows at the top of my profile timeline.
    setTimeline((t) => (t && t.userId === currentUser.id ? { ...t, posts: [created, ...t.posts] } : t));
    // Reconcile with the server's composed view (ordering, counts) without blocking the UI.
    loadFeed().catch(() => {});
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
      try {
        if (previousId) {
          const del = await engagementApi.DELETE('/api/reactions/{id}', { params: { path: { id: previousId } } });
          if (!del.response.ok) throw new Error(describeApiError(del.error, del.response, 'Your reaction was not removed'));
          myReactionIds.current.delete(postId);
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
        // Re-read the server's tallies so the optimistic count does not stay wrong, in the
        // home feed and in the profile timeline the post came from.
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
  // its media rows (same module) are removed best-effort. Engagement rows (comments,
  // reactions, shares) are left to the Engagement module's event consumer (track B, B6),
  // never deleted from here.
  const deletePost = async (postId: string): Promise<void> => {
    const { error, response } = await postsApi.DELETE('/api/posts/{id}', { params: { path: { id: postId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The post was not deleted'));
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTimeline((t) => (t ? { ...t, posts: t.posts.filter((p) => p.id !== postId) } : t));
    myReactionIds.current.delete(postId);
    deletePostMedia(postId).catch(() => {});
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
    setTimeline(null);
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
