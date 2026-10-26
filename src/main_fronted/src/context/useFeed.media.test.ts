import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeed } from './useFeed';
import { mockApi, type RecordedCall } from '../test/mockApi';
import type { UserProfile } from '../types';

const ME = 'me-0000-0000-0000-000000000001';
const currentUser: UserProfile = {
  id: ME,
  username: 'me',
  name: 'Test User',
  handle: '@me',
  avatar: '',
  bio: '',
  coverPhoto: '',
  followersCount: 0,
  followingCount: 0,
  interests: [],
};

const feedItem = {
  postId: 'post-1',
  authorId: 'author-2',
  body: 'Body of post-1',
  contentType: 'text',
  visibility: 'public',
  publishedAt: '2026-10-24T10:00:00Z',
  author: { displayName: 'Ana', avatarUrl: null },
  commentCount: 0,
  reactionCount: 0,
  score: 0,
};

function setup(routes: Record<string, unknown> = {}) {
  const { calls } = mockApi({
    'GET /api/feed/home': [feedItem],
    'GET /api/comments': [],
    'GET /api/reactions': [],
    'GET /api/shares': [],
    'GET /api/post-medias': [],
    'GET /api/profiles/{userId}': { status: 404 },
    ...routes,
  });
  const deps = { myUserId: { current: ME }, currentUser, notify: vi.fn(), showToast: vi.fn() };
  const hook = renderHook(() => useFeed(deps));
  return { ...hook, calls, deps };
}

const isPost = (c: RecordedCall, path: string) => c.method === 'POST' && c.path === path;

// The new post as the composed feed returns it after createPost reconciles the feed.
const newFeedItem = { ...feedItem, postId: 'post-new', authorId: ME, body: 'Trip' };
const mediaRow = (position: number, fileUrl: string) => ({ id: `m-${position}`, postId: 'post-new', fileUrl, mediaType: 'image', position });

describe('useFeed.sharePost', () => {
  it('shares without a message as commentary null', async () => {
    const { result, calls } = setup({ 'POST /api/shares': { status: 201, body: { id: 's-1' } } });
    await act(async () => {
      await result.current.loadFeed();
    });
    await act(async () => {
      await result.current.sharePost('post-1');
    });
    expect(calls.find((c) => isPost(c, '/api/shares'))?.body).toEqual({ targetType: 'Post', targetId: 'post-1', commentary: null });
    expect(result.current.posts[0].sharesCount).toBe(1);
  });

  it('shares with a trimmed message as commentary', async () => {
    const { result, calls } = setup({ 'POST /api/shares': { status: 201, body: { id: 's-2' } } });
    await act(async () => {
      await result.current.loadFeed();
    });
    await act(async () => {
      await result.current.sharePost('post-1', '  Worth a read  ');
    });
    expect(calls.find((c) => isPost(c, '/api/shares'))?.body).toMatchObject({ commentary: 'Worth a read' });
  });

  it('rolls the count back, toasts, and rejects when the server refuses the share', async () => {
    const { result, deps } = setup({ 'POST /api/shares': { status: 403, body: { detail: 'Not allowed to share' } } });
    await act(async () => {
      await result.current.loadFeed();
    });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.sharePost('post-1', 'Hi');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toBe('The post was not shared: Not allowed to share');
    expect(result.current.posts[0].sharesCount).toBe(0);
    expect(deps.showToast).toHaveBeenCalledWith('The post was not shared: Not allowed to share');
  });
});

describe('useFeed.createPost with several images', () => {
  it('creates one post-media row per image, positions 0..n-1 in the order chosen', async () => {
    const { result, calls } = setup({
      'GET /api/feed/home': [feedItem, newFeedItem],
      'GET /api/post-medias': [mediaRow(0, '/blobs/a.png'), mediaRow(1, '/blobs/b.png'), mediaRow(2, '/blobs/c.png')],
      'POST /api/posts': { status: 201, body: { ...feedItem, id: 'post-new', authorId: ME, body: 'Trip' } },
      'POST /api/post-medias': { status: 201, body: { id: 'm' } },
    });
    await act(async () => {
      await result.current.loadFeed();
    });
    await act(async () => {
      await result.current.addPost('Trip', 'image', { imageUrls: ['/blobs/a.png', '/blobs/b.png', '/blobs/c.png'] });
    });
    const rows = calls.filter((c) => isPost(c, '/api/post-medias')).map((c) => c.body as { fileUrl: string; position: number; mediaType: string });
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
    expect(rows.map((r) => r.fileUrl)).toEqual(['/blobs/a.png', '/blobs/b.png', '/blobs/c.png']);
    expect(rows.every((r) => r.mediaType === 'image')).toBe(true);
    await waitFor(() => expect(result.current.posts.find((p) => p.id === 'post-new')?.images).toHaveLength(3));
    const created = result.current.posts.find((p) => p.id === 'post-new');
    expect(created?.imageUrl).toBe(created?.images?.[0]);
    expect(created?.images?.[2]).toMatch(/c\.png$/);
  });

  it('keeps the post when one image fails, shows the others, and toasts "1 of 3"', async () => {
    let n = 0;
    const { result, deps } = setup({
      'GET /api/feed/home': [feedItem, newFeedItem],
      // Only the two rows that were saved exist on the server.
      'GET /api/post-medias': [mediaRow(0, '/blobs/a.png'), mediaRow(2, '/blobs/c.png')],
      'POST /api/posts': { status: 201, body: { ...feedItem, id: 'post-new', authorId: ME, body: 'Trip' } },
      'POST /api/post-medias': () => {
        n += 1;
        return n === 2 ? { status: 500, body: { title: 'boom' } } : { status: 201, body: { id: `m-${n}` } };
      },
    });
    await act(async () => {
      await result.current.loadFeed();
    });
    await act(async () => {
      await result.current.addPost('Trip', 'image', { imageUrls: ['/blobs/a.png', '/blobs/b.png', '/blobs/c.png'] });
    });
    expect(deps.showToast).toHaveBeenCalledWith('1 of 3 images were not attached');
    await waitFor(() => expect(result.current.posts.find((p) => p.id === 'post-new')?.images).toHaveLength(2));
    expect(result.current.posts.find((p) => p.id === 'post-new')?.type).toBe('image');
  });
});
