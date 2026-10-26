import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGroups } from './useGroups';
import { useFeed } from './useFeed';
import { mockApi, type RecordedCall } from '../test/mockApi';
import type { UserProfile } from '../types';

const ME = 'me-0000-0000-0000-000000000001';
const currentUser: UserProfile = {
  id: ME, username: 'me', name: 'Test User', handle: '@me', avatar: '', bio: '', coverPhoto: '',
  followersCount: 0, followingCount: 0, interests: [],
};

/** Groups and the real feed hook together, as the app composes them. */
function setup(routes: Record<string, unknown> = {}) {
  const { calls } = mockApi({
    'GET /api/groups': [],
    'GET /api/group-members': [],
    'GET /api/profiles/{userId}': { status: 404 },
    'GET /api/comments': [],
    'GET /api/reactions': [],
    'GET /api/shares': [],
    'GET /api/post-medias': [],
    'GET /api/post-feeds': [],
    ...routes,
  });
  const showToast = vi.fn();
  const hook = renderHook(() => {
    const feed = useFeed({ myUserId: { current: ME }, currentUser, notify: vi.fn(), showToast });
    const groups = useGroups({
      myUserId: { current: ME },
      showToast,
      feed: { createPostRaw: feed.createPostRaw, setGroupFeed: feed.setGroupFeed, deletePost: feed.deletePost, loadFeed: feed.loadFeed },
    });
    return { feed, groups };
  });
  return { ...hook, calls, showToast };
}

const isCall = (c: RecordedCall, method: string, path: string) => c.method === method && c.path === path;

const postRow = (id: string, body: string, publishedAt: string, authorId = 'ana') => ({
  id, authorId, contentType: 'text', visibility: 'public', status: 'published', body, location: null,
  scheduledAt: null, publishedAt, archivedAt: null,
});

describe('useGroups loading flag', () => {
  it('is true before the first load and false once it succeeds', async () => {
    mockApi({ 'GET /api/groups': [], 'GET /api/group-members': [] });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn(), feed: stubFeed() }));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadGroups();
    });
    expect(result.current.loading).toBe(false);
  });

  it('becomes false when the server answers 500, and the list stays empty', async () => {
    mockApi({ 'GET /api/groups': { status: 500, body: { title: 'boom' } }, 'GET /api/group-members': [] });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn(), feed: stubFeed() }));
    await act(async () => {
      await result.current.loadGroups();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.groups).toEqual([]);
  });
});

function stubFeed() {
  return { createPostRaw: vi.fn(), setGroupFeed: vi.fn(), deletePost: vi.fn(async () => {}), loadFeed: vi.fn(async () => {}) };
}

describe('useGroups.loadGroupPosts', () => {
  it('shows only the posts linked to this community through post-feed rows, newest first', async () => {
    const { result } = setup({
      'GET /api/post-feeds': [
        { id: 'f-1', postId: 'p-old', feedType: 'group', targetId: 'g-1' },
        { id: 'f-2', postId: 'p-new', feedType: 'group', targetId: 'g-1' },
        { id: 'f-3', postId: 'p-other', feedType: 'group', targetId: 'g-2' },
        { id: 'f-4', postId: 'p-home', feedType: 'profile', targetId: 'g-1' },
      ],
      'GET /api/posts': [
        postRow('p-old', 'Older', '2026-10-20T10:00:00Z'),
        postRow('p-new', 'Newer', '2026-10-25T10:00:00Z'),
        postRow('p-other', 'Elsewhere', '2026-10-25T10:00:00Z'),
        postRow('p-home', 'Not a community post', '2026-10-25T10:00:00Z'),
      ],
    });
    await act(async () => {
      await result.current.groups.loadGroupPosts('g-1');
    });
    expect(result.current.feed.groupFeed?.groupId).toBe('g-1');
    expect(result.current.feed.groupFeed?.posts.map((p) => p.id)).toEqual(['p-new', 'p-old']);
    expect(result.current.groups.groupPostsLoading).toBe(false);
  });

  it('a post deleted from the community leaves the community list', async () => {
    const { result } = setup({
      'GET /api/post-feeds': [{ id: 'f-1', postId: 'p-1', feedType: 'group', targetId: 'g-1' }],
      'GET /api/posts': [postRow('p-1', 'Soon gone', '2026-10-25T10:00:00Z')],
      'DELETE /api/posts/{id}': { status: 204 },
      'GET /api/post-medias': [],
    });
    await act(async () => {
      await result.current.groups.loadGroupPosts('g-1');
    });
    expect(result.current.feed.groupFeed?.posts).toHaveLength(1);
    await act(async () => {
      await result.current.feed.deletePost('p-1');
    });
    expect(result.current.feed.groupFeed?.posts).toEqual([]);
  });

  it('a failed read keeps what was there and says why', async () => {
    const { result, showToast } = setup({ 'GET /api/post-feeds': { status: 500, body: { title: 'boom' } } });
    await act(async () => {
      await result.current.groups.loadGroupPosts('g-1');
    });
    expect(showToast).toHaveBeenCalledWith('The community posts could not be loaded');
    expect(result.current.feed.groupFeed).toBeNull();
  });
});

describe('useGroups.createGroupPost', () => {
  it('creates the post, links it to the community with a group post-feed row, and reloads the community', async () => {
    const { result, calls } = setup({
      'POST /api/posts': { status: 201, body: postRow('p-new', 'Hello group', '2026-10-26T09:00:00Z', ME) },
      'POST /api/post-feeds': { status: 201, body: { id: 'f-9', postId: 'p-new', feedType: 'group', targetId: 'g-1' } },
    });
    await act(async () => {
      await result.current.groups.createGroupPost('g-1', 'Hello group', 'text');
    });
    const link = calls.find((c) => isCall(c, 'POST', '/api/post-feeds'));
    expect(link?.body).toEqual({ postId: 'p-new', feedType: 'group', targetId: 'g-1' });
    expect(calls.some((c) => isCall(c, 'DELETE', '/api/posts/p-new'))).toBe(false);
    expect(calls.filter((c) => isCall(c, 'GET', '/api/post-feeds')).length).toBeGreaterThan(0);
    // The home feed is re-read too, so the new post shows there with its community link.
    expect(calls.some((c) => isCall(c, 'GET', '/api/feed/home'))).toBe(true);
  });

  it('when the link cannot be saved, deletes the just-created post and rejects with the reason', async () => {
    const { result, calls } = setup({
      'POST /api/posts': { status: 201, body: postRow('p-lost', 'Lost', '2026-10-26T09:00:00Z', ME) },
      'POST /api/post-feeds': { status: 403, body: { detail: 'Not a member' } },
      'DELETE /api/posts/{id}': { status: 204 },
      'GET /api/post-medias': [],
    });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.groups.createGroupPost('g-1', 'Lost', 'text');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toBe('Your post was not added to the community: Not a member');
    await vi.waitFor(() => expect(calls.some((c) => isCall(c, 'DELETE', '/api/posts/p-lost'))).toBe(true));
  });
});

describe('useGroups.loadMembers', () => {
  it('lists the members with their profiles, the owner first', async () => {
    const { result } = setup({
      'GET /api/group-members': [
        { id: 'm-2', groupId: 'g-1', userId: 'ben', role: 'member' },
        { id: 'm-1', groupId: 'g-1', userId: ME, role: 'owner' },
        { id: 'm-3', groupId: 'g-2', userId: 'cy', role: 'member' },
      ],
      'GET /api/profiles/{userId}': (call: RecordedCall) => (
        call.path.endsWith(ME)
          ? { userId: ME, displayName: 'Test User', handle: 'me', avatarUrl: null }
          : { userId: 'ben', displayName: 'Ben Park', handle: 'ben', avatarUrl: null }
      ),
    });
    await act(async () => {
      await result.current.groups.loadMembers('g-1');
    });
    const members = result.current.groups.membersByGroup['g-1'];
    expect(members.map((m) => [m.name, m.role])).toEqual([['Test User', 'owner'], ['Ben Park', 'member']]);
  });

  it('toasts "The members could not be loaded" and leaves the list unset when the read fails', async () => {
    const { result, showToast } = setup({
      'GET /api/group-members': { status: 500, body: { title: 'boom' } },
    });
    await act(async () => {
      await result.current.groups.loadMembers('g-1');
    });
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/^The members could not be loaded/));
    expect(result.current.groups.membersByGroup['g-1']).toBeUndefined();
  });
});

describe('useGroups.createGroup', () => {
  it('sends the optional cover image and avatar when they were chosen', async () => {
    const { result, calls } = setup({
      'POST /api/groups': { status: 201, body: { id: 'g-new', name: 'Robotics', description: null, avatar: '/blobs/a.png', coverImage: '/blobs/c.png', privacyType: 'public', approvalRequired: false } },
      'POST /api/group-members': { status: 201, body: { id: 'm-new', groupId: 'g-new', userId: ME, role: 'owner' } },
    });
    await act(async () => {
      await result.current.groups.createGroup({ name: 'Robotics', description: '', privacy: 'public', coverImage: '/blobs/c.png', avatar: '/blobs/a.png' });
    });
    expect(calls.find((c) => isCall(c, 'POST', '/api/groups'))?.body).toMatchObject({ coverImage: '/blobs/c.png', avatar: '/blobs/a.png', approvalRequired: false });
  });
});
