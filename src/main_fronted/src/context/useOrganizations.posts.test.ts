import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrganizations, canPostToOrganization } from './useOrganizations';
import { useFeed } from './useFeed';
import { mockApi, type RecordedCall } from '../test/mockApi';
import type { UserProfile } from '../types';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';
const BEN = 'ben-0000-0000-0000-000000000003';
const currentUser: UserProfile = {
  id: ME, username: 'me', name: 'Test User', handle: '@me', avatar: '', bio: '', coverPhoto: '',
  followersCount: 0, followingCount: 0, interests: [],
};

const org = (id: string, ownerId: string, overrides: Record<string, unknown> = {}) => ({
  id, ownerId, name: `Org ${id}`, description: null, logo: null, verificationStatus: 'unverified', ...overrides,
});
const row = (id: string, organizationId: string, userId: string, role: string) => ({ id, organizationId, userId, role });
const postRow = (id: string, body: string, publishedAt: string, authorId = ANA) => ({
  id, authorId, contentType: 'text', visibility: 'public', status: 'published', body, location: null,
  scheduledAt: null, publishedAt, archivedAt: null,
});
const isCall = (c: RecordedCall, method: string, path: string) => c.method === method && c.path === path;

/** Organizations and the real feed hook together, as the app composes them. */
function setup(routes: Record<string, unknown> = {}) {
  const { calls } = mockApi({
    'GET /api/organizations': [],
    'GET /api/organization-members': [],
    'GET /api/groups': [],
    'GET /api/profiles/{userId}': { status: 404 },
    'GET /api/comments': [],
    'GET /api/reactions': [],
    'GET /api/shares': [],
    'GET /api/post-medias': [],
    'GET /api/post-feeds': [],
    'GET /api/posts': [],
    'GET /api/feed/home': [],
    ...routes,
  });
  const showToast = vi.fn();
  const hook = renderHook(() => {
    const feed = useFeed({ myUserId: { current: ME }, currentUser, notify: vi.fn(), showToast });
    const organizations = useOrganizations({
      myUserId: { current: ME },
      showToast,
      feed: { createPostIn: feed.createPostIn, setOrganizationFeed: feed.setOrganizationFeed, deletePost: feed.deletePost },
    });
    return { feed, organizations };
  });
  return { ...hook, calls, showToast };
}

describe('canPostToOrganization', () => {
  it('lets the owner and an admin post, and nobody else', () => {
    expect(canPostToOrganization({ isOwner: true, myRole: 'owner' })).toBe(true);
    expect(canPostToOrganization({ isOwner: false, myRole: 'admin' })).toBe(true);
    expect(canPostToOrganization({ isOwner: false, myRole: 'member' })).toBe(false);
    expect(canPostToOrganization({ isOwner: false, myRole: null })).toBe(false);
  });
});

describe('useOrganizations.loadOrganizationPosts', () => {
  it('shows only the posts linked to this organization through post-feed rows, newest first', async () => {
    const { result } = setup({
      'GET /api/post-feeds': [
        { id: 'f-1', postId: 'p-old', feedType: 'organization', targetId: 'o-1' },
        { id: 'f-2', postId: 'p-new', feedType: 'organization', targetId: 'o-1' },
        { id: 'f-3', postId: 'p-other', feedType: 'organization', targetId: 'o-2' },
        { id: 'f-4', postId: 'p-group', feedType: 'group', targetId: 'o-1' },
      ],
      'GET /api/posts': [
        postRow('p-old', 'Older', '2026-10-20T10:00:00Z'),
        postRow('p-new', 'Newer', '2026-10-25T10:00:00Z'),
        postRow('p-other', 'Elsewhere', '2026-10-25T10:00:00Z'),
        postRow('p-group', 'A community post', '2026-10-25T10:00:00Z'),
      ],
    });
    await act(async () => {
      await result.current.organizations.loadOrganizationPosts('o-1');
    });
    expect(result.current.feed.organizationFeed?.organizationId).toBe('o-1');
    expect(result.current.feed.organizationFeed?.posts.map((p) => p.id)).toEqual(['p-new', 'p-old']);
    expect(result.current.organizations.organizationPostsLoading).toBe(false);
  });

  it('a failed read reports why and keeps what was there', async () => {
    const { result, showToast } = setup({ 'GET /api/post-feeds': { status: 500, body: { title: 'boom' } } });
    await act(async () => {
      await result.current.organizations.loadOrganizationPosts('o-1');
    });
    expect(showToast).toHaveBeenCalledWith('The organization posts could not be loaded');
    expect(result.current.feed.organizationFeed).toBeNull();
    expect(result.current.organizations.organizationPostsLoading).toBe(false);
  });
});

describe('useOrganizations.createOrganizationPost', () => {
  it('an owner posts: the post is written, linked with an organization row (never a group row), and shown in the organization', async () => {
    const links: unknown[] = [];
    const posts: unknown[] = [];
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': [row('m-1', 'o-1', ME, 'owner')],
      'GET /api/post-feeds': () => links,
      'GET /api/posts': () => posts,
      'POST /api/posts': () => {
        posts.push(postRow('p-new', 'Hello org', '2026-10-26T09:00:00Z', ME));
        return { status: 201, body: postRow('p-new', 'Hello org', '2026-10-26T09:00:00Z', ME) };
      },
      'POST /api/post-feeds': (call) => {
        const body = call.body as { postId: string; feedType: string; targetId: string };
        const created = { id: 'f-9', ...body };
        links.push(created);
        return { status: 201, body: created };
      },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await act(async () => {
      await result.current.organizations.createOrganizationPost('o-1', 'Hello org', 'text', {});
    });
    const link = calls.find((c) => isCall(c, 'POST', '/api/post-feeds'));
    expect(link?.body).toEqual({ postId: 'p-new', feedType: 'organization', targetId: 'o-1' });
    expect(calls.some((c) => c.body && (c.body as { feedType?: string }).feedType === 'group')).toBe(false);
    expect(result.current.feed.organizationFeed?.posts.map((p) => p.id)).toEqual(['p-new']);
    expect(result.current.feed.posts[0]).toMatchObject({ id: 'p-new', organizationId: 'o-1', organizationName: 'Org o-1' });
  });

  it('an admin may post; a plain member is refused before any request is sent', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ANA), org('o-2', ANA)],
      'GET /api/organization-members': [
        row('m-1', 'o-1', ME, 'admin'),
        row('m-2', 'o-2', ME, 'member'),
      ],
      'POST /api/posts': { status: 201, body: postRow('p-admin', 'From an admin', '2026-10-26T09:00:00Z', ME) },
      'POST /api/post-feeds': { status: 201, body: { id: 'f-1', postId: 'p-admin', feedType: 'organization', targetId: 'o-1' } },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await act(async () => {
      await result.current.organizations.createOrganizationPost('o-1', 'From an admin', 'text', {});
    });
    expect(calls.some((c) => isCall(c, 'POST', '/api/posts'))).toBe(true);

    calls.length = 0;
    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.organizations.createOrganizationPost('o-2', 'Should not post', 'text', {});
      } catch (err) {
        caught = err;
      }
    });
    expect((caught as Error).message).toBe('Only the owner or an admin can post for this organization.');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('when the link is refused, the just-created post is deleted and the reason is raised', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': [row('m-1', 'o-1', ME, 'owner')],
      'POST /api/posts': { status: 201, body: postRow('p-lost', 'Lost', '2026-10-26T09:00:00Z', ME) },
      'POST /api/post-feeds': { status: 403, body: { detail: 'Not allowed here' } },
      'DELETE /api/posts/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.organizations.createOrganizationPost('o-1', 'Lost', 'text', {});
      } catch (err) {
        caught = err;
      }
    });
    expect((caught as Error).message).toContain('Not allowed here');
    await vi.waitFor(() => expect(calls.some((c) => isCall(c, 'DELETE', '/api/posts/p-lost'))).toBe(true));
    expect(result.current.feed.posts).toEqual([]);
  });
});

describe('useOrganizations.removePostFromOrganization', () => {
  const feedRows = [
    { id: 'f-1', postId: 'p-1', feedType: 'organization', targetId: 'o-1' },
    { id: 'f-2', postId: 'p-2', feedType: 'organization', targetId: 'o-1' },
    { id: 'f-3', postId: 'p-1', feedType: 'group', targetId: 'g-1' },
  ];

  it('deletes only the organization link of this post, never the post itself or other links', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': [row('m-1', 'o-1', ME, 'owner')],
      'GET /api/post-feeds': feedRows,
      'GET /api/posts': [postRow('p-1', 'Moved out', '2026-10-25T10:00:00Z'), postRow('p-2', 'Stays', '2026-10-25T10:00:00Z')],
      'DELETE /api/post-feeds/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await act(async () => {
      await result.current.organizations.removePostFromOrganization('o-1', 'p-1');
    });
    const deletes = calls.filter((c) => c.method === 'DELETE').map((c) => c.path);
    expect(deletes).toEqual(['/api/post-feeds/f-1']);
    expect(calls.some((c) => c.method === 'DELETE' && c.path.startsWith('/api/posts'))).toBe(false);
  });

  it('a non-owner (even an admin) is refused before any request', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-1', 'o-1', ANA, 'owner'), row('m-2', 'o-1', ME, 'admin')],
      'GET /api/post-feeds': feedRows,
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await expect(result.current.organizations.removePostFromOrganization('o-1', 'p-1')).rejects.toThrow(
      'Only the owner can remove posts from this organization.',
    );
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('a refused delete rejects with the server reason and leaves the post in the organization', async () => {
    const { result } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': [row('m-1', 'o-1', ME, 'owner')],
      'GET /api/post-feeds': [{ id: 'f-1', postId: 'p-1', feedType: 'organization', targetId: 'o-1' }],
      'GET /api/posts': [postRow('p-1', 'Still here', '2026-10-25T10:00:00Z')],
      'DELETE /api/post-feeds/{id}': { status: 403, body: { detail: 'Only the owner can remove posts' } },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
      await result.current.organizations.loadOrganizationPosts('o-1');
    });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.organizations.removePostFromOrganization('o-1', 'p-1');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toContain('Only the owner can remove posts');
    expect(result.current.feed.organizationFeed?.posts.map((p) => p.id)).toEqual(['p-1']);
  });
});

describe('useOrganizations.removeOrganizationMember', () => {
  const memberRows = [
    row('m-owner', 'o-1', ME, 'owner'),
    row('m-ben', 'o-1', BEN, 'member'),
  ];

  it('the owner removes a member: the row is deleted and the list and count change only after the 2xx', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': memberRows,
      'DELETE /api/organization-members/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    expect(result.current.organizations.organizations[0].memberCount).toBe(2);
    await act(async () => {
      await result.current.organizations.removeOrganizationMember('o-1', 'm-ben');
    });
    expect(calls.find((c) => c.method === 'DELETE')?.path).toBe('/api/organization-members/m-ben');
    expect(result.current.organizations.organizations[0].memberCount).toBe(1);
  });

  it('never removes the owner row: nothing is sent', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': memberRows,
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await expect(result.current.organizations.removeOrganizationMember('o-1', 'm-owner')).rejects.toThrow(
      'The owner cannot be removed from the organization.',
    );
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('a non-owner cannot remove anyone: nothing is sent', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-ana', 'o-1', ANA, 'owner'), row('m-me', 'o-1', ME, 'member'), row('m-ben', 'o-1', BEN, 'member')],
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await expect(result.current.organizations.removeOrganizationMember('o-1', 'm-ben')).rejects.toThrow(
      'Only the owner can remove members from this organization.',
    );
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('a refused removal rejects with the server reason and keeps the member in the list', async () => {
    const { result } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': memberRows,
      'DELETE /api/organization-members/{id}': { status: 500, body: { title: 'membership store down' } },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await expect(result.current.organizations.removeOrganizationMember('o-1', 'm-ben')).rejects.toThrow('membership store down');
    expect(result.current.organizations.organizations[0].memberCount).toBe(2);
  });
});

describe('useOrganizations.deleteOrganization post links (M11)', () => {
  it('deletes the organization post-feed rows of the deleted organization and leaves other rows alone', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': [row('m-1', 'o-1', ME, 'owner')],
      'DELETE /api/organizations/{id}': { status: 204 },
      'DELETE /api/organization-members/{id}': { status: 204 },
      'GET /api/post-feeds': [
        { id: 'f-1', postId: 'p-1', feedType: 'organization', targetId: 'o-1' },
        { id: 'f-2', postId: 'p-2', feedType: 'organization', targetId: 'o-2' },
        { id: 'f-3', postId: 'p-3', feedType: 'group', targetId: 'o-1' },
      ],
      'DELETE /api/post-feeds/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await act(async () => {
      await result.current.organizations.deleteOrganization('o-1');
    });
    const feedDeletes = calls.filter((c) => c.method === 'DELETE' && c.path.startsWith('/api/post-feeds')).map((c) => c.path);
    expect(feedDeletes).toEqual(['/api/post-feeds/f-1']);
    expect(result.current.organizations.organizations).toEqual([]);
  });

  it('a failure while removing the post links does not fail the delete', async () => {
    const { result } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': [row('m-1', 'o-1', ME, 'owner')],
      'DELETE /api/organizations/{id}': { status: 204 },
      'DELETE /api/organization-members/{id}': { status: 204 },
      'GET /api/post-feeds': { status: 500, body: { title: 'feeds down' } },
    });
    await act(async () => {
      await result.current.organizations.loadOrganizations();
    });
    await act(async () => {
      await expect(result.current.organizations.deleteOrganization('o-1')).resolves.toBeUndefined();
    });
    expect(result.current.organizations.organizations).toEqual([]);
  });
});
