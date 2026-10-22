import { useRef, type MutableRefObject } from 'react';
import { UserProfile, Post, Reactions } from '../types';
import { postsApi, engagementApi, feedApi, getProfile, mediaUrl } from '../api/gateway';
import { feedItemToPost, newPostToPost, commentDtoToComment, toReactionKey, emptyReactions } from '../api/mappers';
import { usePersistentState } from './usePersistentState';

interface Deps {
  myUserId: MutableRefObject<string>;
  currentUser: UserProfile;
  /** Record a notification for another user (from useNotifications). */
  notify: (recipientId: string | undefined, type: string, entityType: string, entityId: string) => void;
}

/**
 * The home feed and everything that mutates a post: create, react, share, vote,
 * comment. The feed is composed server-side (Feed.API) in one call; engagement
 * counts/threads/own-reactions are folded in afterwards from the Engagement module
 * (which has no per-target query in v0, so each is a fetch-all + group-by-post).
 */
export function useFeed({ myUserId, currentUser, notify }: Deps) {
  const [posts, setPosts] = usePersistentState<Post[]>('nexus_posts', () => []);
  // Maps a postId -> the current user's reaction id on it, so a toggle can DELETE it.
  const myReactionIds = useRef<Map<string, string>>(new Map());

  const loadFeed = async () => {
    const { data } = await feedApi.GET('/api/feed/home');
    if (!data) return;
    const mapped = data.map(feedItemToPost);
    setPosts(mapped);
    // Fold real comment threads + reaction tallies in afterwards so the feed paints
    // immediately and the (slower) engagement + author-profile resolution happens in
    // the background.
    enrichComments(mapped).catch(() => {});
    enrichReactions(mapped).catch(() => {});
    enrichShares(mapped).catch(() => {});
    enrichMedia(mapped).catch(() => {});
  };

  // The feed DTO carries no media; attachments are a separate Posts resource
  // (`post-medias`). Same fetch-all + group-by-post pattern as comments/reactions.
  const enrichMedia = async (forPosts: Post[]) => {
    const postIds = new Set(forPosts.map((p) => p.id));
    const { data } = await postsApi.GET('/api/post-medias');
    if (!data) return;
    const first = new Map<string, { fileUrl: string; mediaType: string; position: number }>();
    for (const m of data) {
      if (!postIds.has(m.postId)) continue;
      const position = Number(m.position) || 0;
      const cur = first.get(m.postId);
      if (!cur || position < cur.position) first.set(m.postId, { fileUrl: m.fileUrl, mediaType: m.mediaType, position });
    }
    if (first.size === 0) return;
    setPosts((prev) =>
      prev.map((p) => {
        const m = first.get(p.id);
        if (!m) return p;
        const isVideo = /video/i.test(m.mediaType);
        return isVideo
          ? { ...p, type: 'video', videoUrl: mediaUrl(m.fileUrl) }
          : { ...p, type: 'image', imageUrl: mediaUrl(m.fileUrl) };
      }),
    );
  };

  // Same global-list pattern as comments/reactions: hydrate each post's share count.
  const enrichShares = async (forPosts: Post[]) => {
    const postIds = new Set(forPosts.map((p) => p.id));
    const { data } = await engagementApi.GET('/api/shares');
    if (!data) return;
    const counts = new Map<string, number>();
    for (const s of data) {
      if (s.targetType !== 'Post' || !postIds.has(s.targetId)) continue;
      counts.set(s.targetId, (counts.get(s.targetId) ?? 0) + 1);
    }
    setPosts((prev) => prev.map((p) => ({ ...p, sharesCount: counts.get(p.id) ?? 0 })));
  };

  // Fetch all reactions once, group by post into per-kind tallies, and record THIS
  // user's own reaction (+ its id, kept in myReactionIds so a later toggle can DELETE it).
  const enrichReactions = async (forPosts: Post[]) => {
    const postIds = new Set(forPosts.map((p) => p.id));
    const { data } = await engagementApi.GET('/api/reactions');
    if (!data) return;
    const relevant = data.filter((r) => r.targetType === 'Post' && postIds.has(r.targetId));

    const myId = myUserId.current;
    const tallies = new Map<string, ReturnType<typeof emptyReactions>>();
    const mine = new Map<string, keyof ReturnType<typeof emptyReactions>>();
    myReactionIds.current.clear();
    for (const r of relevant) {
      const key = toReactionKey(r.reactionType);
      const tally = tallies.get(r.targetId) ?? emptyReactions();
      tally[key] += 1;
      tallies.set(r.targetId, tally);
      if (r.userId === myId) {
        mine.set(r.targetId, key);
        myReactionIds.current.set(r.targetId, r.id);
      }
    }
    setPosts((prev) =>
      prev.map((p) =>
        tallies.has(p.id)
          ? { ...p, reactions: tallies.get(p.id)!, currentUserReaction: mine.get(p.id) ?? null }
          : { ...p, reactions: emptyReactions(), currentUserReaction: null },
      ),
    );
  };

  // ListComments returns every comment; fetch once, group by post, and resolve each
  // distinct author through the cached Profile lookup. Best-effort.
  const enrichComments = async (forPosts: Post[]) => {
    const postIds = new Set(forPosts.map((p) => p.id));
    const { data } = await engagementApi.GET('/api/comments');
    if (!data) return;
    const relevant = data.filter((c) => c.targetType === 'Post' && postIds.has(c.targetId));
    if (relevant.length === 0) return;

    const authorIds = [...new Set(relevant.map((c) => c.authorId))];
    const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
    const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));

    const byPost = new Map<string, ReturnType<typeof commentDtoToComment>[]>();
    for (const c of relevant) {
      const list = byPost.get(c.targetId) ?? [];
      list.push(commentDtoToComment(c, profileById.get(c.authorId) ?? null));
      byPost.set(c.targetId, list);
    }
    setPosts((prev) =>
      prev.map((p) => (byPost.has(p.id) ? { ...p, comments: byPost.get(p.id)! } : p)),
    );
  };

  // Create through Posts API (authorId bound from the JWT, not the body), prepend
  // optimistically, then refresh the composed feed in the background.
  const addPost = async (content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', _extraData?: any) => {
    const { data } = await postsApi.POST('/api/posts', {
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
    if (data) {
      let created = newPostToPost(data, currentUser);
      const attachment: { mediaType: 'image' | 'video'; url: string } | null =
        type === 'image' && _extraData?.imageUrl ? { mediaType: 'image', url: _extraData.imageUrl }
        : type === 'video' && _extraData?.videoUrl ? { mediaType: 'video', url: _extraData.videoUrl }
        : null;
      if (attachment) {
        // Persist the upload as a post-media row, then show it on the optimistic post.
        const res = await postsApi.POST('/api/post-medias', {
          body: { postId: data.id, fileUrl: attachment.url, mediaType: attachment.mediaType, position: 0 },
        });
        if (res.data) {
          created = attachment.mediaType === 'video'
            ? { ...created, type: 'video', videoUrl: mediaUrl(attachment.url) }
            : { ...created, type: 'image', imageUrl: mediaUrl(attachment.url) };
        }
      }
      setPosts((prev) => [created, ...prev]);
      // Reconcile with the server's composed view (ordering, counts) without blocking the UI.
      loadFeed().catch(() => {});
    }
  };

  // Persist through the Engagement API (userId bound from the JWT) and keep the
  // optimistic count update. Clicking the active reaction removes it; clicking a
  // different one swaps (delete old + create new) so a user holds one reaction.
  const reactToPost = (postId: string, reactionType: keyof Reactions) => {
    const post = posts.find((p) => p.id === postId);
    const previousReaction = post?.currentUserReaction ?? null;
    const previousId = myReactionIds.current.get(postId);
    const removing = previousReaction === reactionType;

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id !== postId) return p;
        const reactions = { ...p.reactions };
        if (previousReaction) reactions[previousReaction] = Math.max(0, reactions[previousReaction] - 1);
        if (!removing) reactions[reactionType] += 1;
        return { ...p, reactions, currentUserReaction: removing ? null : reactionType };
      }),
    );

    (async () => {
      try {
        if (previousId) {
          await engagementApi.DELETE('/api/reactions/{id}', { params: { path: { id: previousId } } });
          myReactionIds.current.delete(postId);
        }
        if (!removing) {
          const { data } = await engagementApi.POST('/api/reactions', {
            body: { targetType: 'Post', targetId: postId, reactionType },
          });
          if (data) myReactionIds.current.set(postId, data.id);
        }
      } catch {
        /* leave optimistic state; a feed reload reconciles */
      }
    })();
  };

  // Persist through the Engagement API (sharerId bound from the JWT), optimistically
  // bump the count.
  const sharePost = (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p)));
    (async () => {
      try {
        await engagementApi.POST('/api/shares', {
          body: { targetType: 'Post', targetId: postId, commentary: null },
        });
      } catch {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, sharesCount: Math.max(0, p.sharesCount - 1) } : p)));
      }
    })();
  };

  const votePoll = (postId: string, optionId: string) => {
    setPosts((prevPosts) => {
      return prevPosts.map((post) => {
        if (post.id === postId && post.poll) {
          let alreadyVoted = post.poll.userVotedOptionId;
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
              userVotedOptionId: optionId
            }
          };
        }
        return post;
      });
    });
  };

  // Comment through the Engagement API (polymorphic target: a Post), then append
  // optimistically to the thread. authorId is bound from the JWT on the server.
  const addComment = async (postId: string, content: string) => {
    const { data } = await engagementApi.POST('/api/comments', {
      body: { targetType: 'Post', targetId: postId, parentCommentId: null, body: content },
    });
    if (!data) return;
    const newComment = {
      id: data.id,
      author: { name: currentUser.name, handle: currentUser.handle, avatar: currentUser.avatar },
      content,
      createdAt: 'Just now',
    };
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, comments: [...post.comments, newComment] } : post,
      ),
    );
    // Notify the post's author that I commented (no-op if it's my own post).
    notify(posts.find((p) => p.id === postId)?.authorId, 'comment', 'Post', postId);
  };

  return { posts, loadFeed, addPost, reactToPost, sharePost, votePoll, addComment };
}
