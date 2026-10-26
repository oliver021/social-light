import { useMemo, useState, type MutableRefObject } from 'react';
import type { components as SocialGraphComponents } from '@sdk/social-graph';
import { socialGraphApi, getProfile, describeApiError, messageOf, mediaUrl } from '../api/gateway';
import { defaultAvatar, withHandle } from '../api/mappers';
import type { Comment, Post } from '../types';
import type { ToastAction, ToastSeverity } from './useToast';

/*
 * Social graph beyond follows (M4): friends, blocks and user preferences (hide, snooze, mute).
 *
 * Friends. There is no PUT on the backend, so a friendship is made of rows:
 *   - a pair is FRIENDS when any row between the two people (either direction) is `accepted`;
 *   - otherwise a row me -> them that is `pending` means REQUESTED (I sent it);
 *   - a row them -> me that is `pending` means INCOMING;
 *   - no row means NONE.
 * Accepting writes a second row (accepted, me -> them) and keeps their pending row as history.
 * Unfriending deletes every row of the pair.
 *
 * Blocks. Readable by the blocker only. Nobody learns that they were blocked; the UI only
 * changes what *I* see (posts, comments, people, chats, stories, reels).
 *
 * Preferences (`user-preferences`, owner-only). `hide` a post (home feed only), `snooze` a
 * person for 30 days or `mute` them (their posts and stories leave the home feed and the
 * stories bar, not their own profile). Expired rows are ignored and deleted best-effort.
 *
 * Filtering is done by the pure selectors below, applied where the app context exposes
 * a list. Stored state is never deleted to hide something, so unblocking restores it.
 */

type FriendDto = SocialGraphComponents['schemas']['FriendDto'];
type BlockDto = SocialGraphComponents['schemas']['BlockDto'];
type PreferenceDto = SocialGraphComponents['schemas']['UserPreferenceDto'];

/** What I can say about a pair of people. */
export type Relation = 'none' | 'requested' | 'incoming' | 'friends';

/** Display data for one person, resolved through Profile. */
export interface PersonView {
  name: string;
  avatar: string;
  handle: string;
}

export interface IncomingRequest extends PersonView {
  userId: string;
  /** The FriendDto id of their pending row (kept for accept / decline). */
  requestId: string;
}

export interface BlockedEntry {
  userId: string;
  blockId: string;
}

export interface MutedEntry {
  userId: string;
  preferenceId: string;
  preferenceType: 'mute' | 'snooze';
  expiresAt: string | null;
}

/** A post I hid from my home feed, with the preference row that hides it (for Show again). */
export interface HiddenPostEntry {
  postId: string;
  preferenceId: string;
}

/** How long a snooze lasts. */
export const SNOOZE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY_SET: ReadonlySet<string> = new Set();

interface Deps {
  myUserId: MutableRefObject<string>;
  /** Record a notification for another user (from useNotifications). */
  notify: (recipientId: string | undefined, type: string, entityType: string, entityId: string) => void;
  showToast: (message: string, severity?: ToastSeverity) => void;
  /** A toast with one action (Undo). */
  showActionToast: (message: string, action: ToastAction, autoHideMs?: number) => void;
  /** Stop following them (from useSocial). Best-effort when they are blocked. */
  unfollowUser: (userId: string) => void;
  /** Close any open chat window with them (from useChat). */
  closeChat: (userId: string) => void;
}

function viewFromProfile(userId: string, p: { displayName?: string | null; avatarUrl?: string | null; handle?: string | null }): PersonView {
  return {
    name: p.displayName || 'Member',
    avatar: mediaUrl(p.avatarUrl) ?? defaultAvatar(userId),
    handle: withHandle(p.handle),
  };
}

/** A row that has passed its expiry no longer applies. A missing expiry never expires. */
function isExpired(p: { expiresAt: string | null }, now = Date.now()): boolean {
  return !!p.expiresAt && Date.parse(p.expiresAt) <= now;
}

/** The relation between `me` and `userId`, read from the friend rows (see the model above). */
export function relationBetween(rows: FriendDto[], me: string, userId: string): Relation {
  const pair = rows.filter(
    (r) => (r.requesterId === me && r.recipientId === userId) || (r.requesterId === userId && r.recipientId === me),
  );
  if (pair.some((r) => r.status === 'accepted')) return 'friends';
  if (pair.some((r) => r.requesterId === me && r.status === 'pending')) return 'requested';
  if (pair.some((r) => r.requesterId === userId && r.status === 'pending')) return 'incoming';
  return 'none';
}

/** Drop items whose owner (an author or a person id) is blocked. Items with no owner id stay. */
export function withoutBlocked<T>(items: T[], ownerOf: (item: T) => string | undefined, blocked: ReadonlySet<string>): T[] {
  return items.filter((item) => {
    const owner = ownerOf(item);
    return !owner || !blocked.has(owner);
  });
}

export interface PostVisibility {
  /** Blocked people: their posts and comments are hidden everywhere in my views. */
  blocked: ReadonlySet<string>;
  /** Posts I hid. Home feed only. */
  hidden?: ReadonlySet<string>;
  /** People I muted or snoozed. Home feed only. */
  muted?: ReadonlySet<string>;
}

/**
 * The posts to show. `feed` (home) applies every rule; `profile` (a timeline) applies only the
 * block rule, since mute and hide are feed preferences. Comments by blocked people are removed
 * from every post that is kept. Posts that need no change keep their identity.
 */
export function visiblePosts(posts: Post[], sets: PostVisibility, scope: 'feed' | 'profile' = 'feed'): Post[] {
  const hidden = sets.hidden ?? EMPTY_SET;
  const muted = sets.muted ?? EMPTY_SET;
  const kept = posts.filter((p) => {
    if (p.authorId && sets.blocked.has(p.authorId)) return false;
    if (scope === 'feed') {
      if (p.id && hidden.has(p.id)) return false;
      if (p.authorId && muted.has(p.authorId)) return false;
    }
    return true;
  });
  return kept.map((p) => {
    if (!p.comments.some((c: Comment) => c.authorId && sets.blocked.has(c.authorId))) return p;
    return { ...p, comments: p.comments.filter((c) => !(c.authorId && sets.blocked.has(c.authorId))) };
  });
}

/**
 * Friends (friend requests and the friend list), blocks, and user preferences (hide a post,
 * snooze or mute a person), with the operations that change them. Operations resolve `true`
 * on a 2xx and `false` after showing the server's reason; nothing is shown as done before that.
 */
export function useRelationships({ myUserId, notify, showToast, showActionToast, unfollowUser, closeChat }: Deps) {
  const [friendRows, setFriendRows] = useState<FriendDto[]>([]);
  const [blockRows, setBlockRows] = useState<BlockDto[]>([]);
  const [prefRows, setPrefRows] = useState<PreferenceDto[]>([]);
  // Names and avatars for the people in the rows above, keyed by userId.
  const [views, setViews] = useState<Record<string, PersonView>>({});
  // False until the first read of the rows above settles (success or failure). Lists filtered by
  // blocks and mutes wait for it, so a blocked author's post never paints before the filter.
  const [loaded, setLoaded] = useState(false);

  const viewOf = (userId: string): PersonView => views[userId] ?? { name: 'Member', avatar: defaultAvatar(userId), handle: '' };

  const mutedEntries: MutedEntry[] = useMemo(
    () =>
      prefRows
        .filter((p) => p.entityType === 'User' && (p.preferenceType === 'mute' || p.preferenceType === 'snooze') && !isExpired(p))
        .map((p) => ({
          userId: p.entityId,
          preferenceId: p.id,
          preferenceType: p.preferenceType as MutedEntry['preferenceType'],
          expiresAt: p.expiresAt,
        })),
    [prefRows],
  );

  const blockedIds: ReadonlySet<string> = useMemo(() => new Set(blockRows.map((b) => b.blockedId)), [blockRows]);
  const hiddenPosts: HiddenPostEntry[] = useMemo(
    () =>
      prefRows
        .filter((p) => p.entityType === 'Post' && p.preferenceType === 'hide' && !isExpired(p))
        .map((p) => ({ postId: p.entityId, preferenceId: p.id })),
    [prefRows],
  );
  const hiddenPostIds: ReadonlySet<string> = useMemo(() => new Set(hiddenPosts.map((h) => h.postId)), [hiddenPosts]);
  const mutedIds: ReadonlySet<string> = useMemo(() => new Set(mutedEntries.map((m) => m.userId)), [mutedEntries]);

  const blockedUsers: BlockedEntry[] = blockRows.map((b) => ({ userId: b.blockedId, blockId: b.id }));

  const relationTo = (userId: string): Relation => relationBetween(friendRows, myUserId.current, userId);

  const friends: string[] = useMemo(() => {
    const me = myUserId.current;
    const ids = new Set<string>();
    for (const r of friendRows) {
      if (r.status !== 'accepted') continue;
      const other = r.requesterId === me ? r.recipientId : r.requesterId;
      if (other && other !== me) ids.add(other);
    }
    return [...ids];
  }, [friendRows, myUserId]);

  const incomingRequests: IncomingRequest[] = (() => {
    const me = myUserId.current;
    const seen = new Set<string>();
    const out: IncomingRequest[] = [];
    for (const r of friendRows) {
      if (r.recipientId !== me || r.status !== 'pending') continue;
      if (seen.has(r.requesterId) || relationBetween(friendRows, me, r.requesterId) === 'friends') continue;
      seen.add(r.requesterId);
      out.push({ userId: r.requesterId, requestId: r.id, ...viewOf(r.requesterId) });
    }
    return out;
  })();

  const isBlocked = (userId: string): boolean => blockedIds.has(userId);
  const isMuted = (userId: string): boolean => mutedIds.has(userId);
  const isPostHidden = (postId: string): boolean => hiddenPostIds.has(postId);

  // Read my friend rows, blocks and preferences together. A list that fails to load keeps what
  // was shown before. Expired preferences are dropped and deleted on the server (best-effort).
  const loadRelationships = async () => {
    let results;
    try {
      results = await Promise.all([
        socialGraphApi.GET('/api/friends'),
        socialGraphApi.GET('/api/blocks'),
        socialGraphApi.GET('/api/user-preferences'),
      ]);
    } catch (err) {
      setLoaded(true); // a network failure must not keep every list hidden
      throw err;
    }
    const [friendsRes, blocksRes, prefsRes] = results;
    const friendList = friendsRes.data;
    const blockList = blocksRes.data;
    const prefList = prefsRes.data;
    const now = Date.now();
    const live = (prefList ?? []).filter((p) => !isExpired(p, now));
    for (const p of (prefList ?? []).filter((p) => isExpired(p, now))) {
      socialGraphApi.DELETE('/api/user-preferences/{id}', { params: { path: { id: p.id } } }).catch(() => {});
    }
    if (friendList) setFriendRows(friendList);
    if (blockList) setBlockRows(blockList);
    if (prefList) setPrefRows(live);
    // Same batch as the rows, so no render sees `loaded` without the block list.
    setLoaded(true);

    // Resolve names for everyone these rows point at (one cached Profile read each).
    const me = myUserId.current;
    const ids = new Set<string>();
    for (const r of friendList ?? []) ids.add(r.requesterId === me ? r.recipientId : r.requesterId);
    for (const b of blockList ?? []) ids.add(b.blockedId);
    for (const p of live) if (p.entityType === 'User') ids.add(p.entityId);
    ids.delete(me);
    ids.delete('');
    const resolved = await Promise.all([...ids].map(async (id) => [id, await getProfile(id).catch(() => null)] as const));
    setViews((prev) => {
      const next = { ...prev };
      for (const [id, profile] of resolved) if (profile) next[id] = viewFromProfile(id, profile);
      return next;
    });
  };

  // ---- Friends -------------------------------------------------------------------------------

  const sendFriendRequest = async (userId: string): Promise<boolean> => {
    const me = myUserId.current;
    if (!me || userId === me) return false;
    try {
      const { data, error, response } = await socialGraphApi.POST('/api/friends', {
        body: { requesterId: me, recipientId: userId, status: 'pending', acceptedAt: null },
      });
      if (!response.ok || !data) throw new Error(describeApiError(error, response, 'The friend request was not sent'));
      setFriendRows((prev) => [...prev, data]);
      notify(userId, 'friend_request', 'User', me);
      return true;
    } catch (err) {
      showToast(messageOf(err, 'The friend request was not sent'));
      return false;
    }
  };

  const acceptFriend = async (userId: string): Promise<boolean> => {
    const me = myUserId.current;
    if (!me || userId === me) return false;
    try {
      const { data, error, response } = await socialGraphApi.POST('/api/friends', {
        body: { requesterId: me, recipientId: userId, status: 'accepted', acceptedAt: new Date().toISOString() },
      });
      if (!response.ok || !data) throw new Error(describeApiError(error, response, 'The friend request was not accepted'));
      setFriendRows((prev) => [...prev, data]);
      notify(userId, 'friend_accept', 'User', me);
      return true;
    } catch (err) {
      showToast(messageOf(err, 'The friend request was not accepted'));
      return false;
    }
  };

  // Delete one row of mine by id, and drop it from the list once the server agrees.
  const deleteFriendRow = async (row: FriendDto, fallback: string): Promise<boolean> => {
    try {
      const { error, response } = await socialGraphApi.DELETE('/api/friends/{id}', { params: { path: { id: row.id } } });
      if (!response.ok) throw new Error(describeApiError(error, response, fallback));
      setFriendRows((prev) => prev.filter((r) => r.id !== row.id));
      return true;
    } catch (err) {
      showToast(messageOf(err, fallback));
      return false;
    }
  };

  // Decline: delete their pending row to me.
  const declineFriend = async (userId: string): Promise<boolean> => {
    const me = myUserId.current;
    const row = friendRows.find((r) => r.requesterId === userId && r.recipientId === me && r.status === 'pending');
    if (!row) {
      showToast('This friend request is no longer there');
      return false;
    }
    return deleteFriendRow(row, 'The friend request was not declined');
  };

  // Cancel: delete my pending row to them.
  const cancelFriendRequest = async (userId: string): Promise<boolean> => {
    const me = myUserId.current;
    const row = friendRows.find((r) => r.requesterId === me && r.recipientId === userId && r.status === 'pending');
    if (!row) {
      showToast('This friend request is no longer there');
      return false;
    }
    return deleteFriendRow(row, 'The friend request was not cancelled');
  };

  // Unfriend: delete every row of the pair, one by one. A failure stops and reloads the real
  // state, because some rows may already be gone. deleteFriendRow has already shown the reason.
  const unfriend = async (userId: string): Promise<boolean> => {
    const me = myUserId.current;
    const pair = friendRows.filter(
      (r) => (r.requesterId === me && r.recipientId === userId) || (r.requesterId === userId && r.recipientId === me),
    );
    for (const row of pair) {
      const removed = await deleteFriendRow(row, 'Could not remove the friendship completely');
      if (!removed) {
        loadRelationships().catch(() => {});
        return false;
      }
    }
    return true;
  };

  // ---- Blocks --------------------------------------------------------------------------------

  // Block: the row first. Then, best-effort, stop following them, end the friendship and close
  // any open chat with them. Those three never undo the block.
  const blockUser = async (userId: string, reason?: string): Promise<boolean> => {
    const me = myUserId.current;
    if (!me || userId === me) return false;
    try {
      const { data, error, response } = await socialGraphApi.POST('/api/blocks', {
        body: { blockerId: me, blockedId: userId, reason: reason ?? null },
      });
      if (!response.ok || !data) throw new Error(describeApiError(error, response, 'The person was not blocked'));
      setBlockRows((prev) => [...prev.filter((b) => b.blockedId !== userId), data]);
    } catch (err) {
      showToast(messageOf(err, 'The person was not blocked'));
      return false;
    }
    unfollowUser(userId);
    unfriend(userId).catch(() => {});
    closeChat(userId);
    return true;
  };

  const unblockUser = async (userId: string): Promise<boolean> => {
    const row = blockRows.find((b) => b.blockedId === userId);
    if (!row) {
      showToast('This person is not blocked');
      return false;
    }
    try {
      const { error, response } = await socialGraphApi.DELETE('/api/blocks/{id}', { params: { path: { id: row.id } } });
      if (!response.ok) throw new Error(describeApiError(error, response, 'The person was not unblocked'));
      setBlockRows((prev) => prev.filter((b) => b.id !== row.id));
      return true;
    } catch (err) {
      showToast(messageOf(err, 'The person was not unblocked'));
      return false;
    }
  };

  // ---- Preferences ---------------------------------------------------------------------------

  const addPreference = async (
    body: { entityType: string; entityId: string; preferenceType: string; expiresAt: string | null },
    fallback: string,
  ): Promise<PreferenceDto | null> => {
    const me = myUserId.current;
    if (!me) return null;
    try {
      const { data, error, response } = await socialGraphApi.POST('/api/user-preferences', {
        body: { userId: me, ...body },
      });
      if (!response.ok || !data) throw new Error(describeApiError(error, response, fallback));
      setPrefRows((prev) => [...prev, data]);
      return data;
    } catch (err) {
      showToast(messageOf(err, fallback));
      return null;
    }
  };

  // Remove one preference (used by Undo, by Unmute and by the Privacy settings).
  const removePreference = async (preferenceId: string): Promise<boolean> => {
    try {
      const { error, response } = await socialGraphApi.DELETE('/api/user-preferences/{id}', {
        params: { path: { id: preferenceId } },
      });
      if (!response.ok) throw new Error(describeApiError(error, response, 'The setting was not removed'));
      setPrefRows((prev) => prev.filter((p) => p.id !== preferenceId));
      return true;
    } catch (err) {
      showToast(messageOf(err, 'The setting was not removed'));
      return false;
    }
  };

  const hidePost = async (postId: string): Promise<boolean> => {
    const created = await addPreference(
      { entityType: 'Post', entityId: postId, preferenceType: 'hide', expiresAt: null },
      'The post was not hidden',
    );
    if (!created) return false;
    showActionToast('Post hidden', { label: 'Undo', onClick: () => { removePreference(created.id).catch(() => {}); } });
    return true;
  };

  const snoozeUser = async (userId: string): Promise<boolean> =>
    (await addPreference(
      {
        entityType: 'User',
        entityId: userId,
        preferenceType: 'snooze',
        expiresAt: new Date(Date.now() + SNOOZE_DAYS * DAY_MS).toISOString(),
      },
      'The person was not snoozed',
    )) !== null;

  const muteUser = async (userId: string): Promise<boolean> =>
    (await addPreference(
      { entityType: 'User', entityId: userId, preferenceType: 'mute', expiresAt: null },
      'The person was not muted',
    )) !== null;

  // Forget the previous account's graph (used when the signed-in user changes or logs out).
  const reset = () => {
    setFriendRows([]);
    setBlockRows([]);
    setPrefRows([]);
    setViews({});
    setLoaded(false);
  };

  return {
    relationTo,
    friends,
    friendCount: friends.length,
    incomingRequests,
    viewOf,
    isBlocked,
    isMuted,
    isPostHidden,
    blockedIds,
    mutedIds,
    hiddenPostIds,
    hiddenPosts,
    blockedUsers,
    mutedEntries,
    loaded,
    loadRelationships,
    sendFriendRequest,
    acceptFriend,
    declineFriend,
    cancelFriendRequest,
    unfriend,
    blockUser,
    unblockUser,
    hidePost,
    snoozeUser,
    muteUser,
    removePreference,
    reset,
  };
}
