import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeed } from './useFeed';
import { mockApi } from '../test/mockApi';
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
  postId: 'p1',
  authorId: 'a1',
  body: 'Hello feed',
  contentType: 'text',
  visibility: 'public',
  publishedAt: '2026-10-24T10:00:00Z',
  author: { displayName: 'Ana', avatarUrl: null },
  commentCount: 0,
  reactionCount: 0,
  score: 0,
};

function setup() {
  const deps = {
    myUserId: { current: ME },
    currentUser,
    notify: vi.fn(),
    showToast: vi.fn(),
  };
  const hook = renderHook(() => useFeed(deps));
  return { ...hook, deps };
}

describe('useFeed.loadFeed', () => {
  it('calls GET /api/feed/home and maps the items to posts', async () => {
    const { calls } = mockApi({ 'GET /api/feed/home': [feedItem] });
    const { result } = setup();

    await act(async () => {
      await result.current.loadFeed();
    });

    const feedCall = calls.find((c) => c.method === 'GET' && c.path === '/api/feed/home');
    expect(feedCall).toBeDefined();
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0]).toMatchObject({ id: 'p1', content: 'Hello feed', author: { name: 'Ana' } });
  });
});

describe('useFeed.addComment', () => {
  it('posts the comment against the post with a null parent and the body', async () => {
    const { calls } = mockApi({
      'GET /api/feed/home': [feedItem],
      'POST /api/comments': { status: 201, body: { id: 'c1' } },
    });
    const { result, deps } = setup();
    await act(async () => {
      await result.current.loadFeed();
    });

    await act(async () => {
      await result.current.addComment('p1', 'Nice one');
    });

    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/comments');
    expect(post?.body).toEqual({ targetType: 'Post', targetId: 'p1', parentCommentId: null, body: 'Nice one' });
    expect(result.current.posts[0].comments).toHaveLength(1);
    expect(result.current.posts[0].comments[0]).toMatchObject({ id: 'c1', content: 'Nice one' });
    expect(deps.notify).toHaveBeenCalledWith('a1', 'comment', 'Post', 'p1');
  });

  it('rejects with the server message on a 400 and does not append the comment', async () => {
    mockApi({
      'GET /api/feed/home': [feedItem],
      'POST /api/comments': { status: 400, body: { detail: 'Comment is too long' } },
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadFeed();
    });

    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.addComment('p1', 'x'.repeat(5000));
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Your comment was not posted: Comment is too long');
    expect(result.current.posts[0].comments).toHaveLength(0);
  });
});

describe('useFeed.reactToPost', () => {
  it('rolls back the optimistic count and shows a toast when the reaction POST fails', async () => {
    mockApi({
      'GET /api/feed/home': [feedItem],
      'POST /api/reactions': { status: 500, body: { title: 'boom' } },
    });
    const { result, deps } = setup();
    await act(async () => {
      await result.current.loadFeed();
    });

    act(() => {
      result.current.reactToPost('p1', 'like');
    });

    await waitFor(() => expect(deps.showToast).toHaveBeenCalled());
    const [message] = deps.showToast.mock.calls[0];
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
    await waitFor(() => expect(result.current.posts[0].reactions.like).toBe(0));
  });

  it('undoes a failed reaction inside a community view too (no loader re-reads that list)', async () => {
    mockApi({
      'GET /api/feed/home': [],
      'POST /api/reactions': { status: 500, body: { title: 'boom' } },
    });
    const { result, deps } = setup();
    const post = {
      id: 'gp1', type: 'text' as const, authorId: 'a1', author: { name: 'Ana', handle: '', avatar: '' },
      content: 'In the community', createdAt: '', comments: [], sharesCount: 0, currentUserReaction: null,
      reactions: { like: 2, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
    };
    act(() => result.current.setGroupFeed('g1', [post as never]));
    act(() => result.current.reactToPost('gp1', 'like'));
    expect(result.current.groupFeed!.posts[0].reactions.like).toBe(3);

    await waitFor(() => expect(deps.showToast).toHaveBeenCalled());
    await waitFor(() => expect(result.current.groupFeed!.posts[0].reactions.like).toBe(2));
    expect(result.current.groupFeed!.posts[0].currentUserReaction).toBeNull();
  });
});
