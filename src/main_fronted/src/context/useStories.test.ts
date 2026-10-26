import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStories, groupStoriesByAuthor, isLive, type Story } from './useStories';
import { mockApi, type RecordedCall } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';
const HOUR = 3600_000;
const future = (h: number) => new Date(Date.now() + h * HOUR).toISOString();
const past = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const isPost = (c: RecordedCall, path: string) => c.method === 'POST' && c.path === path;

const storyDto = (id: string, authorId: string, expiresAt: string) => ({
  id,
  authorId,
  mediaType: 'image',
  mediaUrl: `/blobs/${id}.png`,
  caption: null,
  visibility: 'public',
  expiresAt,
});

const story = (id: string, authorId: string, authorName: string, expiresAt: string): Story => ({
  id,
  authorId,
  authorName,
  authorAvatar: '',
  mediaType: 'image',
  mediaUrl: `/blobs/${id}.png`,
  caption: '',
  expiresAt,
});

describe('story expiry', () => {
  it('is live until the expiry time, and an unreadable expiry is kept', () => {
    expect(isLive({ expiresAt: future(1) })).toBe(true);
    expect(isLive({ expiresAt: past(1) })).toBe(false);
    expect(isLive({ expiresAt: 'not a date' })).toBe(true);
  });

  it('loadStories drops stories whose expiry has passed', async () => {
    mockApi({
      'GET /api/stories': [storyDto('live', 'author-2', future(5)), storyDto('old', 'author-2', past(1))],
      'GET /api/profiles/{userId}': { status: 404 },
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify: vi.fn() }));
    await act(async () => {
      await result.current.loadStories();
    });
    expect(result.current.stories.map((s) => s.id)).toEqual(['live']);
  });
});

describe('groupStoriesByAuthor', () => {
  it('puts me first, the others by their newest story, and each author oldest story first', () => {
    const stories = [
      story('b-late', 'ana', 'Ana', future(20)),
      story('b-early', 'ana', 'Ana', future(2)),
      story('c', 'ben', 'Ben', future(10)),
      story('m', ME, 'Test User', future(1)),
      story('gone', 'old', 'Old', past(1)),
    ];
    const groups = groupStoriesByAuthor(stories, ME);
    expect(groups.map((g) => g.authorId)).toEqual([ME, 'ana', 'ben']);
    expect(groups[1].stories.map((s) => s.id)).toEqual(['b-early', 'b-late']);
  });
});

describe('useStories.replyToStory', () => {
  it('posts the trimmed reply with my id and notifies the author', async () => {
    const notify = vi.fn();
    const { calls } = mockApi({
      'GET /api/stories': [storyDto('s-1', 'author-2', future(5))],
      'GET /api/profiles/{userId}': { status: 404 },
      'POST /api/story-replies': { status: 201, body: { id: 'r-1', storyId: 's-1', userId: ME, body: 'Nice' } },
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify }));
    await act(async () => {
      await result.current.loadStories();
    });
    await act(async () => {
      await result.current.replyToStory('s-1', '  Nice  ');
    });
    expect(calls.find((c) => isPost(c, '/api/story-replies'))?.body).toEqual({ storyId: 's-1', userId: ME, body: 'Nice' });
    expect(notify).toHaveBeenCalledWith('author-2', 'story_reply', 'Story', 's-1');
  });

  it('rejects with "Your reply was not sent" and the reason, and does not notify', async () => {
    const notify = vi.fn();
    mockApi({
      'GET /api/stories': [storyDto('s-1', 'author-2', future(5))],
      'GET /api/profiles/{userId}': { status: 404 },
      'POST /api/story-replies': { status: 400, body: { detail: 'Replies are closed' } },
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify }));
    await act(async () => {
      await result.current.loadStories();
    });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.replyToStory('s-1', 'Hi');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toBe('Your reply was not sent: Replies are closed');
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('useStories.loadReplies', () => {
  it('returns only the replies to this story, with the replier resolved', async () => {
    mockApi({
      'GET /api/story-replies': [
        { id: 'r-1', storyId: 's-1', userId: 'ana', body: 'Hello' },
        { id: 'r-2', storyId: 's-2', userId: 'ben', body: 'Elsewhere' },
      ],
      'GET /api/profiles/{userId}': { userId: 'ana', displayName: 'Ana Ruiz', handle: 'ana', avatarUrl: null },
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify: vi.fn() }));
    let replies: Awaited<ReturnType<typeof result.current.loadReplies>> = [];
    await act(async () => {
      replies = await result.current.loadReplies('s-1');
    });
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ id: 'r-1', body: 'Hello', authorName: 'Ana Ruiz', handle: '@ana' });
  });

  it('rejects with "Replies could not be loaded" and the server reason when the list fails', async () => {
    mockApi({
      'GET /api/story-replies': { status: 500, body: { title: 'boom' } },
      'GET /api/profiles/{userId}': { status: 404 },
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify: vi.fn() }));
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.loadReplies('s-1');
      } catch (e) {
        error = e;
      }
    });
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/^Replies could not be loaded/);
    expect((error as Error).message).toContain('boom');
  });
});

describe('useStories.addStory', () => {
  it('shares a video story with mediaType video and a 24 h expiry', async () => {
    const { calls } = mockApi({
      'POST /api/stories': { status: 201, body: storyDto('s-9', ME, future(24)) },
      'GET /api/stories': [],
    });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify: vi.fn() }));
    await act(async () => {
      await result.current.addStory('/blobs/v.mp4', '', 'video');
    });
    const body = calls.find((c) => isPost(c, '/api/stories'))?.body as { mediaType: string; expiresAt: string; authorId: string };
    expect(body.mediaType).toBe('video');
    expect(body.authorId).toBe(ME);
    expect(Date.parse(body.expiresAt) - Date.now()).toBeGreaterThan(23 * HOUR);
  });

  it('rejects with the server reason and keeps nothing when the share is refused', async () => {
    mockApi({ 'POST /api/stories': { status: 413, body: { detail: 'File too large' } } });
    const { result } = renderHook(() => useStories({ myUserId: { current: ME }, notify: vi.fn() }));
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.addStory('/blobs/a.png', '');
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toBe('Your story was not shared: File too large');
    expect(result.current.stories).toEqual([]);
  });
});
