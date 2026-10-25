import { useState, type MutableRefObject } from 'react';
import { reelsApi, getProfile, describeApiError } from '../api/gateway';

/** A reel (generated Reels module) joined with its resolved creator profile. */
export interface Reel {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  videoUrl: string;
  caption: string;
  duration: number;
}

interface Deps {
  myUserId: MutableRefObject<string>;
}

const DEFAULT_AVATAR = (seed: string) => `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;

/**
 * Reels (generated Reels module): short-form video. CRUD over /api/reels; a view is
 * recorded through /api/reel-views. creatorId/viewerId aren't JWT-bound on this v0
 * module, so we pass our own id.
 */
export function useReels({ myUserId }: Deps) {
  const [reels, setReels] = useState<Reel[]>([]);
  // True until the first reels load settles, so the feed can show a skeleton.
  const [loading, setLoading] = useState(true);

  const loadReels = async () => {
    try {
      await fetchReels();
    } finally {
      setLoading(false);
    }
  };

  const fetchReels = async () => {
    const { data } = await reelsApi.GET('/api/reels');
    if (!data) return;
    const creatorIds = [...new Set(data.map((r) => r.creatorId))];
    const profiles = await Promise.all(creatorIds.map((id) => getProfile(id).catch(() => null)));
    const profileById = new Map(creatorIds.map((id, i) => [id, profiles[i]]));
    setReels(
      data.map((r) => {
        const p = profileById.get(r.creatorId);
        return {
          id: r.id,
          creatorId: r.creatorId,
          creatorName: p?.displayName || 'Member',
          creatorAvatar: p?.avatarUrl ?? DEFAULT_AVATAR(r.creatorId),
          videoUrl: r.videoUrl,
          caption: r.caption ?? '',
          duration: Number(r.duration) || 0,
        };
      }),
    );
  };

  /**
   * Publish a reel. `videoUrl` is the root-relative url returned by the media upload and
   * `duration` is the whole-second length of the video. Throws on a rejected request so
   * the caller can show the error instead of silently dropping the reel.
   */
  const addReel = async (videoUrl: string, caption: string, duration: number) => {
    const { data, error } = await reelsApi.POST('/api/reels', {
      body: {
        creatorId: myUserId.current,
        videoUrl,
        caption: caption || null,
        duration: Math.max(1, Math.round(duration)),
        visibility: 'public',
        musicTrackId: null,
      },
    });
    if (!data) throw new Error(`Could not publish the reel${error ? ' (the server rejected it)' : ''}.`);
    await loadReels().catch(() => {});
  };

  // Delete my reel. Rejects with a readable message so the player can keep it on screen.
  const deleteReel = async (reelId: string): Promise<void> => {
    const { error, response } = await reelsApi.DELETE('/api/reels/{id}', { params: { path: { id: reelId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The reel was not deleted'));
    setReels((prev) => prev.filter((r) => r.id !== reelId));
  };

  const viewReel = (reelId: string) => {
    reelsApi
      .POST('/api/reel-views', {
        body: { reelId, viewerId: myUserId.current, viewedAt: new Date().toISOString() },
      })
      .catch(() => {});
  };

  return { reels, loading, loadReels, addReel, viewReel, deleteReel };
}
