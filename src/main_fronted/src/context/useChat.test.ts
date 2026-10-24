import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { mockApi } from '../test/mockApi';
import { connectChatHub } from '../api/realtime';

// The SignalR hub is a live socket; the hook only needs its promise behaviour here.
vi.mock('../api/realtime', () => ({
  connectChatHub: vi.fn(async () => ({})),
  joinChat: vi.fn(async () => {}),
  sendChatMessage: vi.fn(async () => {}),
  onChatMessage: vi.fn(() => () => {}),
  disconnectChatHub: vi.fn(async () => {}),
}));

const ME = 'me-0000-0000-0000-000000000001';

function setup(showToast = vi.fn()) {
  return renderHook(() =>
    useChat({ myUserId: { current: ME }, currentUserId: ME, isAuthenticated: true, showToast }),
  );
}

describe('useChat threads loading flag', () => {
  beforeEach(() => {
    vi.mocked(connectChatHub).mockReset().mockResolvedValue({} as never);
  });

  it('is true before the list loads and false once it loads', async () => {
    mockApi({ 'GET /api/chat-participants': [], 'GET /api/messages': [] });
    const { result } = setup();
    expect(result.current.threadsLoading).toBe(true);
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    expect(result.current.chatThreads).toEqual([]);
  });

  it('becomes false when the server answers 500, and the list stays empty', async () => {
    mockApi({ 'GET /api/chat-participants': { status: 500, body: { title: 'boom' } }, 'GET /api/messages': [] });
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    expect(result.current.chatThreads).toEqual([]);
  });

  it('becomes false when the live connection fails, and tells the user why', async () => {
    vi.mocked(connectChatHub).mockRejectedValueOnce(new Error('hub down'));
    mockApi({ 'GET /api/chat-participants': [], 'GET /api/messages': [] });
    const showToast = vi.fn();
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Live chat is unavailable/), 'info');
  });
});
