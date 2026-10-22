import { useState, type MutableRefObject } from 'react';
import { storiesApi, getProfile } from '../api/gateway';

/** A story (generated Stories module) joined with its resolved author profile. */
export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  mediaType: string;
  mediaUrl: string;
  caption: string;
}

interface Deps {
  myUserId: MutableRefObject<string>;
}

const DEFAULT_AVATAR = (seed: string) => `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;

/**
 * Stories (generated Stories module): ephemeral media posts. CRUD over /api/stories;
 * a view is recorded through /api/story-views. authorId/viewerId aren't JWT-bound on
 * this v0 module, so we pass our own id.
 */
export function useStories({ myUserId }: Deps) {
  const [stories, setStories] = useState<Story[]>([]);

  const loadStories = async () => {
    const { data } = await storiesApi.GET('/api/stories');
    if (!data) return;
    const authorIds = [...new Set(data.map((s) => s.authorId))];
    const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
    const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));
    setStories(
      data.map((s) => {
        const p = profileById.get(s.authorId);
        return {
          id: s.id,
          authorId: s.authorId,
          authorName: p?.displayName || 'Member',
          authorAvatar: p?.avatarUrl ?? DEFAULT_AVATAR(s.authorId),
          mediaType: s.mediaType,
          mediaUrl: s.mediaUrl,
          caption: s.caption ?? '',
        };
      }),
    );
  };

  // Create a story (expires in 24h). Optimistic prepend, then reconcile from the server.
  const addStory = async (mediaUrl: string, caption: string) => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data } = await storiesApi.POST('/api/stories', {
      body: {
        authorId: myUserId.current,
        mediaType: 'image',
        mediaUrl,
        caption: caption || null,
        visibility: 'public',
        expiresAt,
      },
    });
    if (data) loadStories().catch(() => {});
  };

  // Record that this user viewed a story (fire-and-forget).
  const viewStory = (storyId: string) => {
    storiesApi
      .POST('/api/story-views', {
        body: { storyId, viewerId: myUserId.current, viewedAt: new Date().toISOString() },
      })
      .catch(() => {});
  };

  return { stories, loadStories, addStory, viewStory };
}
