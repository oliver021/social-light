import { useState, type MutableRefObject } from 'react';
import { storiesApi, getProfile, describeApiError, messageOf } from '../api/gateway';
import { defaultAvatar, withHandle } from '../api/mappers';

/** A story (generated Stories module) joined with its resolved author profile. */
export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  mediaType: string;
  mediaUrl: string;
  caption: string;
  /** ISO time after which the story is no longer shown (24 h after it was shared). */
  expiresAt: string;
}

/** One author's live stories, oldest first, for the stories bar and the viewer. */
export interface StoryGroup {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  stories: Story[];
}

/** A reply to a story, with the replier's profile resolved. */
export interface StoryReply {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  handle: string;
}

interface Deps {
  myUserId: MutableRefObject<string>;
  /** Records a notification for another user (from useNotifications). */
  notify: (recipientId: string | undefined, type: string, entityType: string, entityId: string) => void;
}

export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** A story is live until its expiry time. An unreadable expiry is kept, not hidden. */
export function isLive(story: Pick<Story, 'expiresAt'>, now = Date.now()): boolean {
  const expires = Date.parse(story.expiresAt);
  return Number.isNaN(expires) || expires > now;
}

/**
 * Live stories grouped by author. Authors: me first, then the others by their newest story.
 * Each author's stories run oldest first, so the viewer shows them in the order they were shared.
 */
export function groupStoriesByAuthor(stories: Story[], myId: string, now = Date.now()): StoryGroup[] {
  const byAuthor = new Map<string, StoryGroup>();
  for (const s of stories) {
    if (!isLive(s, now)) continue;
    let group = byAuthor.get(s.authorId);
    if (!group) {
      group = { authorId: s.authorId, authorName: s.authorName, authorAvatar: s.authorAvatar, stories: [] };
      byAuthor.set(s.authorId, group);
    }
    group.stories.push(s);
  }
  const expiry = (s: Story) => Date.parse(s.expiresAt) || 0;
  for (const group of byAuthor.values()) group.stories.sort((a, b) => expiry(a) - expiry(b));
  const newest = (group: StoryGroup) => Math.max(...group.stories.map(expiry));
  return [...byAuthor.values()].sort((a, b) => {
    if (a.authorId === myId) return -1;
    if (b.authorId === myId) return 1;
    return newest(b) - newest(a);
  });
}

const DEFAULT_AVATAR = (seed: string) => `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;

/**
 * Stories (generated Stories module): ephemeral media posts. CRUD over /api/stories;
 * a view is recorded through /api/story-views; replies through /api/story-replies. The
 * author and viewer ids are not JWT-bound on this v0 module, so we pass our own id.
 */
export function useStories({ myUserId, notify }: Deps) {
  const [stories, setStories] = useState<Story[]>([]);

  const loadStories = async () => {
    const { data } = await storiesApi.GET('/api/stories');
    if (!data) return;
    const live = data.filter((s) => isLive({ expiresAt: s.expiresAt }));
    const authorIds = [...new Set(live.map((s) => s.authorId))];
    const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
    const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));
    setStories(
      live.map((s) => {
        const p = profileById.get(s.authorId);
        return {
          id: s.id,
          authorId: s.authorId,
          authorName: p?.displayName || 'Member',
          authorAvatar: p?.avatarUrl ?? DEFAULT_AVATAR(s.authorId),
          mediaType: s.mediaType,
          mediaUrl: s.mediaUrl,
          caption: s.caption ?? '',
          expiresAt: s.expiresAt,
        };
      }),
    );
  };

  // Share a story (image or video, expires in 24h). Rejects with a readable message so the
  // dialog stays open with the reason; reloads the list on success.
  const addStory = async (mediaUrl: string, caption: string, mediaType: 'image' | 'video' = 'image'): Promise<void> => {
    const expiresAt = new Date(Date.now() + STORY_LIFETIME_MS).toISOString();
    let result;
    try {
      result = await storiesApi.POST('/api/stories', {
        body: {
          authorId: myUserId.current,
          mediaType,
          mediaUrl,
          caption: caption || null,
          visibility: 'public',
          expiresAt,
        },
      });
    } catch (err) {
      throw new Error(messageOf(err, 'Your story was not shared'));
    }
    if (!result.response.ok) throw new Error(describeApiError(result.error, result.response, 'Your story was not shared'));
    loadStories().catch(() => {});
  };

  // Delete my story. Rejects with a readable message so the viewer can keep it open.
  const deleteStory = async (storyId: string): Promise<void> => {
    const { error, response } = await storiesApi.DELETE('/api/stories/{id}', { params: { path: { id: storyId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The story was not deleted'));
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  // Record that this user viewed a story (fire-and-forget).
  const viewStory = (storyId: string) => {
    storiesApi
      .POST('/api/story-views', {
        body: { storyId, viewerId: myUserId.current, viewedAt: new Date().toISOString() },
      })
      .catch(() => {});
  };

  // Reply to a story. Rejects with "Your reply was not sent" (plus the server's reason) so the
  // reply box keeps the text. On success the author is notified.
  const replyToStory = async (storyId: string, body: string): Promise<void> => {
    let result;
    try {
      result = await storiesApi.POST('/api/story-replies', {
        body: { storyId, userId: myUserId.current, body: body.trim() },
      });
    } catch (err) {
      throw new Error(messageOf(err, 'Your reply was not sent'));
    }
    if (!result.response.ok) throw new Error(describeApiError(result.error, result.response, 'Your reply was not sent'));
    notify(stories.find((s) => s.id === storyId)?.authorId, 'story_reply', 'Story', storyId);
  };

  // The replies to one story, oldest first as the server lists them, with each replier resolved
  // through Profile. Rejects with a readable message when the list cannot be read.
  const loadReplies = async (storyId: string): Promise<StoryReply[]> => {
    const { data, error, response } = await storiesApi.GET('/api/story-replies');
    if (!data) throw new Error(describeApiError(error, response, 'Replies could not be loaded'));
    const mine = data.filter((r) => r.storyId === storyId);
    const authorIds = [...new Set(mine.map((r) => r.userId))];
    const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
    const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));
    return mine.map((r) => {
      const p = profileById.get(r.userId);
      return {
        id: r.id,
        body: r.body,
        authorId: r.userId,
        authorName: p?.displayName || 'Member',
        authorAvatar: p?.avatarUrl ?? defaultAvatar(r.userId),
        handle: withHandle(p?.handle),
      };
    });
  };

  // Forget the previous account's stories (used when the signed-in user changes).
  const reset = () => setStories([]);

  return { stories, loadStories, addStory, viewStory, deleteStory, replyToStory, loadReplies, reset };
}
