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
      feed: { createPostIn: feed.createPostIn, setGroupFeed: feed.setGroupFeed, deletePost: feed.deletePost, addToFeed: feed.addToFeed },
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
  return { createPostIn: vi.fn(), setGroupFeed: vi.fn(), deletePost: vi.fn(async () => {}), addToFeed: vi.fn() };
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
    // The new post lands on the home feed with its community link, without re-reading the feed.
    expect(result.current.feed.posts[0]).toMatchObject({ id: 'p-new', groupId: 'g-1' });
    expect(calls.some((c) => isCall(c, 'GET', '/api/feed/home'))).toBe(false);
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

describe('useGroups.createGroupPost with an image (M10)', () => {
  it('writes the image row first, then links the post to this community', async () => {
    const { result, calls } = setup({
      'POST /api/posts': { status: 201, body: postRow('p-img', 'Look', '2026-10-26T09:00:00Z', ME) },
      'POST /api/post-medias': { status: 201, body: { id: 'pm-1', postId: 'p-img', fileUrl: '/blobs/a.png', mediaType: 'image', position: 0 } },
      'POST /api/post-feeds': { status: 201, body: { id: 'f-img', postId: 'p-img', feedType: 'group', targetId: 'g-1' } },
    });
    await act(async () => {
      await result.current.groups.createGroupPost('g-1', 'Look', 'image', { imageUrls: ['/blobs/a.png'] });
    });
    const order = calls.map((c) => `${c.method} ${c.path}`);
    expect(order.indexOf('POST /api/post-medias')).toBeGreaterThan(-1);
    expect(order.indexOf('POST /api/post-medias')).toBeLessThan(order.indexOf('POST /api/post-feeds'));
    expect(calls.find((c) => isCall(c, 'POST', '/api/post-medias'))?.body).toMatchObject({ postId: 'p-img', mediaType: 'image', position: 0 });
    expect(calls.find((c) => isCall(c, 'POST', '/api/post-feeds'))?.body).toEqual({ postId: 'p-img', feedType: 'group', targetId: 'g-1' });
  });
});

describe('useGroups.removePostFromGroup (M10)', () => {
  const feedRows = [
    { id: 'f-1', postId: 'p-1', feedType: 'group', targetId: 'g-1' },
    { id: 'f-2', postId: 'p-1', feedType: 'group', targetId: 'g-2' },
    { id: 'f-3', postId: 'p-1', feedType: 'profile', targetId: 'g-1' },
    { id: 'f-4', postId: 'p-2', feedType: 'group', targetId: 'g-1' },
  ];

  it('deletes only the group link of this post in this community, never the post itself', async () => {
    const { result, calls } = setup({
      'GET /api/post-feeds': feedRows,
      'GET /api/posts': [postRow('p-1', 'Moved out', '2026-10-25T10:00:00Z'), postRow('p-2', 'Stays', '2026-10-25T10:00:00Z')],
      'DELETE /api/post-feeds/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.groups.removePostFromGroup('g-1', 'p-1');
    });
    const deletes = calls.filter((c) => c.method === 'DELETE').map((c) => c.path);
    expect(deletes).toEqual(['/api/post-feeds/f-1']);
    expect(calls.some((c) => c.method === 'DELETE' && c.path.startsWith('/api/posts'))).toBe(false);
  });

  it('re-reads the community so it no longer lists the removed post', async () => {
    // The server's link rows follow the delete: once f-1 is deleted, the re-read finds none.
    let linked = true;
    const { result } = setup({
      'GET /api/post-feeds': () => (linked ? [{ id: 'f-1', postId: 'p-1', feedType: 'group', targetId: 'g-1' }] : []),
      'GET /api/posts': [postRow('p-1', 'Moved out', '2026-10-25T10:00:00Z')],
      'DELETE /api/post-feeds/{id}': () => {
        linked = false;
        return { status: 204 };
      },
    });
    await act(async () => {
      await result.current.groups.loadGroupPosts('g-1');
    });
    expect(result.current.feed.groupFeed?.posts.map((p) => p.id)).toEqual(['p-1']);
    await act(async () => {
      await result.current.groups.removePostFromGroup('g-1', 'p-1');
    });
    expect(result.current.feed.groupFeed?.posts).toEqual([]);
  });

  it('a refused delete rejects with the server reason and leaves the post in the community', async () => {
    const { result, calls } = setup({
      'GET /api/post-feeds': [{ id: 'f-1', postId: 'p-1', feedType: 'group', targetId: 'g-1' }],
      'GET /api/posts': [postRow('p-1', 'Still here', '2026-10-25T10:00:00Z')],
      'DELETE /api/post-feeds/{id}': { status: 403, body: { detail: 'Only the owner can remove posts' } },
    });
    await act(async () => {
      await result.current.groups.loadGroupPosts('g-1');
    });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.groups.removePostFromGroup('g-1', 'p-1');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toContain('Only the owner can remove posts');
    expect(calls.some((c) => c.method === 'DELETE' && c.path.startsWith('/api/posts'))).toBe(false);
    expect(result.current.feed.groupFeed?.posts.map((p) => p.id)).toEqual(['p-1']);
  });
});

describe('useGroups.removeMember (M10)', () => {
  const groupRow = { id: 'g-1', name: 'Design', description: null, privacyType: 'public', coverImage: null, avatar: null, approvalRequired: false };
  const memberRows = [
    { id: 'm-1', groupId: 'g-1', userId: ME, role: 'owner' },
    { id: 'm-2', groupId: 'g-1', userId: 'ben', role: 'member' },
  ];
  const profiles = (call: RecordedCall) => (
    call.path.endsWith(ME)
      ? { userId: ME, displayName: 'Test User', handle: 'me', avatarUrl: null }
      : { userId: 'ben', displayName: 'Ben Park', handle: 'ben', avatarUrl: null }
  );

  it('removes the member row, then drops the member from the list and the count', async () => {
    const { result, calls } = setup({
      'GET /api/groups': [groupRow],
      'GET /api/group-members': memberRows,
      'GET /api/profiles/{userId}': profiles,
      'DELETE /api/group-members/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.groups.loadGroups();
      await result.current.groups.loadMembers('g-1');
    });
    expect(result.current.groups.groups[0].memberCount).toBe(2);
    await act(async () => {
      await result.current.groups.removeMember('g-1', 'm-2');
    });
    expect(calls.find((c) => c.method === 'DELETE')?.path).toBe('/api/group-members/m-2');
    expect(result.current.groups.membersByGroup['g-1'].map((m) => m.id)).toEqual(['m-1']);
    expect(result.current.groups.groups[0].memberCount).toBe(1);
  });

  it('never removes the owner row', async () => {
    const { result, calls } = setup({
      'GET /api/groups': [groupRow],
      'GET /api/group-members': memberRows,
      'GET /api/profiles/{userId}': profiles,
      'DELETE /api/group-members/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.groups.loadMembers('g-1');
    });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.groups.removeMember('g-1', 'm-1');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toBe('The owner cannot be removed from the community.');
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('a refused removal rejects with the server reason and leaves the list unchanged', async () => {
    const { result } = setup({
      'GET /api/groups': [groupRow],
      'GET /api/group-members': memberRows,
      'GET /api/profiles/{userId}': profiles,
      'DELETE /api/group-members/{id}': { status: 403, body: { detail: 'Forbidden' } },
    });
    await act(async () => {
      await result.current.groups.loadGroups();
      await result.current.groups.loadMembers('g-1');
    });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.groups.removeMember('g-1', 'm-2');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toContain('Forbidden');
    expect(result.current.groups.membersByGroup['g-1'].map((m) => m.id)).toEqual(['m-1', 'm-2']);
    expect(result.current.groups.groups[0].memberCount).toBe(2);
  });
});
