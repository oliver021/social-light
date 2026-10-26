import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRelationships, relationBetween, visiblePosts, withoutBlocked, SNOOZE_DAYS } from './useRelationships';
import { mockApi } from '../test/mockApi';
import { clearProfileCache } from '../api/gateway';
import type { Post } from '../types';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';
const BO = 'bo-0000-0000-0000-000000000003';

const anaProfile = { userId: ANA, displayName: 'Ana Ruiz', handle: 'ana', bio: '', avatarUrl: null, location: null, createdAt: '', updatedAt: '' };
const boProfile = { userId: BO, displayName: 'Bo Lin', handle: 'bo', bio: '', avatarUrl: null, location: null, createdAt: '', updatedAt: '' };

const friendRow = (id: string, requesterId: string, recipientId: string, status: string, acceptedAt: string | null = null) => ({
  id, requesterId, recipientId, status, acceptedAt,
});
const blockRow = (id: string, blockerId: string, blockedId: string) => ({ id, blockerId, blockedId, reason: null });
const prefRow = (id: string, entityType: string, entityId: string, preferenceType: string, expiresAt: string | null) => ({
  id, userId: ME, entityType, entityId, preferenceType, expiresAt,
});

function setup() {
  const showToast = vi.fn();
  const showActionToast = vi.fn();
  const notify = vi.fn();
  const unfollowUser = vi.fn();
  const closeChat = vi.fn();
  const ref = { current: ME };
  const hook = renderHook(() =>
    useRelationships({ myUserId: ref, notify, showToast, showActionToast, unfollowUser, closeChat }),
  );
  return { ...hook, showToast, showActionToast, notify, unfollowUser, closeChat };
}

/** Mock the three graph reads plus Profile lookups. Other routes are passed through in `extra`. */
function mockGraph(opts: { friends?: unknown[]; blocks?: unknown[]; prefs?: unknown[]; extra?: Record<string, unknown> } = {}) {
  return mockApi({
    'GET /api/friends': opts.friends ?? [],
    'GET /api/blocks': opts.blocks ?? [],
    'GET /api/user-preferences': opts.prefs ?? [],
    [`GET /api/profiles/${ANA}`]: anaProfile,
    [`GET /api/profiles/${BO}`]: boProfile,
    ...(opts.extra ?? {}),
  });
}

beforeEach(() => {
  clearProfileCache();
});

describe('relationBetween (the friend-row model)', () => {
  it('is none with no rows', () => {
    expect(relationBetween([], ME, ANA)).toBe('none');
  });

  it('is requested for my pending row to them, and incoming for theirs to me', () => {
    expect(relationBetween([friendRow('f1', ME, ANA, 'pending')], ME, ANA)).toBe('requested');
    expect(relationBetween([friendRow('f1', ANA, ME, 'pending')], ME, ANA)).toBe('incoming');
  });

  it('is friends for an accepted row in either direction', () => {
    expect(relationBetween([friendRow('f1', ANA, ME, 'accepted', '2026-01-01T00:00:00Z')], ME, ANA)).toBe('friends');
    expect(relationBetween([friendRow('f1', ME, ANA, 'accepted', '2026-01-01T00:00:00Z')], ME, ANA)).toBe('friends');
  });

  it('is friends when my old pending row sits next to their accepted one', () => {
    const rows = [friendRow('f1', ME, ANA, 'pending'), friendRow('f2', ANA, ME, 'accepted', '2026-01-01T00:00:00Z')];
    expect(relationBetween(rows, ME, ANA)).toBe('friends');
  });
});

describe('useRelationships: loading and friend state', () => {
  it('loads friends, blocks and preferences and reports relations from them', async () => {
    mockGraph({
      friends: [friendRow('f1', ANA, ME, 'pending'), friendRow('f2', ME, BO, 'accepted', '2026-01-01T00:00:00Z')],
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    expect(result.current.relationTo(ANA)).toBe('incoming');
    expect(result.current.relationTo(BO)).toBe('friends');
    expect(result.current.relationTo('nobody')).toBe('none');
    expect(result.current.friends).toEqual([BO]);
    expect(result.current.friendCount).toBe(1);
    expect(result.current.incomingRequests).toEqual([
      expect.objectContaining({ userId: ANA, requestId: 'f1', name: 'Ana Ruiz', handle: '@ana' }),
    ]);
  });

  it('drops an incoming request once the pair is friends', async () => {
    mockGraph({
      friends: [friendRow('f1', ANA, ME, 'pending'), friendRow('f2', ME, ANA, 'accepted', '2026-01-01T00:00:00Z')],
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });
    expect(result.current.incomingRequests).toEqual([]);
  });

  it('deletes expired preferences on the server and ignores them', async () => {
    const expired = prefRow('p-old', 'User', ANA, 'snooze', '2020-01-01T00:00:00Z');
    const live = prefRow('p-mute', 'User', BO, 'mute', null);
    const { calls } = mockGraph({ prefs: [expired, live], extra: { 'DELETE /api/user-preferences/{id}': { status: 204 } } });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/user-preferences/p-old')).toBe(true));
    expect(result.current.isMuted(ANA)).toBe(false);
    expect(result.current.isMuted(BO)).toBe(true);
    expect(result.current.mutedEntries.map((m) => m.preferenceId)).toEqual(['p-mute']);
  });

  it('a hide row loaded from the server is listed as a hidden post with its preference id', async () => {
    mockGraph({ prefs: [prefRow('p-hide', 'Post', 'post-9', 'hide', null), prefRow('p-hide-old', 'Post', 'post-8', 'hide', '2020-01-01T00:00:00Z')] });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });
    expect(result.current.hiddenPosts).toEqual([{ postId: 'post-9', preferenceId: 'p-hide' }]);
    expect(result.current.isPostHidden('post-9')).toBe(true);
  });

  it('reset empties every piece of the graph', async () => {
    mockGraph({
      friends: [friendRow('f1', ANA, ME, 'pending')],
      blocks: [blockRow('b1', ME, BO)],
      prefs: [prefRow('p1', 'Post', 'post-9', 'hide', null)],
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });
    expect(result.current.isBlocked(BO)).toBe(true);
    expect(result.current.isPostHidden('post-9')).toBe(true);

    act(() => result.current.reset());
    expect(result.current.incomingRequests).toEqual([]);
    expect(result.current.isBlocked(BO)).toBe(false);
    expect(result.current.isPostHidden('post-9')).toBe(false);
    expect(result.current.blockedUsers).toEqual([]);
    expect(result.current.mutedEntries).toEqual([]);
    expect(result.current.hiddenPosts).toEqual([]);
  });
});

describe('useRelationships: friend requests', () => {
  it('sendFriendRequest posts a pending row from me and notifies them', async () => {
    const { calls } = mockGraph({
      extra: {
        'POST /api/friends': (call: { body: unknown }) => ({ id: 'f-new', ...(call.body as object) }),
      },
    });
    const { result, notify } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = false;
    await act(async () => { ok = await result.current.sendFriendRequest(ANA); });

    expect(ok).toBe(true);
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/friends');
    expect(post?.body).toEqual({ requesterId: ME, recipientId: ANA, status: 'pending', acceptedAt: null });
    expect(notify).toHaveBeenCalledWith(ANA, 'friend_request', 'User', ME);
    expect(result.current.relationTo(ANA)).toBe('requested');
  });

  it('a refused request leaves the relation as it was and shows the server reason', async () => {
    mockGraph({ extra: { 'POST /api/friends': { status: 400, body: { detail: 'Already requested.' } } } });
    const { result, showToast, notify } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = true;
    await act(async () => { ok = await result.current.sendFriendRequest(ANA); });

    expect(ok).toBe(false);
    expect(result.current.relationTo(ANA)).toBe('none');
    expect(notify).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Already requested.'));
  });

  it('acceptFriend posts an accepted row with an ISO acceptedAt and notifies the requester', async () => {
    const { calls } = mockGraph({
      friends: [friendRow('f1', ANA, ME, 'pending')],
      extra: { 'POST /api/friends': (call: { body: unknown }) => ({ id: 'f2', ...(call.body as object) }) },
    });
    const { result, notify } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = false;
    await act(async () => { ok = await result.current.acceptFriend(ANA); });

    expect(ok).toBe(true);
    const body = calls.find((c) => c.method === 'POST' && c.path === '/api/friends')?.body as { status: string; acceptedAt: string };
    expect(body).toMatchObject({ requesterId: ME, recipientId: ANA, status: 'accepted' });
    expect(Number.isNaN(Date.parse(body.acceptedAt))).toBe(false);
    expect(notify).toHaveBeenCalledWith(ANA, 'friend_accept', 'User', ME);
    expect(result.current.relationTo(ANA)).toBe('friends');
  });

  it('a refused accept keeps the request listed and does not notify', async () => {
    mockGraph({
      friends: [friendRow('f1', ANA, ME, 'pending')],
      extra: { 'POST /api/friends': { status: 500, body: { title: 'boom' } } },
    });
    const { result, showToast, notify } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = true;
    await act(async () => { ok = await result.current.acceptFriend(ANA); });

    expect(ok).toBe(false);
    expect(notify).not.toHaveBeenCalled();
    expect(result.current.incomingRequests).toHaveLength(1);
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });

  it('declineFriend deletes their pending row to me', async () => {
    const { calls } = mockGraph({
      friends: [friendRow('f1', ANA, ME, 'pending')],
      extra: { 'DELETE /api/friends/{id}': { status: 204 } },
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    await act(async () => { await result.current.declineFriend(ANA); });

    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/friends/f1')).toBe(true);
    expect(result.current.relationTo(ANA)).toBe('none');
  });

  it('cancelFriendRequest deletes my pending row to them, and a failure toasts and keeps it', async () => {
    mockGraph({
      friends: [friendRow('f9', ME, ANA, 'pending')],
      extra: { 'DELETE /api/friends/{id}': { status: 500, body: { title: 'nope' } } },
    });
    const { result, showToast } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = true;
    await act(async () => { ok = await result.current.cancelFriendRequest(ANA); });

    expect(ok).toBe(false);
    expect(result.current.relationTo(ANA)).toBe('requested');
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });
});

describe('useRelationships: unfriend', () => {
  it('deletes every row of the pair, in either direction', async () => {
    const { calls } = mockGraph({
      friends: [friendRow('f1', ME, ANA, 'accepted', '2026-01-01T00:00:00Z'), friendRow('f2', ANA, ME, 'pending')],
      extra: { 'DELETE /api/friends/{id}': { status: 204 } },
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = false;
    await act(async () => { ok = await result.current.unfriend(ANA); });

    expect(ok).toBe(true);
    const deleted = calls.filter((c) => c.method === 'DELETE').map((c) => c.path).sort();
    expect(deleted).toEqual(['/api/friends/f1', '/api/friends/f2']);
    expect(result.current.relationTo(ANA)).toBe('none');
  });

  it('a failed row stops the removal, reloads the real state and says so', async () => {
    const { calls } = mockGraph({
      friends: [friendRow('f1', ME, ANA, 'accepted', '2026-01-01T00:00:00Z'), friendRow('f2', ANA, ME, 'pending')],
      extra: {
        'DELETE /api/friends/f1': { status: 204 },
        'DELETE /api/friends/f2': { status: 500, body: { title: 'boom' } },
      },
    });
    const { result, showToast } = setup();
    await act(async () => { await result.current.loadRelationships(); });
    const friendReadsBefore = calls.filter((c) => c.method === 'GET' && c.path === '/api/friends').length;

    let ok = true;
    await act(async () => { ok = await result.current.unfriend(ANA); });

    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Could not remove the friendship completely');
    await waitFor(() => expect(calls.filter((c) => c.method === 'GET' && c.path === '/api/friends').length).toBeGreaterThan(friendReadsBefore));
  });
});

describe('useRelationships: blocks', () => {
  it('blockUser posts the block, then unfollows, ends the friendship and closes the chat', async () => {
    const { calls } = mockGraph({
      friends: [friendRow('f1', ME, BO, 'accepted', '2026-01-01T00:00:00Z')],
      extra: {
        'POST /api/blocks': (call: { body: unknown }) => ({ id: 'blk-1', ...(call.body as object) }),
        'DELETE /api/friends/{id}': { status: 204 },
      },
    });
    const { result, unfollowUser, closeChat } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = false;
    await act(async () => { ok = await result.current.blockUser(BO); });

    expect(ok).toBe(true);
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/blocks');
    expect(post?.body).toEqual({ blockerId: ME, blockedId: BO, reason: null });
    expect(result.current.isBlocked(BO)).toBe(true);
    expect(unfollowUser).toHaveBeenCalledWith(BO);
    expect(closeChat).toHaveBeenCalledWith(BO);
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/friends/f1')).toBe(true);
  });

  it('a refused block shows the reason and does not unfollow or close chats', async () => {
    mockGraph({ extra: { 'POST /api/blocks': { status: 500, body: { title: 'the block store is down' } } } });
    const { result, showToast, unfollowUser, closeChat } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = true;
    await act(async () => { ok = await result.current.blockUser(BO); });

    expect(ok).toBe(false);
    expect(result.current.isBlocked(BO)).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('the block store is down'));
    expect(unfollowUser).not.toHaveBeenCalled();
    expect(closeChat).not.toHaveBeenCalled();
  });

  it('unblockUser deletes the block row', async () => {
    const { calls } = mockGraph({
      blocks: [blockRow('blk-1', ME, BO)],
      extra: { 'DELETE /api/blocks/{id}': { status: 204 } },
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = false;
    await act(async () => { ok = await result.current.unblockUser(BO); });

    expect(ok).toBe(true);
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/blocks/blk-1')).toBe(true);
    expect(result.current.isBlocked(BO)).toBe(false);
  });

  it('a refused unblock keeps the block and shows the reason', async () => {
    mockGraph({
      blocks: [blockRow('blk-1', ME, BO)],
      extra: { 'DELETE /api/blocks/{id}': { status: 500, body: { title: 'no' } } },
    });
    const { result, showToast } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    await act(async () => { await result.current.unblockUser(BO); });

    expect(result.current.isBlocked(BO)).toBe(true);
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });

  it('visiblePosts drops a blocked author\'s posts and their comments', () => {
    const base = { type: 'text', reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 }, sharesCount: 0, createdAt: '', author: { name: '', handle: '', avatar: '' } } as const;
    const posts: Post[] = [
      { ...base, id: 'p-ana', authorId: ANA, content: 'ana', comments: [] },
      {
        ...base, id: 'p-me', authorId: ME, content: 'mine', comments: [
          { id: 'c-bo', authorId: BO, author: { name: 'Bo', handle: '', avatar: '' }, content: 'bo says', createdAt: '', parentCommentId: null },
          { id: 'c-ana', authorId: ANA, author: { name: 'Ana', handle: '', avatar: '' }, content: 'ana says', createdAt: '', parentCommentId: null },
        ],
      },
      { ...base, id: 'p-bo', authorId: BO, content: 'bo', comments: [] },
    ];
    const out = visiblePosts(posts, { blocked: new Set([BO]) });
    expect(out.map((p) => p.id)).toEqual(['p-ana', 'p-me']);
    expect(out[1].comments.map((c) => c.id)).toEqual(['c-ana']);
  });

  it('withoutBlocked keeps items with no owner id', () => {
    const rows = [{ userId: BO }, { userId: ANA }, { userId: undefined }];
    expect(withoutBlocked(rows, (r) => r.userId, new Set([BO]))).toEqual([{ userId: ANA }, { userId: undefined }]);
  });
});

describe('useRelationships: hide, snooze and mute', () => {
  it('hidePost posts a hide preference and offers an Undo that deletes it', async () => {
    const { calls } = mockGraph({
      extra: {
        'POST /api/user-preferences': (call: { body: unknown }) => ({ id: 'pref-1', ...(call.body as object) }),
        'DELETE /api/user-preferences/{id}': { status: 204 },
      },
    });
    const { result, showActionToast } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = false;
    await act(async () => { ok = await result.current.hidePost('post-7'); });

    expect(ok).toBe(true);
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/user-preferences')?.body).toEqual({
      userId: ME, entityType: 'Post', entityId: 'post-7', preferenceType: 'hide', expiresAt: null,
    });
    expect(result.current.isPostHidden('post-7')).toBe(true);
    expect(showActionToast).toHaveBeenCalledWith('Post hidden', expect.objectContaining({ label: 'Undo' }));

    const [, action] = showActionToast.mock.calls[0];
    await act(async () => { action.onClick(); });
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/user-preferences/pref-1')).toBe(true));
    await waitFor(() => expect(result.current.isPostHidden('post-7')).toBe(false));
  });

  it('snoozeUser sets an expiry about 30 days ahead; muteUser sets none', async () => {
    const { calls } = mockGraph({
      extra: { 'POST /api/user-preferences': (call: { body: unknown }) => ({ id: `pref-${calls.length}`, ...(call.body as object) }) },
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    await act(async () => { await result.current.snoozeUser(ANA); });
    await act(async () => { await result.current.muteUser(BO); });

    const [snooze, mute] = calls.filter((c) => c.method === 'POST' && c.path === '/api/user-preferences').map((c) => c.body as { expiresAt: string | null; preferenceType: string });
    expect(snooze.preferenceType).toBe('snooze');
    const days = (Date.parse(snooze.expiresAt as string) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(SNOOZE_DAYS - 1);
    expect(days).toBeLessThanOrEqual(SNOOZE_DAYS + 0.01);
    expect(mute).toMatchObject({ preferenceType: 'mute', expiresAt: null });
    expect(result.current.isMuted(ANA)).toBe(true);
    expect(result.current.isMuted(BO)).toBe(true);
  });

  it('a refused mute shows the reason and mutes nobody', async () => {
    mockGraph({ extra: { 'POST /api/user-preferences': { status: 500, body: { title: 'store down' } } } });
    const { result, showToast } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = true;
    await act(async () => { ok = await result.current.muteUser(BO); });

    expect(ok).toBe(false);
    expect(result.current.isMuted(BO)).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('store down'));
  });

  it('removePreference deletes the row and drops the mute', async () => {
    const { calls } = mockGraph({
      prefs: [prefRow('p-mute', 'User', BO, 'mute', null)],
      extra: { 'DELETE /api/user-preferences/{id}': { status: 204 } },
    });
    const { result } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    await act(async () => { await result.current.removePreference('p-mute'); });

    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/user-preferences/p-mute')).toBe(true);
    expect(result.current.isMuted(BO)).toBe(false);
  });

  it('a refused removePreference shows the reason and keeps the mute', async () => {
    mockGraph({
      prefs: [prefRow('p-mute', 'User', BO, 'mute', null)],
      extra: { 'DELETE /api/user-preferences/{id}': { status: 500, body: { title: 'nope' } } },
    });
    const { result, showToast } = setup();
    await act(async () => { await result.current.loadRelationships(); });

    let ok = true;
    await act(async () => { ok = await result.current.removePreference('p-mute'); });

    expect(ok).toBe(false);
    expect(result.current.isMuted(BO)).toBe(true);
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/.+/));
    expect(showToast.mock.calls[0][0]).toContain('nope');
  });
});
