import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStories } from './useStories';
import { useReels } from './useReels';
import { useEvents } from './useEvents';
import { useGroups } from './useGroups';
import { useNotifications } from './useNotifications';
import { mockApi, type RecordedCall } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';
const feed = { createPostRaw: vi.fn(), setGroupFeed: vi.fn(), deletePost: vi.fn(async () => {}), loadFeed: vi.fn(async () => {}) };
const isDelete = (c: RecordedCall, path: string) => c.method === 'DELETE' && c.path === path;

describe('useStories.deleteStory', () => {
  const story = { id: 's-1', authorId: ME, mediaType: 'image', mediaUrl: '/blobs/a.png', caption: '' };

  it('sends DELETE /api/stories/{id} and removes the story on success', async () => {
    const { calls } = mockApi({
      'GET /api/stories': [story],
      'DELETE /api/stories/{id}': { status: 204 },
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify: vi.fn() }));
    await act(async () => {
      await result.current.loadStories();
    });
    await act(async () => {
      await result.current.deleteStory('s-1');
    });
    expect(calls.some((c) => isDelete(c, '/api/stories/s-1'))).toBe(true);
    expect(result.current.stories).toEqual([]);
  });

  it('keeps the story and rejects with the server message when the delete fails', async () => {
    mockApi({
      'GET /api/stories': [story],
      'DELETE /api/stories/{id}': { status: 403, body: { detail: 'Not your story' } },
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify: vi.fn() }));
    await act(async () => {
      await result.current.loadStories();
    });
    await expect(result.current.deleteStory('s-1')).rejects.toThrow('The story was not deleted: Not your story');
    expect(result.current.stories.map((s) => s.id)).toEqual(['s-1']);
  });
});

describe('useReels.deleteReel', () => {
  const reel = { id: 'r-1', creatorId: ME, videoUrl: '/blobs/v.mp4', caption: 'clip', duration: 4 };

  it('sends DELETE /api/reels/{id} and removes the reel on success', async () => {
    const { calls } = mockApi({
      'GET /api/reels': [reel],
      'DELETE /api/reels/{id}': { status: 204 },
    });
    const { result } = renderHook(() => useReels({ myUserId: { current: ME } }));
    await act(async () => {
      await result.current.loadReels();
    });
    await act(async () => {
      await result.current.deleteReel('r-1');
    });
    expect(calls.some((c) => isDelete(c, '/api/reels/r-1'))).toBe(true);
    expect(result.current.reels).toEqual([]);
  });

  it('keeps the reel and rejects with the server message when the delete fails', async () => {
    mockApi({
      'GET /api/reels': [reel],
      'DELETE /api/reels/{id}': { status: 500, body: { title: 'boom' } },
    });
    const { result } = renderHook(() => useReels({ myUserId: { current: ME } }));
    await act(async () => {
      await result.current.loadReels();
    });
    await expect(result.current.deleteReel('r-1')).rejects.toThrow('The reel was not deleted: boom');
    expect(result.current.reels.map((r) => r.id)).toEqual(['r-1']);
  });
});

describe('useEvents.deleteEvent', () => {
  const event = {
    id: 'e-1',
    organizerId: ME,
    title: 'Board game night',
    description: '',
    location: '',
    startDate: '2026-11-01T18:00:00Z',
    endDate: '2026-11-01T20:00:00Z',
    capacity: null,
  };

  it('sends DELETE /api/events/{id}, removes it, and removes my own attendance row', async () => {
    const { calls } = mockApi({
      'GET /api/events': [event],
      'GET /api/event-attendances': [{ id: 'a-1', eventId: 'e-1', userId: ME, status: 'going' }],
      'DELETE /api/events/{id}': { status: 204 },
      'DELETE /api/event-attendances/{id}': { status: 204 },
    });
    const { result } = renderHook(() => useEvents({ myUserId: { current: ME }, showToast: vi.fn() }));
    await act(async () => {
      await result.current.loadEvents();
    });
    await act(async () => {
      await result.current.deleteEvent('e-1');
    });
    expect(calls.some((c) => isDelete(c, '/api/events/e-1'))).toBe(true);
    await waitFor(() => expect(calls.some((c) => isDelete(c, '/api/event-attendances/a-1'))).toBe(true));
    expect(result.current.events).toEqual([]);
  });

  it('keeps the event and rejects with the server message when the delete fails', async () => {
    const { calls } = mockApi({
      'GET /api/events': [event],
      'GET /api/event-attendances': [{ id: 'a-1', eventId: 'e-1', userId: ME, status: 'going' }],
      'DELETE /api/events/{id}': { status: 409, body: { detail: 'Has tickets sold' } },
    });
    const { result } = renderHook(() => useEvents({ myUserId: { current: ME }, showToast: vi.fn() }));
    await act(async () => {
      await result.current.loadEvents();
    });
    await expect(result.current.deleteEvent('e-1')).rejects.toThrow('The event was not deleted: Has tickets sold');
    expect(result.current.events.map((e) => e.id)).toEqual(['e-1']);
    expect(calls.some((c) => isDelete(c, '/api/event-attendances/a-1'))).toBe(false);
  });
});

describe('useGroups ownership', () => {
  const group = { id: 'g-1', name: 'Makers', description: '', privacyType: 'public' };
  const ownerMembership = { id: 'gm-1', groupId: 'g-1', userId: ME, role: 'owner' };

  it('reads my role per community from my membership', async () => {
    mockApi({ 'GET /api/groups': [group], 'GET /api/group-members': [ownerMembership] });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn(), feed }));
    await act(async () => {
      await result.current.loadGroups();
    });
    expect(result.current.myRoleByGroup.get('g-1')).toBe('owner');
  });

  it('createGroup makes the creator a member with role owner', async () => {
    const { calls } = mockApi({
      'POST /api/groups': { id: 'g-2', name: 'New', description: null, privacyType: 'public' },
      'POST /api/group-members': { id: 'gm-2', groupId: 'g-2', userId: ME, role: 'owner' },
      'GET /api/groups': [],
      'GET /api/group-members': [],
    });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn(), feed }));
    await act(async () => {
      await result.current.createGroup({ name: 'New', description: '', privacy: 'public' });
    });
    const join = calls.find((c) => c.method === 'POST' && c.path === '/api/group-members');
    expect(join?.body).toMatchObject({ groupId: 'g-2', userId: ME, role: 'owner' });
  });

  it('deleteGroup sends DELETE /api/groups/{id}, drops the community and my role, and removes my membership', async () => {
    const { calls } = mockApi({
      'GET /api/groups': [group],
      'GET /api/group-members': [ownerMembership],
      'DELETE /api/groups/{id}': { status: 204 },
      'DELETE /api/group-members/{id}': { status: 204 },
    });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn(), feed }));
    await act(async () => {
      await result.current.loadGroups();
    });
    await act(async () => {
      await result.current.deleteGroup('g-1');
    });
    expect(calls.some((c) => isDelete(c, '/api/groups/g-1'))).toBe(true);
    await waitFor(() => expect(calls.some((c) => isDelete(c, '/api/group-members/gm-1'))).toBe(true));
    expect(result.current.groups).toEqual([]);
    expect(result.current.myRoleByGroup.has('g-1')).toBe(false);
  });

  it('deleteGroup keeps the community and rejects with the server message when the delete fails', async () => {
    mockApi({
      'GET /api/groups': [group],
      'GET /api/group-members': [ownerMembership],
      'DELETE /api/groups/{id}': { status: 403, body: { detail: 'Not your community' } },
    });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn(), feed }));
    await act(async () => {
      await result.current.loadGroups();
    });
    await expect(result.current.deleteGroup('g-1')).rejects.toThrow('The community was not deleted: Not your community');
    expect(result.current.groups.map((g) => g.id)).toEqual(['g-1']);
    expect(result.current.myRoleByGroup.get('g-1')).toBe('owner');
  });

  it('reset forgets the roles', async () => {
    mockApi({ 'GET /api/groups': [group], 'GET /api/group-members': [ownerMembership] });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn(), feed }));
    await act(async () => {
      await result.current.loadGroups();
    });
    act(() => result.current.reset());
    expect(result.current.myRoleByGroup.size).toBe(0);
  });
});

describe('useNotifications dismiss', () => {
  const serverNotif = (id: string) => ({
    id,
    recipientId: ME,
    actorId: 'u-2',
    type: 'like',
    entityType: 'Post',
    entityId: 'post-9',
    isRead: false,
  });

  async function loaded(routes: Record<string, unknown>) {
    const { calls } = mockApi({ 'GET /api/notifications': [serverNotif('n-1'), serverNotif('n-2')], ...routes });
    const showToast = vi.fn();
    const hook = renderHook(() => useNotifications({ myUserId: { current: ME }, showToast }));
    await act(async () => {
      await hook.result.current.loadNotifications();
    });
    return { ...hook, calls, showToast };
  }

  it('sends DELETE /api/notifications/{id} and removes that item on success', async () => {
    const { result, calls, showToast } = await loaded({ 'DELETE /api/notifications/{id}': { status: 204 } });
    await act(async () => {
      await result.current.dismissNotification('n-1');
    });
    expect(calls.some((c) => isDelete(c, '/api/notifications/n-1'))).toBe(true);
    expect(result.current.notifications.map((n) => n.id)).toEqual(['n-2']);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('removes a client-only notification locally, without a request', async () => {
    const { result, calls } = await loaded({ 'DELETE /api/notifications/{id}': { status: 204 } });
    act(() => result.current.addNotification('like', 'Ben', 'liked your post'));
    const localId = result.current.notifications[0].id;
    expect(localId.startsWith('notif-')).toBe(true);
    await act(async () => {
      await result.current.dismissNotification(localId);
    });
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    expect(result.current.notifications.some((n) => n.id === localId)).toBe(false);
  });

  it('keeps the item and toasts when the server refuses', async () => {
    const { result, showToast } = await loaded({ 'DELETE /api/notifications/{id}': { status: 500, body: { title: 'boom' } } });
    await act(async () => {
      await result.current.dismissNotification('n-1');
    });
    expect(result.current.notifications.map((n) => n.id)).toEqual(['n-2', 'n-1']);
    expect(showToast).toHaveBeenCalledWith('The notification was not removed');
  });

  it('clearNotifications keeps exactly the one that fails and toasts', async () => {
    const { result, showToast } = await loaded({
      'DELETE /api/notifications/n-1': { status: 204 },
      'DELETE /api/notifications/n-2': { status: 500, body: { title: 'boom' } },
    });
    await act(async () => {
      await result.current.clearNotifications();
    });
    expect(result.current.notifications.map((n) => n.id)).toEqual(['n-2']);
    expect(showToast).toHaveBeenCalledWith('Some notifications could not be removed');
  });
});
