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

const topComment = { id: 'c-1', targetType: 'Post', targetId: 'post-1', authorId: 'ben-3', parentCommentId: null, body: 'Top level' };
const replyComment = { id: 'c-2', targetType: 'Post', targetId: 'post-1', authorId: 'other-user', parentCommentId: 'c-1', body: 'A reply' };

/** Mock the routes, then load the feed with one post and the given engagement rows. */
async function loaded(routes: Record<string, unknown> = {}) {
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
  await act(async () => {
    await hook.result.current.loadFeed();
  });
  return { ...hook, calls, deps };
}

const post = (result: { current: ReturnType<typeof useFeed> }) => result.current.posts.find((p) => p.id === 'post-1')!;
const posted = (calls: RecordedCall[], path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);
const deleted = (calls: RecordedCall[], path: string) => calls.filter((c) => c.method === 'DELETE' && c.path === path);

describe('useFeed.addComment with a parent (replies)', () => {
  it('sends the parent id, appends the reply under it, and notifies the parent comment author', async () => {
    const { result, calls, deps } = await loaded({
      'GET /api/comments': [topComment],
      'POST /api/comments': { status: 201, body: { id: 'c-9' } },
    });
    await waitFor(() => expect(post({ current: result.current })?.comments).toHaveLength(1));

    await act(async () => {
      await result.current.addComment('post-1', 'Agreed', 'c-1');
    });

    expect(posted(calls, '/api/comments')[0].body).toEqual({
      targetType: 'Post',
      targetId: 'post-1',
      parentCommentId: 'c-1',
      body: 'Agreed',
    });
    const appended = post({ current: result.current }).comments.find((c) => c.id === 'c-9');
    expect(appended).toMatchObject({ content: 'Agreed', parentCommentId: 'c-1' });
    expect(deps.notify).toHaveBeenCalledWith('ben-3', 'comment', 'Comment', 'c-1');
    expect(deps.notify).not.toHaveBeenCalledWith(expect.anything(), 'comment', 'Post', 'post-1');
  });

  it('a top-level comment still sends a null parent and notifies the post author', async () => {
    const { result, calls, deps } = await loaded({ 'POST /api/comments': { status: 201, body: { id: 'c-8' } } });
    await act(async () => {
      await result.current.addComment('post-1', 'Hi');
    });
    expect(posted(calls, '/api/comments')[0].body).toMatchObject({ parentCommentId: null });
    expect(deps.notify).toHaveBeenCalledWith('author-2', 'comment', 'Post', 'post-1');
  });

  it('rejects with the server message and keeps the thread unchanged when the reply is refused', async () => {
    const { result } = await loaded({
      'GET /api/comments': [topComment],
      'POST /api/comments': { status: 400, body: { detail: 'Parent comment not found' } },
    });
    await waitFor(() => expect(post({ current: result.current })?.comments).toHaveLength(1));
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.addComment('post-1', 'Lost', 'c-1');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toBe('Your comment was not posted: Parent comment not found');
    expect(post({ current: result.current }).comments).toHaveLength(1);
  });
});

describe('useFeed.toggleCommentLike', () => {
  it('likes a comment: POST /api/reactions with targetType Comment, count goes up', async () => {
    const { result, calls } = await loaded({
      'GET /api/comments': [topComment],
      'POST /api/reactions': { status: 201, body: { id: 'r-1' } },
    });
    await waitFor(() => expect(post({ current: result.current })?.comments).toHaveLength(1));

    await act(async () => {
      await result.current.toggleCommentLike('post-1', 'c-1');
    });

    expect(posted(calls, '/api/reactions')[0].body).toEqual({ targetType: 'Comment', targetId: 'c-1', reactionType: 'like' });
    expect(post({ current: result.current }).comments[0]).toMatchObject({ likes: 1, likedByMe: true });
  });

  it('unlikes a comment I liked: DELETE /api/reactions/{id} with the id from the reactions list', async () => {
    const { result, calls } = await loaded({
      'GET /api/comments': [topComment],
      'GET /api/reactions': [{ id: 'r-mine', userId: ME, targetType: 'Comment', targetId: 'c-1', reactionType: 'like' }],
      'DELETE /api/reactions/{id}': { status: 204 },
    });
    await waitFor(() => expect(post({ current: result.current }).comments[0]?.likedByMe).toBe(true));

    await act(async () => {
      await result.current.toggleCommentLike('post-1', 'c-1');
    });

    expect(deleted(calls, '/api/reactions/r-mine')).toHaveLength(1);
    expect(post({ current: result.current }).comments[0]).toMatchObject({ likes: 0, likedByMe: false });
  });

  it('counts likes from other people on each comment and marks my own', async () => {
    const { result } = await loaded({
      'GET /api/comments': [topComment, replyComment],
      'GET /api/reactions': [
        { id: 'r-1', userId: 'someone', targetType: 'Comment', targetId: 'c-1', reactionType: 'like' },
        { id: 'r-2', userId: ME, targetType: 'Comment', targetId: 'c-1', reactionType: 'like' },
        { id: 'r-3', userId: 'someone', targetType: 'Post', targetId: 'post-1', reactionType: 'love' },
      ],
    });
    await waitFor(() => expect(post({ current: result.current }).comments).toHaveLength(2));
    const [top, reply] = post({ current: result.current }).comments;
    expect(top).toMatchObject({ id: 'c-1', likes: 2, likedByMe: true });
    expect(reply).toMatchObject({ id: 'c-2', likes: 0, likedByMe: false });
    expect(post({ current: result.current }).reactions.love).toBe(1);
  });

  it('rolls the like back and shows a toast when the server refuses it', async () => {
    const { result, deps } = await loaded({
      'GET /api/comments': [topComment],
      'POST /api/reactions': { status: 500, body: { title: 'boom' } },
    });
    await waitFor(() => expect(post({ current: result.current }).comments).toHaveLength(1));

    await act(async () => {
      await result.current.toggleCommentLike('post-1', 'c-1');
    });

    expect(post({ current: result.current }).comments[0]).toMatchObject({ likes: 0, likedByMe: false });
    expect(deps.showToast).toHaveBeenCalledTimes(1);
    expect(deps.showToast.mock.calls[0][0]).toMatch(/Your like was not saved/);
  });
});

describe('useFeed.deleteComment with replies', () => {
  it('keeps a deleted parent as a placeholder so its reply stays visible', async () => {
    const { result } = await loaded({
      'GET /api/comments': [topComment, replyComment],
      'DELETE /api/comments/{id}': { status: 204 },
    });
    await waitFor(() => expect(post({ current: result.current }).comments).toHaveLength(2));

    await act(async () => {
      await result.current.deleteComment('post-1', 'c-1');
    });

    const comments = post({ current: result.current }).comments;
    expect(comments.map((c) => c.id)).toEqual(['c-1', 'c-2']);
    expect(comments[0]).toMatchObject({ deleted: true, authorId: undefined, content: '' });
    expect(comments[1]).toMatchObject({ content: 'A reply', parentCommentId: 'c-1' });
  });
});
