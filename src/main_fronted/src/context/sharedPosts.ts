// The posts one person has shared (M3), for their profile's "Shared" section. Engagement lists
// every share with its sharer and message; each original post is loaded from Posts by id. An
// original that no longer loads comes back as null, shown as "no longer available".
import type { Post } from '../types';
import { engagementApi, postsApi, getProfile, mediaUrl, describeApiError } from '../api/gateway';
import { postDtoToPost, defaultAvatar, withHandle } from '../api/mappers';
import { applyPatches, enrichMedia } from './feedEnrichment';

/** One share by the person: the message they added, and the original post (null when gone). */
export interface SharedEntry {
  shareId: string;
  commentary: string;
  post: Post | null;
}

/** Fills each post's author name, handle and avatar from Profile, and its attachments from Posts. */
async function hydrate(list: Post[]): Promise<Post[]> {
  if (list.length === 0) return list;
  const authorIds = [...new Set(list.map((p) => p.authorId).filter((id): id is string => !!id))];
  const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
  const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));
  const named = list.map((p) => {
    const profile = p.authorId ? profileById.get(p.authorId) : null;
    if (!profile || !p.authorId) return p;
    return {
      ...p,
      author: {
        name: profile.displayName || p.author.name,
        handle: withHandle(profile.handle),
        avatar: mediaUrl(profile.avatarUrl) ?? defaultAvatar(p.authorId),
      },
    };
  });
  const media = await enrichMedia(named).catch(() => null);
  return media ? applyPatches(named, [media]) : named;
}

/**
 * The shares made by `userId`, in the order the server lists them. Rejects with a readable
 * message when the share list itself cannot be read; a single missing original is not an error.
 */
export async function loadSharedBy(userId: string): Promise<SharedEntry[]> {
  const { data, error, response } = await engagementApi.GET('/api/shares');
  if (!data) throw new Error(describeApiError(error, response, 'Could not load shared posts'));
  const mine = data.filter((s) => s.sharerId === userId && s.targetType === 'Post');
  const targetIds = [...new Set(mine.map((s) => s.targetId))];

  const loaded = await Promise.all(
    targetIds.map((id) =>
      postsApi
        .GET('/api/posts/{id}', { params: { path: { id } } })
        .then((r) => (r.data ? postDtoToPost(r.data) : null))
        .catch(() => null),
    ),
  );
  const found = loaded.filter((p): p is Post => p !== null);
  const hydrated = await hydrate(found);
  const byId = new Map(hydrated.map((p) => [p.id, p]));

  return mine.map((s) => ({
    shareId: s.id,
    commentary: s.commentary ?? '',
    post: byId.get(s.targetId) ?? null,
  }));
}
