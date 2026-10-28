import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeed } from './useFeed';
import { mockApi, type RecordedCall } from '../test/mockApi';
import type { UserProfile } from '../types';

const ME = 'me-0000-0000-0000-000000000001';
const currentUser: UserProfile = {
  id: ME, username: 'me', name: 'Test User', handle: '@me', avatar: '', bio: '', coverPhoto: '',
  followersCount: 0, followingCount: 0, interests: [],
};

const postRow = (id: string, body: string) => ({
  id, authorId: ME, contentType: 'text', visibility: 'public', status: 'published', body, location: null,
  scheduledAt: null, publishedAt: '2026-10-26T09:00:00Z', archivedAt: null,
});

/** The feed hook alone, with the Posts routes a create needs. */
function setup(routes: Record<string, unknown> = {}) {
  const { calls } = mockApi({
    'GET /api/feed/home': [],
    'GET /api/post-feeds': [],
    'GET /api/post-medias': [],
    'POST /api/posts': { status: 201, body: postRow('p-new', 'Hello') },
    'POST /api/post-feeds': { status: 201, body: { id: 'f-1', postId: 'p-new', feedType: 'group', targetId: 'g-1' } },
    'POST /api/post-medias': { status: 201, body: { id: 'm-1', postId: 'p-new', fileUrl: '/blobs/a.png', mediaType: 'image', position: 0 } },
    'DELETE /api/posts/{id}': { status: 204 },
    ...routes,
  });
  const showToast = vi.fn();
  const hook = renderHook(() => useFeed({ myUserId: { current: ME }, currentUser, notify: vi.fn(), showToast }));
  return { ...hook, calls, showToast };
}

const isCall = (c: RecordedCall, method: string, path: string) => c.method === method && c.path === path;

/** The composed home feed as Feed.API returns it once the new post exists. */
const homeFeedWith = (postId: string) => [{
  postId, authorId: ME, body: 'Hello', contentType: 'text', visibility: 'public',
  publishedAt: '2026-10-26T09:00:00Z', author: { displayName: 'Test User', avatarUrl: null },
  commentCount: 0, reactionCount: 0, score: 0,
}];

describe('useFeed.createPostIn: home', () => {
  it('writes the post and shows it on my home feed, with no post-feed link', async () => {
    const { result, calls } = setup({ 'GET /api/feed/home': homeFeedWith('p-new') });
    let created: Awaited<ReturnType<typeof result.current.createPostIn>> | undefined;
    await act(async () => {
      created = await result.current.createPostIn({ kind: 'home' }, 'Hello', 'text', {});
    });
    expect(created).toMatchObject({ id: 'p-new' });
    expect(calls.some((c) => isCall(c, 'POST', '/api/posts'))).toBe(true);
    expect(calls.some((c) => c.path === '/api/post-feeds' && c.method === 'POST')).toBe(false);
    await vi.waitFor(() => expect(result.current.posts[0]).toMatchObject({ id: 'p-new' }));
    expect(result.current.posts[0].groupId).toBeUndefined();
  });

  it('rejects with the server reason and leaves the feed unchanged when the post is refused', async () => {
    const { result, calls } = setup({
      'POST /api/posts': { status: 403, body: { detail: 'Posts are closed' } },
    });
    await expect(
      act(async () => {
        await result.current.createPostIn({ kind: 'home' }, 'Hello', 'text', {});
      }),
    ).rejects.toThrow('Your post was not published: Posts are closed');
    expect(result.current.posts).toEqual([]);
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/post-feeds')).toBe(false);
  });
});

describe('useFeed.createPostIn: community', () => {
  it('links the post to the community with a group post-feed row and shows it on Home with the community name', async () => {
    const { result, calls } = setup();
    let created: Awaited<ReturnType<typeof result.current.createPostIn>> | undefined;
    await act(async () => {
      created = await result.current.createPostIn({ kind: 'group', id: 'g-1', name: 'Design Club' }, 'Hello', 'text', {});
    });
    const link = calls.find((c) => isCall(c, 'POST', '/api/post-feeds'));
    expect(link?.body).toEqual({ postId: 'p-new', feedType: 'group', targetId: 'g-1' });
    expect(created).toMatchObject({ id: 'p-new', groupId: 'g-1', groupName: 'Design Club' });
    expect(result.current.posts[0]).toMatchObject({ id: 'p-new', groupId: 'g-1', groupName: 'Design Club' });
    // A community post does not re-read the whole home feed.
    expect(calls.some((c) => isCall(c, 'GET', '/api/feed/home'))).toBe(false);
  });

  it('when the link is refused, deletes the just-created post and rejects with the reason', async () => {
    const { result, calls } = setup({
      'POST /api/post-feeds': { status: 403, body: { detail: 'Not a member' } },
    });
    await expect(
      act(async () => {
        await result.current.createPostIn({ kind: 'group', id: 'g-1', name: 'Design Club' }, 'Lost', 'text', {});
      }),
    ).rejects.toThrow('Your post was not added to the community: Not a member');
    await vi.waitFor(() => expect(calls.some((c) => isCall(c, 'DELETE', '/api/posts/p-new'))).toBe(true));
    expect(result.current.posts).toEqual([]);
  });

  it('writes the attachments before the link, so the link never points at a post with no media', async () => {
    const { result, calls } = setup();
    await act(async () => {
      await result.current.createPostIn(
        { kind: 'group', id: 'g-1', name: 'Design Club' },
        'Look',
        'image',
        { imageUrls: ['/blobs/a.png'] },
      );
    });
    const mediaAt = calls.findIndex((c) => isCall(c, 'POST', '/api/post-medias'));
    const linkAt = calls.findIndex((c) => isCall(c, 'POST', '/api/post-feeds'));
    expect(mediaAt).toBeGreaterThan(-1);
    expect(linkAt).toBeGreaterThan(mediaAt);
  });

  it('an organization post is linked with its own feed type and shows on Home with the organization name', async () => {
    const { result, calls } = setup();
    let created: Awaited<ReturnType<typeof result.current.createPostIn>> | undefined;
    await act(async () => {
      created = await result.current.createPostIn({ kind: 'organization', id: 'o-1', name: 'Acme' }, 'Hi', 'text', {});
    });
    const link = calls.find((c) => isCall(c, 'POST', '/api/post-feeds'));
    expect(link?.body).toEqual({ postId: 'p-new', feedType: 'organization', targetId: 'o-1' });
    expect(created).toMatchObject({ id: 'p-new', organizationId: 'o-1', organizationName: 'Acme' });
    expect(result.current.posts[0]).toMatchObject({ id: 'p-new', organizationId: 'o-1', organizationName: 'Acme' });
    expect(result.current.posts[0].groupId).toBeUndefined();
    expect(calls.some((c) => isCall(c, 'GET', '/api/feed/home'))).toBe(false);
  });

  it('when the organization link is refused, deletes the just-created post and rejects with the reason', async () => {
    const { result, calls } = setup({
      'POST /api/post-feeds': { status: 403, body: { detail: 'Not an admin' } },
    });
    await expect(
      act(async () => {
        await result.current.createPostIn({ kind: 'organization', id: 'o-1', name: 'Acme' }, 'Lost', 'text', {});
      }),
    ).rejects.toThrow('Your post was not added to the community: Not an admin');
    await vi.waitFor(() => expect(calls.some((c) => isCall(c, 'DELETE', '/api/posts/p-new'))).toBe(true));
    expect(result.current.posts).toEqual([]);
  });
});
