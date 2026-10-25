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

const feedItem = (postId: string, authorId: string) => ({
  postId,
  authorId,
  body: `Body of ${postId}`,
  contentType: 'text',
  visibility: 'public',
  publishedAt: '2026-10-24T10:00:00Z',
  author: { displayName: 'Ana', avatarUrl: null },
  commentCount: 0,
  reactionCount: 0,
  score: 0,
});

/** Mock the routes, then load the feed: post-1 is mine, post-2 is someone else's. */
async function loadedFeed(routes: Record<string, unknown> = {}) {
  const { calls } = mockApi({
    'GET /api/feed/home': [feedItem('post-1', ME), feedItem('post-2', 'other-user')],
    ...routes,
  });
  const deps = { myUserId: { current: ME }, currentUser, notify: vi.fn(), showToast: vi.fn() };
  const hook = renderHook(() => useFeed(deps));
  await act(async () => {
    await hook.result.current.loadFeed();
  });
  return { ...hook, calls };
}

const isDelete = (c: RecordedCall, path: string) => c.method === 'DELETE' && c.path === path;

describe('useFeed.deletePost', () => {
  it('sends DELETE /api/posts/{id} and removes the post from the feed on success', async () => {
    const { result, calls } = await loadedFeed({
      'DELETE /api/posts/{id}': { status: 204 },
      'GET /api/post-medias': [],
    });
    await act(async () => {
      await result.current.deletePost('post-1');
    });
    expect(calls.some((c) => isDelete(c, '/api/posts/post-1'))).toBe(true);
    expect(result.current.posts.map((p) => p.id)).toEqual(['post-2']);
  });

  it('deletes only the media rows of that post, and no engagement rows', async () => {
    const { result, calls } = await loadedFeed({
      'DELETE /api/posts/{id}': { status: 204 },
      'GET /api/post-medias': [
        { id: 'm-1', postId: 'post-1', fileUrl: '/blobs/a.png', mediaType: 'image', position: 0 },
        { id: 'm-2', postId: 'post-2', fileUrl: '/blobs/b.png', mediaType: 'image', position: 0 },
      ],
      'DELETE /api/post-medias/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.deletePost('post-1');
    });
    await waitFor(() => expect(calls.some((c) => isDelete(c, '/api/post-medias/m-1'))).toBe(true));
    expect(calls.some((c) => isDelete(c, '/api/post-medias/m-2'))).toBe(false);
    const engagementDeletes = calls.filter(
      (c) => c.method === 'DELETE' && /^\/api\/(comments|reactions|shares)/.test(c.path),
    );
    expect(engagementDeletes).toHaveLength(0);
  });

  it('keeps the post and rejects with the server message when the delete fails', async () => {
    const { result, calls } = await loadedFeed({
      'DELETE /api/posts/{id}': { status: 403, body: { detail: 'Only the author can delete this post' } },
      'GET /api/post-medias': [],
    });
    await expect(result.current.deletePost('post-1')).rejects.toThrow(
      'The post was not deleted: Only the author can delete this post',
    );
    expect(result.current.posts.map((p) => p.id)).toEqual(['post-1', 'post-2']);
    expect(calls.some((c) => c.method === 'DELETE' && c.path.startsWith('/api/post-medias/'))).toBe(false);
  });
});

describe('useFeed.deleteComment', () => {
  const comments = [
    { id: 'c-1', targetType: 'Post', targetId: 'post-1', authorId: ME, body: 'mine' },
    { id: 'c-2', targetType: 'Post', targetId: 'post-1', authorId: 'other-user', body: 'theirs' },
  ];

  it('sends DELETE /api/comments/{id} and removes that comment from the thread', async () => {
    const { result, calls } = await loadedFeed({
      'GET /api/comments': comments,
      'DELETE /api/comments/{id}': { status: 204 },
    });
    await waitFor(() => expect(result.current.posts.find((p) => p.id === 'post-1')?.comments).toHaveLength(2));
    await act(async () => {
      await result.current.deleteComment('post-1', 'c-1');
    });
    expect(calls.some((c) => isDelete(c, '/api/comments/c-1'))).toBe(true);
    expect(result.current.posts.find((p) => p.id === 'post-1')?.comments.map((c) => c.id)).toEqual(['c-2']);
  });

  it('keeps the comment and rejects with a readable message when the delete fails', async () => {
    const { result } = await loadedFeed({
      'GET /api/comments': comments,
      'DELETE /api/comments/{id}': { status: 500, body: { title: 'boom' } },
    });
    await waitFor(() => expect(result.current.posts.find((p) => p.id === 'post-1')?.comments).toHaveLength(2));
    await expect(result.current.deleteComment('post-1', 'c-1')).rejects.toThrow('The comment was not deleted: boom');
    expect(result.current.posts.find((p) => p.id === 'post-1')?.comments).toHaveLength(2);
  });
});
