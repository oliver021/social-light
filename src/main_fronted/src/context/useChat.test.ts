import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChat, CHAT_REFRESH_MS } from './useChat';
import { mockApi, type RecordedCall } from '../test/mockApi';
import { connectChatHub, onChatMessage, sendChatMessage, joinChat, type MessageDto } from '../api/realtime';

// The SignalR hub is a live socket; the hook only needs its promise behaviour here.
vi.mock('../api/realtime', () => ({
  connectChatHub: vi.fn(async () => ({})),
  joinChat: vi.fn(async () => {}),
  sendChatMessage: vi.fn(async () => {}),
  onChatMessage: vi.fn(() => () => {}),
  disconnectChatHub: vi.fn(async () => {}),
}));

// Uploads go through XHR; the hook only needs the resolved url.
vi.mock('../api/gateway', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/gateway')>()),
  uploadMedia: vi.fn(async () => '/blobs/photo.png'),
}));

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'user-ana';
const BEN = 'user-ben';
const DM = 'chat-dm';

const participantRows = [
  { id: 'p1', chatId: DM, userId: ME, role: 'member' },
  { id: 'p2', chatId: DM, userId: ANA, role: 'member' },
];

const msg = (id: string, senderId: string) => ({ id, chatId: DM, senderId, contentType: 'text', content: `text ${id}`, editedAt: null });

/** The routes every test starts from: one DM with Ana, three messages (m1, m3 from Ana; m2 mine). */
function baseRoutes(extra: Record<string, unknown> = {}) {
  return {
    'GET /api/chat-participants': participantRows,
    'GET /api/messages': [msg('m1', ANA), msg('m2', ME), msg('m3', ANA)],
    'GET /api/chats': [{ id: DM, type: 'dm', title: null, createdBy: ME }],
    'GET /api/message-read-receipts': [],
    'GET /api/message-reactions': [],
    'GET /api/chat-pins': [],
    'GET /api/chat-mutes': [],
    'GET /api/profiles/{userId}': { userId: ANA, displayName: 'Ana Ruiz', handle: 'ana', avatarUrl: null },
    'POST /api/message-read-receipts': (call: RecordedCall) => ({
      id: `r-${(call.body as { messageId: string }).messageId}`,
      messageId: (call.body as { messageId: string }).messageId,
      userId: ME,
      readAt: (call.body as { readAt: string }).readAt,
    }),
    ...extra,
  };
}

function setup(showToast = vi.fn()) {
  return renderHook(() =>
    useChat({ myUserId: { current: ME }, currentUserId: ME, isAuthenticated: true, showToast }),
  );
}

const receiptCalls = (calls: RecordedCall[]) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/api/message-read-receipts');

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(connectChatHub).mockReset().mockResolvedValue({} as never);
  vi.mocked(joinChat).mockReset().mockResolvedValue(undefined);
  vi.mocked(sendChatMessage).mockReset().mockResolvedValue(undefined);
  vi.mocked(onChatMessage).mockReset().mockImplementation(() => () => {});
  setVisibility('visible');
});

afterEach(() => {
  // Drop the test override so the real visibilityState getter is back.
  delete (document as unknown as { visibilityState?: unknown }).visibilityState;
});

describe('useChat threads loading flag', () => {
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

describe('read receipts and unread counts', () => {
  it('opening a visible chat sends one receipt per unseen peer message, none for mine', async () => {
    const { calls } = mockApi(baseRoutes());
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    act(() => result.current.openChatWithUser({ id: ANA, name: 'Ana Ruiz', avatar: '', handle: '@ana' }));
    await waitFor(() => expect(receiptCalls(calls)).toHaveLength(2));
    expect(receiptCalls(calls).map((c) => (c.body as { messageId: string }).messageId)).toEqual(['m1', 'm3']);
    for (const c of receiptCalls(calls)) {
      const body = c.body as { userId: string; readAt: string };
      expect(body.userId).toBe(ME);
      expect(new Date(body.readAt).toISOString()).toBe(body.readAt);
    }
    expect(result.current.activeChats).toEqual([expect.objectContaining({ chatId: DM, kind: 'dm', userId: ANA })]);
  });

  it('sends no receipts while the document is hidden', async () => {
    setVisibility('hidden');
    const { calls } = mockApi(baseRoutes());
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    act(() => result.current.openChatWithUser({ id: ANA, name: 'Ana Ruiz', avatar: '', handle: '@ana' }));
    await waitFor(() => expect(result.current.activeChats).toHaveLength(1));
    act(() => result.current.markOpenChatsRead());
    expect(receiptCalls(calls)).toHaveLength(0);
  });

  it('an incoming peer message to an open window gets a receipt', async () => {
    let deliver: ((m: MessageDto) => void) | undefined;
    vi.mocked(onChatMessage).mockImplementation((h) => { deliver = h; return () => {}; });
    const { calls } = mockApi(baseRoutes());
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    act(() => result.current.openChatWithUser({ id: ANA, name: 'Ana Ruiz', avatar: '', handle: '@ana' }));
    await waitFor(() => expect(receiptCalls(calls)).toHaveLength(2));
    act(() => deliver!({ id: 'm4', chatId: DM, senderId: ANA, contentType: 'text', content: 'hi', editedAt: null }));
    await waitFor(() => expect(receiptCalls(calls).map((c) => (c.body as { messageId: string }).messageId)).toContain('m4'));
  });

  it('a muted chat does not count as unread', async () => {
    mockApi(baseRoutes({
      'GET /api/chat-mutes': [{ id: 'mute1', chatId: DM, userId: ME, mutedUntil: '2099-01-01T00:00:00.000Z' }],
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.chatThreads).toHaveLength(1));
    await waitFor(() => expect(result.current.chatThreads[0].muted).toBe(true));
    expect(result.current.chatThreads[0].unreadCount).toBe(0);
    expect(result.current.isChatMuted(DM)).toBe(true);
  });

  it('an unmuted chat counts its unread peer messages', async () => {
    mockApi(baseRoutes());
    const { result } = setup();
    await waitFor(() => expect(result.current.chatThreads).toHaveLength(1));
    // m1 and m3 are from Ana and have no receipt from me yet.
    expect(result.current.chatThreads[0].unreadCount).toBe(2);
    expect(result.current.chatThreads[0].unread).toBe(true);
  });

  it('a refused receipt leaves the unread count unchanged and is retried on the next pass', async () => {
    let refuse = true;
    const { calls } = mockApi(baseRoutes({
      'POST /api/message-read-receipts': (call: RecordedCall) => {
        if (refuse) return { status: 500, body: { title: 'busy' } };
        const messageId = (call.body as { messageId: string }).messageId;
        return { id: `r-${messageId}`, messageId, userId: ME, readAt: (call.body as { readAt: string }).readAt };
      },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    act(() => result.current.openChatWithUser({ id: ANA, name: 'Ana Ruiz', avatar: '', handle: '@ana' }));
    await waitFor(() => expect(receiptCalls(calls).length).toBeGreaterThan(0));
    expect(result.current.chatThreads[0].unreadCount).toBe(2);
    expect(result.current.chatMeta.receipts).toEqual([]);

    const refusedSoFar = receiptCalls(calls).length;
    refuse = false;
    act(() => result.current.markOpenChatsRead());
    await waitFor(() => expect(result.current.chatThreads[0].unreadCount).toBe(0));
    const retried = receiptCalls(calls).slice(refusedSoFar).map((c) => (c.body as { messageId: string }).messageId);
    expect(retried).toEqual(expect.arrayContaining(['m1', 'm3']));
  });
});

describe('reactions', () => {
  it('a swap sends DELETE of my old reaction, then POST of the new one', async () => {
    const { calls } = mockApi(baseRoutes({
      'GET /api/message-reactions': [{ id: 'r1', messageId: 'm1', userId: ME, reactionType: 'like' }],
      'DELETE /api/message-reactions/{id}': { status: 204 },
      'POST /api/message-reactions': (call: RecordedCall) => ({ id: 'r2', ...(call.body as object) }),
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.chatMeta.reactions).toHaveLength(1));
    await act(async () => { await result.current.reactToMessage('m1', 'love'); });

    const writes = calls.filter((c) => c.method !== 'GET' && c.path.startsWith('/api/message-reactions'));
    expect(writes.map((c) => `${c.method} ${c.path}`)).toEqual(['DELETE /api/message-reactions/r1', 'POST /api/message-reactions']);
    expect(writes[1].body).toEqual({ messageId: 'm1', userId: ME, reactionType: 'love' });
    expect(result.current.chatMeta.reactions.map((r) => r.reactionType)).toEqual(['love']);
  });

  it('a tap on my current reaction only removes it', async () => {
    const { calls } = mockApi(baseRoutes({
      'GET /api/message-reactions': [{ id: 'r1', messageId: 'm1', userId: ME, reactionType: 'like' }],
      'DELETE /api/message-reactions/{id}': { status: 204 },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.chatMeta.reactions).toHaveLength(1));
    await act(async () => { await result.current.reactToMessage('m1', 'like'); });
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/message-reactions')).toBe(false);
    expect(result.current.chatMeta.reactions).toEqual([]);
  });

  it('a refused removal shows the reason and keeps the reaction', async () => {
    const showToast = vi.fn();
    const { calls } = mockApi(baseRoutes({
      'GET /api/message-reactions': [{ id: 'r1', messageId: 'm1', userId: ME, reactionType: 'like' }],
      'DELETE /api/message-reactions/{id}': { status: 500, body: { title: 'nope' } },
    }));
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.chatMeta.reactions).toHaveLength(1));
    await act(async () => { await result.current.reactToMessage('m1', 'love'); });
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Your reaction was not removed/));
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/message-reactions')).toBe(false);
    expect(result.current.chatMeta.reactions.map((r) => r.id)).toEqual(['r1']);
  });

  it('a refused reaction shows the reason, keeps no reaction and re-reads the server state', async () => {
    const showToast = vi.fn();
    const { calls } = mockApi(baseRoutes({
      'POST /api/message-reactions': { status: 500, body: { title: 'nope' } },
    }));
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    const readsBefore = calls.filter((c) => c.method === 'GET' && c.path === '/api/message-reactions').length;
    await act(async () => { await result.current.reactToMessage('m1', 'love'); });
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Your reaction was not saved/));
    expect(result.current.chatMeta.reactions).toEqual([]);
    expect(calls.filter((c) => c.method === 'GET' && c.path === '/api/message-reactions').length).toBeGreaterThan(readsBefore);
  });
});

describe('mutes', () => {
  it('eight hours stores an end about eight hours from now', async () => {
    const { calls } = mockApi(baseRoutes({
      'POST /api/chat-mutes': (call: RecordedCall) => ({ id: 'mute-new', ...(call.body as object) }),
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.muteChat(DM, 'eight_hours'); });
    const body = calls.find((c) => c.method === 'POST' && c.path === '/api/chat-mutes')!.body as { chatId: string; userId: string; mutedUntil: string };
    expect(body.chatId).toBe(DM);
    expect(body.userId).toBe(ME);
    const ahead = Date.parse(body.mutedUntil) - Date.now();
    expect(ahead).toBeGreaterThan(8 * 3600e3 - 60e3);
    expect(ahead).toBeLessThanOrEqual(8 * 3600e3);
  });

  it('one week stores an end about seven days from now', async () => {
    const { calls } = mockApi(baseRoutes({
      'POST /api/chat-mutes': (call: RecordedCall) => ({ id: 'mute-new', ...(call.body as object) }),
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.muteChat(DM, 'one_week'); });
    const body = calls.find((c) => c.method === 'POST' && c.path === '/api/chat-mutes')!.body as { mutedUntil: string };
    const ahead = Date.parse(body.mutedUntil) - Date.now();
    expect(ahead).toBeGreaterThan(7 * 24 * 3600e3 - 60e3);
    expect(ahead).toBeLessThanOrEqual(7 * 24 * 3600e3);
  });

  it('until I turn it back on stores a null end', async () => {
    const { calls } = mockApi(baseRoutes({
      'POST /api/chat-mutes': (call: RecordedCall) => ({ id: 'mute-new', ...(call.body as object) }),
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.muteChat(DM, 'always'); });
    const body = calls.find((c) => c.method === 'POST' && c.path === '/api/chat-mutes')!.body as { mutedUntil: unknown };
    expect(body.mutedUntil).toBeNull();
    expect(result.current.isChatMuted(DM)).toBe(true);
  });

  it('an expired mute is ignored and removed best-effort', async () => {
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-mutes': [{ id: 'old', chatId: DM, userId: ME, mutedUntil: '2020-01-01T00:00:00.000Z' }],
      'DELETE /api/chat-mutes/{id}': { status: 204 },
    }));
    const { result } = setup();
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/chat-mutes/old')).toBe(true));
    expect(result.current.isChatMuted(DM)).toBe(false);
  });

  it('unmute deletes my mute row', async () => {
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-mutes': [{ id: 'mute1', chatId: DM, userId: ME, mutedUntil: null }],
      'DELETE /api/chat-mutes/{id}': { status: 204 },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.isChatMuted(DM)).toBe(true));
    await act(async () => { await result.current.unmuteChat(DM); });
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/chat-mutes/mute1')).toBe(true);
    expect(result.current.isChatMuted(DM)).toBe(false);
  });

  it('a refused mute shows the reason and the chat stays unmuted', async () => {
    const showToast = vi.fn();
    mockApi(baseRoutes({ 'POST /api/chat-mutes': { status: 500, body: { title: 'nope' } } }));
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.muteChat(DM, 'always'); });
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/The conversation was not muted/));
    expect(result.current.isChatMuted(DM)).toBe(false);
  });

  it('a refused unmute shows the reason and the mute stays active', async () => {
    const showToast = vi.fn();
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-mutes': [{ id: 'mute1', chatId: DM, userId: ME, mutedUntil: null }],
      'DELETE /api/chat-mutes/{id}': { status: 500, body: { title: 'locked' } },
    }));
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.isChatMuted(DM)).toBe(true));
    await act(async () => { await result.current.unmuteChat(DM); });
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/not unmuted/));
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/chat-mutes/mute1')).toBe(true);
    expect(result.current.isChatMuted(DM)).toBe(true);
  });
});

describe('pins', () => {
  it('pinning a second message deletes the first pin before creating the new one', async () => {
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-pins': [{ id: 'pin1', chatId: DM, messageId: 'm1' }],
      'DELETE /api/chat-pins/{id}': { status: 204 },
      'POST /api/chat-pins': (call: RecordedCall) => ({ id: 'pin2', ...(call.body as object) }),
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.chatMeta.pins).toHaveLength(1));
    await act(async () => { await result.current.pinMessage(DM, 'm2'); });
    const writes = calls.filter((c) => c.method !== 'GET' && c.path.startsWith('/api/chat-pins'));
    expect(writes.map((c) => `${c.method} ${c.path}`)).toEqual(['DELETE /api/chat-pins/pin1', 'POST /api/chat-pins']);
    expect(result.current.chatMeta.pins).toEqual([{ id: 'pin2', chatId: DM, messageId: 'm2' }]);
  });

  it('a refused pin shows the reason', async () => {
    const showToast = vi.fn();
    mockApi(baseRoutes({ 'POST /api/chat-pins': { status: 500, body: { title: 'full' } } }));
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.pinMessage(DM, 'm1'); });
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/The message was not pinned/));
    expect(result.current.chatMeta.pins).toEqual([]);
  });

  it('unpin deletes the pin of the chat', async () => {
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-pins': [{ id: 'pin1', chatId: DM, messageId: 'm1' }],
      'DELETE /api/chat-pins/{id}': { status: 204 },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.chatMeta.pins).toHaveLength(1));
    await act(async () => { await result.current.unpinMessage(DM); });
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/chat-pins/pin1')).toBe(true);
    expect(result.current.chatMeta.pins).toEqual([]);
  });

  it('a refused unpin shows the reason and the pin stays', async () => {
    const showToast = vi.fn();
    mockApi(baseRoutes({
      'GET /api/chat-pins': [{ id: 'pin1', chatId: DM, messageId: 'm1' }],
      'DELETE /api/chat-pins/{id}': { status: 500, body: { title: 'locked' } },
    }));
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.chatMeta.pins).toHaveLength(1));
    await act(async () => { await result.current.unpinMessage(DM); });
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/not unpinned/));
    expect(result.current.chatMeta.pins).toEqual([{ id: 'pin1', chatId: DM, messageId: 'm1' }]);
  });

  it('when the old pin cannot be removed, no new pin is created and the reason says so', async () => {
    const showToast = vi.fn();
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-pins': [{ id: 'pin1', chatId: DM, messageId: 'm1' }],
      'DELETE /api/chat-pins/{id}': { status: 500, body: { title: 'locked' } },
      'POST /api/chat-pins': (call: RecordedCall) => ({ id: 'pin2', ...(call.body as object) }),
    }));
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.chatMeta.pins).toHaveLength(1));
    await act(async () => { await result.current.pinMessage(DM, 'm2'); });
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/chat-pins')).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/The old pin was not removed/));
    expect(result.current.chatMeta.pins).toEqual([{ id: 'pin1', chatId: DM, messageId: 'm1' }]);
  });
});

const GROUP = 'chat-group';

describe('group conversations', () => {
  it('creates the group, adds me as owner and the others as members, and reports who failed', async () => {
    const addedRows: { id: string; chatId: string; userId: string; role: string }[] = [];
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-participants': () => [...participantRows, ...addedRows],
      // The group is listed by type, so a two-member group is not mistaken for a DM.
      'GET /api/chats': () => [
        { id: DM, type: 'dm', title: null, createdBy: ME },
        { id: GROUP, type: 'group', title: 'Friends', createdBy: ME },
      ],
      'POST /api/chats': (call: RecordedCall) => {
        const b = call.body as { type: string; title: string; createdBy: string };
        return { id: GROUP, type: b.type, title: b.title, createdBy: b.createdBy };
      },
      'POST /api/chat-participants': (call: RecordedCall) => {
        const b = call.body as { chatId: string; userId: string; role: string };
        if (b.userId === BEN) return { status: 500, body: { title: 'refused' } };
        addedRows.push({ id: `p-${b.userId}`, chatId: b.chatId, userId: b.userId, role: b.role });
        return { id: `p-${b.userId}`, ...b };
      },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));

    let outcome: { chatId: string; failedUserIds: string[] } | undefined;
    await act(async () => { outcome = await result.current.createGroupChat('Friends', [ANA, BEN]); });
    expect(outcome).toEqual({ chatId: GROUP, failedUserIds: [BEN] });

    const chatBody = calls.find((c) => c.method === 'POST' && c.path === '/api/chats')!.body;
    expect(chatBody).toEqual({ type: 'group', title: 'Friends', createdBy: ME });
    const rows = calls.filter((c) => c.method === 'POST' && c.path === '/api/chat-participants').map((c) => c.body);
    expect(rows).toEqual([
      { chatId: GROUP, userId: ME, role: 'owner' },
      { chatId: GROUP, userId: ANA, role: 'member' },
      { chatId: GROUP, userId: BEN, role: 'member' },
    ]);

    const thread = result.current.chatThreads.find((t) => t.chatId === GROUP);
    expect(thread).toEqual(expect.objectContaining({ kind: 'group', name: 'Friends', memberCount: 2 }));
    act(() => result.current.openChat(GROUP));
    expect(result.current.activeChats).toEqual([expect.objectContaining({ chatId: GROUP, kind: 'group', userId: '' })]);
  });
});

describe('attachments and images', () => {
  it('sendImage uploads the file and sends its url as an image message', async () => {
    mockApi(baseRoutes());
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.sendImage(DM, new File(['x'], 'p.png', { type: 'image/png' })); });
    expect(sendChatMessage).toHaveBeenCalledWith(DM, '/blobs/photo.png', 'image');
  });

  it('an echo of my own image sends a typed attachment row', async () => {
    let deliver: ((m: MessageDto) => void) | undefined;
    vi.mocked(onChatMessage).mockImplementation((h) => { deliver = h; return () => {}; });
    const { calls } = mockApi(baseRoutes({
      'POST /api/message-attachments': { id: 'a1', messageId: 'img-1', fileUrl: '/blobs/photo.png', mediaType: 'image' },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await waitFor(() => expect(deliver).toBeDefined());
    act(() => deliver!({ id: 'img-1', chatId: DM, senderId: ME, contentType: 'image', content: '/blobs/photo.png', editedAt: null }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/message-attachments')).toBe(true));
    expect(calls.find((c) => c.path === '/api/message-attachments')!.body).toEqual({
      messageId: 'img-1', fileUrl: '/blobs/photo.png', mediaType: 'image',
    });
  });
});

describe('blocking a chat', () => {
  it('blockInChat writes the chat-level block row for the blocked person', async () => {
    const { calls } = mockApi(baseRoutes({
      'POST /api/chat-blocks': (call: RecordedCall) => ({ id: 'cb1', ...(call.body as object) }),
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.blockInChat(DM, ANA); });
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/chat-blocks')!.body)
      .toEqual({ chatId: DM, blockerId: ME, blockedId: ANA });
  });

  it('unblocking removes my chat-level block rows for that person only', async () => {
    const { calls } = mockApi(baseRoutes({
      'GET /api/chat-blocks': [
        { id: 'cb1', chatId: DM, blockerId: ME, blockedId: ANA },
        { id: 'cb2', chatId: DM, blockerId: ME, blockedId: BEN },
      ],
      'DELETE /api/chat-blocks/{id}': { status: 204 },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await act(async () => { await result.current.unblockInChats(ANA); });
    const deletes = calls.filter((c) => c.method === 'DELETE' && c.path.startsWith('/api/chat-blocks')).map((c) => c.path);
    expect(deletes).toEqual(['/api/chat-blocks/cb1']);
  });
});

describe('persisted state migration', () => {
  it('drops persisted windows and threads that have no chat id', async () => {
    localStorage.setItem('nexus_active_chats', JSON.stringify([{ userId: ANA, name: 'Ana', avatar: '', handle: '', isMinimized: false }]));
    localStorage.setItem('nexus_chat_threads', JSON.stringify([{ userId: ANA, name: 'Ana', avatar: '', handle: '', lastMessage: 'x', lastMessageTime: 'y', unread: false }]));
    mockApi({ 'GET /api/chat-participants': [], 'GET /api/messages': [] });
    const { result } = setup();
    expect(result.current.activeChats).toEqual([]);
    expect(result.current.chatThreads).toEqual([]);
  });
});

describe('refused chat writes', () => {
  it('a refused group creation throws the reason and keeps nothing', async () => {
    mockApi(baseRoutes({ 'POST /api/chats': { status: 500, body: { title: 'no groups today' } } }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await expect(result.current.createGroupChat('Trip', [ANA])).rejects.toThrow(/no groups today/);
    expect(result.current.chatThreads.map((t) => t.kind)).toEqual(['dm']);
  });

  it('a refused chat block throws, so the caller can say the chat was not blocked', async () => {
    mockApi(baseRoutes({ 'POST /api/chat-blocks': { status: 500, body: { title: 'nope' } } }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await expect(result.current.blockInChat(DM, ANA)).rejects.toThrow(/nope/);
  });

  it('a refused unblock of the chat rows throws the reason', async () => {
    mockApi(baseRoutes({
      'GET /api/chat-blocks': [{ id: 'cb1', chatId: DM, blockerId: ME, blockedId: ANA }],
      'DELETE /api/chat-blocks/{id}': { status: 500, body: { title: 'locked' } },
    }));
    const { result } = setup();
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));
    await expect(result.current.unblockInChats(ANA)).rejects.toThrow(/locked/);
  });
});

describe('refresh cadence', () => {
  // Only the interval and Date are faked. Promises and the zero-length waits in flush() stay real.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const REFRESH_PATHS = ['/api/message-read-receipts', '/api/message-reactions', '/api/chat-pins', '/api/chat-mutes'];
  const ANA_WINDOW = { id: ANA, name: 'Ana Ruiz', avatar: '', handle: '@ana' };

  const flush = async () => {
    for (let i = 0; i < 5; i++) {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
  };
  const advance = async (ms: number) => {
    act(() => { vi.advanceTimersByTime(ms); });
    await flush();
  };
  const refreshGets = (calls: RecordedCall[]) =>
    REFRESH_PATHS.map((path) => calls.filter((c) => c.method === 'GET' && c.path === path).length);

  async function openDm(extra: Record<string, unknown> = {}) {
    const { calls } = mockApi(baseRoutes(extra));
    const hook = setup();
    await flush();
    act(() => hook.result.current.openChatWithUser(ANA_WINDOW));
    await flush();
    return { ...hook, calls };
  }

  it('refreshes receipts, reactions, pins and mutes every 15 s while a window is open and visible', async () => {
    const { calls } = await openDm();
    const opened = refreshGets(calls);
    expect(opened.every((n) => n >= 1)).toBe(true);

    await advance(CHAT_REFRESH_MS - 1);
    expect(refreshGets(calls)).toEqual(opened);
    await advance(1);
    expect(refreshGets(calls)).toEqual(opened.map((n) => n + 1));
    await advance(CHAT_REFRESH_MS);
    expect(refreshGets(calls)).toEqual(opened.map((n) => n + 2));
  });

  it('makes no requests on the cadence while the document is hidden, and resumes when visible', async () => {
    // Receipts fail, so Ana's messages stay unread: any pass that runs would try to send them again.
    const { calls } = await openDm({ 'POST /api/message-read-receipts': { status: 500, body: { title: 'down' } } });
    const receiptsAtOpen = receiptCalls(calls).length;
    expect(receiptsAtOpen).toBeGreaterThan(0);
    const opened = refreshGets(calls);

    setVisibility('hidden');
    await advance(CHAT_REFRESH_MS);
    await advance(CHAT_REFRESH_MS);
    expect(refreshGets(calls)).toEqual(opened);
    expect(receiptCalls(calls)).toHaveLength(receiptsAtOpen);

    setVisibility('visible');
    await advance(CHAT_REFRESH_MS);
    expect(refreshGets(calls)).toEqual(opened.map((n) => n + 1));
    expect(receiptCalls(calls).length).toBeGreaterThan(receiptsAtOpen);
  });

  it('makes no requests on the cadence when no window is open, or when the only window is minimized', async () => {
    const { calls } = mockApi(baseRoutes());
    const hook = setup();
    await flush();
    const idle = refreshGets(calls);

    await advance(CHAT_REFRESH_MS);
    await advance(CHAT_REFRESH_MS);
    expect(refreshGets(calls)).toEqual(idle);

    act(() => hook.result.current.openChatWithUser(ANA_WINDOW));
    await flush();
    act(() => hook.result.current.minimizeChat(DM));
    await flush();
    const minimized = refreshGets(calls);

    await advance(CHAT_REFRESH_MS);
    await advance(CHAT_REFRESH_MS);
    expect(refreshGets(calls)).toEqual(minimized);
  });

  it('refreshes on window focus and on visibilitychange, but not while hidden', async () => {
    const { calls } = await openDm();
    const opened = refreshGets(calls);

    act(() => { window.dispatchEvent(new Event('focus')); });
    await flush();
    expect(refreshGets(calls)).toEqual(opened.map((n) => n + 1));

    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await flush();
    expect(refreshGets(calls)).toEqual(opened.map((n) => n + 2));

    setVisibility('hidden');
    act(() => { window.dispatchEvent(new Event('focus')); });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await flush();
    expect(refreshGets(calls)).toEqual(opened.map((n) => n + 2));
  });
});

describe('refreshChats', () => {
  it('keeps the known chats usable while it reloads: an incoming message is kept and openChat works', async () => {
    let deliver: ((m: MessageDto) => void) | undefined;
    vi.mocked(onChatMessage).mockImplementation((h) => { deliver = h; return () => {}; });
    mockApi(baseRoutes());
    const showToast = vi.fn();
    const { result } = setup(showToast);
    await waitFor(() => expect(result.current.threadsLoading).toBe(false));

    // Hold the refresh inside its per-chat loop (it joins each chat's hub group there).
    let release: () => void = () => {};
    vi.mocked(joinChat).mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    let refresh: Promise<void> = Promise.resolve();
    act(() => { refresh = result.current.refreshChats(); });
    await waitFor(() => expect(vi.mocked(joinChat)).toHaveBeenCalledTimes(2));

    // Mid-refresh: a message arrives and the chat is opened from the list.
    act(() => deliver!({ id: 'm9', chatId: DM, senderId: ANA, contentType: 'text', content: 'during refresh', editedAt: null }));
    act(() => result.current.openChat(DM));
    expect(showToast).not.toHaveBeenCalledWith('This conversation is no longer available.');

    await act(async () => { release(); await refresh; });
    // The refreshed history (m1..m3) does not drop the message that arrived meanwhile.
    expect(result.current.chatMessages[DM].map((m) => m.id)).toContain('m9');
    expect(result.current.activeChats.some((c) => c.chatId === DM)).toBe(true);
  });
});
