import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeed } from './useFeed';
import { mockApi } from '../test/mockApi';
import type { UserProfile } from '../types';

const ME = 'me-0000-0000-0000-000000000001';
const OTHER = 'other-user';
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

const item = (postId: string, authorId: string) => ({
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

function setup() {
  const deps = { myUserId: { current: ME }, currentUser, notify: vi.fn(), showToast: vi.fn() };
  const hook = renderHook(() => useFeed(deps));
  return { ...hook, deps };
}

describe('useFeed.loadTimeline', () => {
  it('keeps the same function identity across re-renders (effects depend on it)', async () => {
    mockApi({ [`GET /api/feed/user/${OTHER}`]: [item('t1', OTHER)] });
    const { result, rerender } = setup();
    const first = result.current.loadTimeline;
    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });
    rerender();
    expect(result.current.loadTimeline).toBe(first);
  });

  it('calls GET /api/feed/user/{userId} and maps the posts into the timeline', async () => {
    const { calls } = mockApi({ [`GET /api/feed/user/${OTHER}`]: [item('t1', OTHER)] });
    const { result } = setup();

    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });

    const call = calls.find((c) => c.method === 'GET' && c.path === `/api/feed/user/${OTHER}`);
    expect(call).toBeDefined();
    expect(result.current.timeline).toMatchObject({ userId: OTHER, loading: false, error: null });
    expect(result.current.timeline?.posts).toHaveLength(1);
    expect(result.current.timeline?.posts[0]).toMatchObject({ id: 't1', content: 'Body of t1', authorId: OTHER });
    // The home feed is untouched by a profile load.
    expect(result.current.posts).toEqual([]);
  });

  it('records a readable error when the timeline cannot be read (500)', async () => {
    mockApi({ [`GET /api/feed/user/${OTHER}`]: { status: 500, body: { title: 'boom' } } });
    const { result } = setup();

    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });

    expect(result.current.timeline?.loading).toBe(false);
    expect(result.current.timeline?.posts).toEqual([]);
    expect(result.current.timeline?.error).toMatch(/Could not load these posts/);
  });
});

describe('useFeed post mutations on a timeline', () => {
  it('reacting to a post that exists only in the timeline updates it there and sends POST /api/reactions', async () => {
    const { calls } = mockApi({
      [`GET /api/feed/user/${OTHER}`]: [item('t1', OTHER)],
      'POST /api/reactions': { status: 201, body: { id: 'r1' } },
    });
    const { result, deps } = setup();
    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });

    act(() => {
      result.current.reactToPost('t1', 'love');
    });

    expect(result.current.timeline?.posts[0].reactions.love).toBe(1);
    expect(result.current.timeline?.posts[0].currentUserReaction).toBe('love');
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/reactions')).toBe(true));
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/reactions');
    expect(post?.body).toEqual({ targetType: 'Post', targetId: 't1', reactionType: 'love' });
    expect(deps.showToast).not.toHaveBeenCalled();
  });

  it('rolls back a timeline reaction and shows a toast when the POST fails', async () => {
    mockApi({
      [`GET /api/feed/user/${OTHER}`]: [item('t1', OTHER)],
      'POST /api/reactions': { status: 500, body: { title: 'boom' } },
    });
    const { result, deps } = setup();
    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });

    act(() => {
      result.current.reactToPost('t1', 'like');
    });

    await waitFor(() => expect(deps.showToast).toHaveBeenCalled());
    expect(typeof deps.showToast.mock.calls[0][0]).toBe('string');
    expect(deps.showToast.mock.calls[0][0].length).toBeGreaterThan(0);
    await waitFor(() => expect(result.current.timeline?.posts[0].reactions.like).toBe(0));
  });

  it('a comment on a timeline post lands in the timeline', async () => {
    mockApi({
      [`GET /api/feed/user/${OTHER}`]: [item('t1', OTHER)],
      'POST /api/comments': { status: 201, body: { id: 'c1' } },
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });

    await act(async () => {
      await result.current.addComment('t1', 'Nice');
    });

    expect(result.current.timeline?.posts[0].comments).toHaveLength(1);
    expect(result.current.timeline?.posts[0].comments[0]).toMatchObject({ id: 'c1', content: 'Nice' });
  });

  it('deleting a post removes it from the timeline', async () => {
    mockApi({
      [`GET /api/feed/user/${OTHER}`]: [item('t1', OTHER), item('t2', OTHER)],
      'DELETE /api/posts/{id}': { status: 204 },
      'GET /api/post-medias': [],
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });

    await act(async () => {
      await result.current.deletePost('t1');
    });

    expect(result.current.timeline?.posts.map((p) => p.id)).toEqual(['t2']);
  });

  it('reset forgets the timeline', async () => {
    mockApi({ [`GET /api/feed/user/${OTHER}`]: [item('t1', OTHER)] });
    const { result } = setup();
    await act(async () => {
      await result.current.loadTimeline(OTHER);
    });
    act(() => result.current.reset());
    expect(result.current.timeline).toBeNull();
  });
});
