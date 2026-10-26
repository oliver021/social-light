import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { components as ChatComponents } from '@sdk/chat';
import { ChatMessage, ChatBoxState, ChatThread } from '../types';
import { chatApi, getProfile, describeApiError, messageOf, mediaUrl, uploadMedia } from '../api/gateway';
import { connectChatHub, joinChat, sendChatMessage, onChatMessage, disconnectChatHub, type MessageDto } from '../api/realtime';
import { usePersistentState } from './usePersistentState';
import { type ToastSeverity } from './useToast';
import { withHandle, defaultAvatar } from '../api/mappers';
import {
  isMuteActive,
  keepChatKeyed,
  keepMessagesFor,
  muteEndFor,
  pinOf,
  summarizeReactions,
  unreadPeerMessages,
  type MessageReactionType,
  type MuteChoice,
} from './chatRules';

type Dto = ChatComponents['schemas'];
export type ChatReceipt = Dto['MessageReadReceiptDto'];
export type ChatReaction = Dto['MessageReactionDto'];
export type ChatPin = Dto['ChatPinDto'];
export type ChatMute = Dto['ChatMuteDto'];

/** Read state the server holds for the signed-in user's chats (refreshed, not pushed). */
export interface ChatMeta {
  receipts: ChatReceipt[];
  reactions: ChatReaction[];
  pins: ChatPin[];
  mutes: ChatMute[];
}

const EMPTY_META: ChatMeta = { receipts: [], reactions: [], pins: [], mutes: [] };

/** Open windows re-read receipts, reactions, pins and mutes this often while visible. */
export const CHAT_REFRESH_MS = 15_000;
/** Read receipts sent per pass for one chat. */
const RECEIPT_BATCH = 20;

/** A conversation partner. `userId` is always the real backend user id. */
interface Peer {
  userId: string;
  name: string;
  avatar: string;
  handle: string;
}

/** Everything the hub handler needs about a chat I belong to. */
interface ChatInfo {
  chatId: string;
  kind: 'dm' | 'group';
  peer: Peer | null;
  name: string;
  avatar: string;
  handle: string;
  memberCount: number;
}

interface Deps {
  /** The signed-in user's id (JWT sub), read at call time. */
  myUserId: MutableRefObject<string>;
  /** Re-runs the hub connection when the signed-in user becomes known. */
  currentUserId: string;
  isAuthenticated: boolean;
  showToast: (message: string, severity?: ToastSeverity) => void;
}

const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

const messageDtoToChat = (m: MessageDto): ChatMessage => ({
  id: m.id,
  senderId: m.senderId,
  text: m.content,
  createdAt: 'Just now',
  contentType: m.contentType,
});

const previewOf = (msg: ChatMessage) => (msg.contentType === 'image' ? 'Photo' : msg.text);

function threadFrom(info: ChatInfo, lastMessage: string, lastMessageTime = 'recently'): ChatThread {
  return {
    chatId: info.chatId,
    kind: info.kind,
    userId: info.peer?.userId ?? '',
    name: info.name,
    avatar: info.avatar,
    handle: info.handle,
    lastMessage,
    lastMessageTime,
    unreadCount: 0,
    unread: false,
    muted: false,
    memberCount: info.memberCount,
  };
}

/** `data` of a list call, or undefined when the call failed (the caller keeps what it had). */
function dataOf<T>(p: Promise<{ data?: T }>): Promise<T | undefined> {
  return p.then((r) => r.data, () => undefined);
}

/**
 * Messenger: real conversations over the Chat module + SignalR hub. Windows and the
 * conversation list are keyed by the backend chat id. A DM is found or created by its peer
 * (chat + BOTH participants, me included) before its window opens, so a first message is
 * never sent into a chat the other person is not in. Read receipts, reactions, pins and mutes
 * are refreshed on a cadence (only messages arrive live), and every failure is reported.
 */
export function useChat({ myUserId, currentUserId, isAuthenticated, showToast }: Deps) {
  const [activeChats, setActiveChats] = usePersistentState<ChatBoxState[]>('nexus_active_chats', () => []);
  const [chatMessages, setChatMessages] = usePersistentState<Record<string, ChatMessage[]>>('nexus_chat_messages', () => ({}));
  const [chatThreads, setChatThreads] = usePersistentState<ChatThread[]>('nexus_chat_threads', () => []);
  // True until the conversation list has loaded or the live connection failed, so the menu can show a skeleton.
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [meta, setMetaState] = useState<ChatMeta>(EMPTY_META);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  // Refs are the source of truth for async code; the state mirrors them for rendering.
  const windowsRef = useRef<ChatBoxState[]>(activeChats);
  const messagesRef = useRef<Record<string, ChatMessage[]>>(chatMessages);
  const metaRef = useRef<ChatMeta>(EMPTY_META);
  const chatInfo = useRef<Map<string, ChatInfo>>(new Map());
  const dmChatByPeer = useRef<Map<string, string>>(new Map()); // peerUserId -> chatId
  const pendingChatByPeer = useRef<Map<string, Promise<string>>>(new Map()); // in-flight DM creation
  const receiptsInFlight = useRef<Set<string>>(new Set());
  const attachedMessages = useRef<Set<string>>(new Set());

  const setWindows = (next: ChatBoxState[] | ((prev: ChatBoxState[]) => ChatBoxState[])) => {
    const value = typeof next === 'function' ? next(windowsRef.current) : next;
    windowsRef.current = value;
    setActiveChats(value);
  };

  const patchMessages = (chatId: string, list: ChatMessage[]) => {
    messagesRef.current = { ...messagesRef.current, [chatId]: list };
    setChatMessages(messagesRef.current);
  };

  const setMeta = (patch: Partial<ChatMeta>) => {
    metaRef.current = { ...metaRef.current, ...patch };
    setMetaState(metaRef.current);
  };

  const addParticipant = async (chatId: string, userId: string, role: 'owner' | 'member', failure: string) => {
    const { error, response } = await chatApi.POST('/api/chat-participants', {
      body: { chatId, userId, role },
    });
    if (!response.ok) throw new Error(describeApiError(error, response, failure));
  };

  const registerDm = (peer: Peer, chatId: string) => {
    chatInfo.current.set(chatId, {
      chatId, kind: 'dm', peer, name: peer.name, avatar: peer.avatar, handle: peer.handle, memberCount: 2,
    });
    dmChatByPeer.current.set(peer.userId, chatId);
  };

  // Find an existing DM between me and `peer` (a chat of exactly two members), else create one.
  const createOrFindDm = async (peer: Peer): Promise<string> => {
    const myId = myUserId.current;
    if (!myId) throw new Error('Your session is still loading. Try again in a moment.');

    const { data: parts, error: partsError, response: partsResponse } = await chatApi.GET('/api/chat-participants');
    if (!parts) throw new Error(describeApiError(partsError, partsResponse, 'Could not load your conversations'));

    const sizes = new Map<string, number>();
    for (const p of parts) sizes.set(p.chatId, (sizes.get(p.chatId) ?? 0) + 1);
    const myChatIds = new Set(parts.filter((p) => p.userId === myId).map((p) => p.chatId));
    let chatId = parts.find((p) => p.userId === peer.userId && myChatIds.has(p.chatId) && sizes.get(p.chatId) === 2)?.chatId;

    if (!chatId) {
      const { data: chat, error, response } = await chatApi.POST('/api/chats', {
        body: { type: 'dm', title: null, createdBy: myId },
      });
      if (!chat) throw new Error(describeApiError(error, response, 'Could not start the conversation'));
      chatId = chat.id;
      // Both members must be in the chat before anything is sent, or the other person never gets it.
      await addParticipant(chatId, myId, 'member', 'Could not add you to the conversation');
      await addParticipant(chatId, peer.userId, 'member', `Could not add ${peer.name} to the conversation`);
    }

    await joinChat(chatId).catch(() => {
      throw new Error('Could not connect to live chat. Check your connection and try again.');
    });
    registerDm(peer, chatId);
    return chatId;
  };

  // Resolve the peer's chat once; concurrent callers (open + first send) share one request.
  const ensureDmChat = (peer: Peer): Promise<string> => {
    const known = dmChatByPeer.current.get(peer.userId);
    if (known && chatInfo.current.has(known)) return Promise.resolve(known);
    const pending = pendingChatByPeer.current.get(peer.userId);
    if (pending) return pending;
    const created = createOrFindDm(peer).finally(() => pendingChatByPeer.current.delete(peer.userId));
    pendingChatByPeer.current.set(peer.userId, created);
    return created;
  };

  // Pull a conversation's history (no timestamp in the v0 schema, so DB order). Messages that
  // arrived while the history loaded are kept after it.
  const loadChatHistory = async (chatId: string) => {
    const { data, error, response } = await chatApi.GET('/api/messages');
    if (!data) throw new Error(describeApiError(error, response, 'Could not load the messages'));
    const history = data.filter((m) => m.chatId === chatId).map(messageDtoToChat);
    const ids = new Set(history.map((m) => m.id));
    const arrived = (messagesRef.current[chatId] ?? []).filter((m) => !ids.has(m.id));
    patchMessages(chatId, [...history, ...arrived]);
  };

  // Read receipts, reactions, pins and mutes: the server's current state for my chats.
  const refreshMeta = async () => {
    if (!myUserId.current) return;
    const [receipts, reactions, pins, mutes] = await Promise.all([
      dataOf(chatApi.GET('/api/message-read-receipts')),
      dataOf(chatApi.GET('/api/message-reactions')),
      dataOf(chatApi.GET('/api/chat-pins')),
      dataOf(chatApi.GET('/api/chat-mutes')),
    ]);
    const myId = myUserId.current;
    const now = Date.now();
    // An expired mute is ignored and removed best-effort.
    const expired = (mutes ?? []).filter((m) => m.userId === myId && !isMuteActive(m.mutedUntil, now));
    for (const m of expired) {
      chatApi.DELETE('/api/chat-mutes/{id}', { params: { path: { id: m.id } } }).catch(() => {});
    }
    setMeta({
      receipts: receipts ?? metaRef.current.receipts,
      reactions: reactions ?? metaRef.current.reactions,
      pins: pins ?? metaRef.current.pins,
      mutes: mutes ? mutes.filter((m) => !expired.includes(m)) : metaRef.current.mutes,
    });
  };

  // On login: discover my existing conversations, resolve each peer's profile, join
  // their hub groups (so inbound arrives before I open them), and build the thread
  // list + message cache.
  const loadChats = async () => {
    try {
      await fetchChats();
    } finally {
      setThreadsLoading(false);
    }
  };

  const fetchChats = async () => {
    const myId = myUserId.current;
    if (!myId) return;
    const { data: parts } = await chatApi.GET('/api/chat-participants');
    if (!parts) return;
    const myChatIds = [...new Set(parts.filter((p) => p.userId === myId).map((p) => p.chatId))];
    if (myChatIds.length === 0) {
      chatInfo.current.clear();
      setChatThreads([]);
      await refreshMeta();
      return;
    }

    const { data: chats } = await chatApi.GET('/api/chats');
    const { data: allMessages } = await chatApi.GET('/api/messages');
    const chatById = new Map((chats ?? []).map((c) => [c.id, c]));
    const threads: ChatThread[] = [];
    const messagesByChat: Record<string, ChatMessage[]> = {};
    const names: Record<string, string> = {};
    chatInfo.current.clear();

    for (const chatId of myChatIds) {
      const members = parts.filter((p) => p.chatId === chatId);
      const others = members.filter((p) => p.userId !== myId);
      if (others.length === 0) continue; // empty or self-only chat
      const dto = chatById.get(chatId);
      const isGroup = dto?.type === 'group' || members.length > 2;

      const profiles = await Promise.all(others.map((o) => getProfile(o.userId).catch(() => null)));
      others.forEach((o, i) => { names[o.userId] = profiles[i]?.displayName || 'Member'; });
      const history = (allMessages ?? []).filter((m) => m.chatId === chatId).map(messageDtoToChat);
      messagesByChat[chatId] = history;
      const last = history[history.length - 1];
      await joinChat(chatId).catch(() => {});

      if (isGroup) {
        const info: ChatInfo = {
          chatId, kind: 'group', peer: null, name: dto?.title || 'Group', avatar: '', handle: '', memberCount: members.length,
        };
        chatInfo.current.set(chatId, info);
        threads.push(threadFrom(info, last ? previewOf(last) : 'Say hello!'));
      } else {
        const other = others[0];
        const profile = profiles[0];
        const peer: Peer = {
          userId: other.userId,
          name: profile?.displayName || 'Member',
          avatar: mediaUrl(profile?.avatarUrl) ?? defaultAvatar(other.userId),
          handle: withHandle(profile?.handle),
        };
        registerDm(peer, chatId);
        threads.push(threadFrom(chatInfo.current.get(chatId)!, last ? previewOf(last) : 'Say hello!'));
      }
    }
    messagesRef.current = { ...messagesRef.current, ...messagesByChat };
    setChatMessages(messagesRef.current);
    setChatThreads(threads);
    setMemberNames((prev) => ({ ...prev, ...names }));
    await refreshMeta();
  };

  // A window opens (or moves to the end) keyed by its chat id.
  const openWindow = (box: ChatBoxState) => {
    setWindows((prev) => {
      const exists = prev.find((c) => c.chatId === box.chatId);
      // Re-opening an existing chat moves it to the end (the newest chat is the one shown on phones).
      if (exists) return [...prev.filter((c) => c.chatId !== box.chatId), { ...exists, isMinimized: false }];
      const list = [...prev];
      if (list.length >= 2) list.shift(); // Max 2 chats side-by-side
      return [...list, { ...box, isMinimized: false }];
    });
    setChatThreads((prev) => {
      if (prev.some((t) => t.chatId === box.chatId)) return prev;
      const info = chatInfo.current.get(box.chatId);
      const row: ChatThread = {
        chatId: box.chatId,
        kind: box.kind,
        userId: box.userId,
        name: box.name,
        avatar: box.avatar,
        handle: box.handle,
        lastMessage: 'Conversation started',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        unread: false,
        muted: false,
        memberCount: info?.memberCount,
      };
      return [row, ...prev];
    });
  };

  const isChatMuted = (chatId: string): boolean => {
    const me = myUserId.current;
    const now = Date.now();
    return metaRef.current.mutes.some((m) => m.chatId === chatId && m.userId === me && isMuteActive(m.mutedUntil, now));
  };

  // Messages a window of mine has no receipt for, read once it is open and visible.
  const markRead = async (messages: ChatMessage[]) => {
    const me = myUserId.current;
    if (!me) return;
    const readIds = new Set(metaRef.current.receipts.filter((r) => r.userId === me).map((r) => r.messageId));
    const todo = unreadPeerMessages(messages, me, readIds)
      .filter((m) => !receiptsInFlight.current.has(m.id))
      .slice(0, RECEIPT_BATCH);
    for (const m of todo) {
      receiptsInFlight.current.add(m.id);
      try {
        const { data } = await chatApi.POST('/api/message-read-receipts', {
          body: { messageId: m.id, userId: me, readAt: new Date().toISOString() },
        });
        // A failed receipt stops this pass quietly; the next pass retries it.
        if (!data) break;
        setMeta({ receipts: [...metaRef.current.receipts.filter((r) => r.id !== data.id), data] });
      } catch {
        break;
      } finally {
        receiptsInFlight.current.delete(m.id);
      }
    }
  };

  // Refresh read state and mark the open, visible windows as read. Runs on open, on focus,
  // on the 15 s cadence, and on demand. Does nothing while the document is hidden.
  const syncOpenChats = () => {
    if (!isVisible()) return;
    const open = windowsRef.current.filter((c) => !c.isMinimized);
    if (open.length === 0) return;
    refreshMeta().then(() => {
      for (const c of open) markRead(messagesRef.current[c.chatId] ?? []);
    });
  };

  const ensureOpenWindow = (chatId: string) => {
    const info = chatInfo.current.get(chatId);
    if (!info) {
      showToast('This conversation is no longer available.');
      return;
    }
    openWindow({
      chatId,
      kind: info.kind,
      userId: info.peer?.userId ?? '',
      name: info.name,
      avatar: info.avatar,
      handle: info.handle,
      isMinimized: false,
    });
    loadChatHistory(chatId)
      .then(() => syncOpenChats())
      .catch((err) => showToast(messageOf(err, 'Could not load the messages')));
  };

  const openChatWithUser = (user: { id: string; name: string; avatar: string; handle: string }) => {
    if (!user.id || user.id === myUserId.current) return; // no chat with an unknown or with myself

    // Establish the backend conversation first; its window opens keyed by the chat id.
    const peer: Peer = { userId: user.id, name: user.name, avatar: user.avatar, handle: user.handle };
    ensureDmChat(peer)
      .then((chatId) => ensureOpenWindow(chatId))
      .catch((err) => showToast(messageOf(err, 'Could not open the conversation')));
  };

  // Open a conversation I already belong to, by chat id (groups, and DMs from the list).
  const openChat = (chatId: string) => ensureOpenWindow(chatId);

  const closeChat = (key: string) => {
    if (!key) return;
    // Accepts a chat id, or a DM peer's user id (M4 blocks close a DM by its peer).
    setWindows((prev) => prev.filter((c) => c.chatId !== key && c.userId !== key));
  };

  const minimizeChat = (chatId: string) => {
    setWindows((prev) => prev.map((c) => (c.chatId === chatId ? { ...c, isMinimized: !c.isMinimized } : c)));
    // Expanding a window reads what is in it.
    if (windowsRef.current.some((c) => c.chatId === chatId && !c.isMinimized)) syncOpenChats();
  };

  // Send through the hub. The server persists the message (sender bound from JWT) and
  // broadcasts it back as ReceiveMessage. Rejects on failure so the composer keeps the text.
  const sendMessage = async (chatId: string, text: string): Promise<void> => {
    const body = text.trim();
    if (!body) return;
    await sendChatMessage(chatId, body, 'text');
  };

  // Upload an image, then send its url as an `image` message. Rejects on failure.
  const sendImage = async (chatId: string, file: File, onProgress?: (percent: number) => void): Promise<void> => {
    const url = await uploadMedia(file, onProgress);
    await sendChatMessage(chatId, url, 'image');
  };

  // Best-effort typed attachment, so native clients get a typed image row too.
  const attachImage = (messageId: string, fileUrl: string) => {
    if (attachedMessages.current.has(messageId)) return;
    attachedMessages.current.add(messageId);
    chatApi.POST('/api/message-attachments', {
      body: { messageId, fileUrl, mediaType: 'image' },
    }).catch(() => {});
  };

  // One reaction per user per message: a tap on my current reaction removes it, a tap on
  // another swaps it (delete the old row, create the new one). Server first, then the UI.
  const reactToMessage = async (messageId: string, reactionType: MessageReactionType) => {
    const me = myUserId.current;
    if (!me) return;
    const mine = summarizeReactions(messageId, metaRef.current.reactions, me).mine;
    try {
      if (mine) {
        const { error, response } = await chatApi.DELETE('/api/message-reactions/{id}', {
          params: { path: { id: mine.id } },
        });
        if (!response.ok) throw new Error(describeApiError(error, response, 'Your reaction was not removed'));
        setMeta({ reactions: metaRef.current.reactions.filter((r) => r.id !== mine.id) });
      }
      if (mine?.reactionType !== reactionType) {
        const { data, error, response } = await chatApi.POST('/api/message-reactions', {
          body: { messageId, userId: me, reactionType },
        });
        if (!data) throw new Error(describeApiError(error, response, 'Your reaction was not saved'));
        setMeta({ reactions: [...metaRef.current.reactions, data] });
      }
    } catch (err) {
      showToast(messageOf(err, 'Your reaction was not saved'));
      await refreshMeta();
    }
  };

  // At most one pin per chat: pinning another message deletes the old pin first.
  const pinMessage = async (chatId: string, messageId: string) => {
    const current = pinOf(chatId, metaRef.current.pins);
    if (current?.messageId === messageId) return;
    try {
      if (current) {
        const { error, response } = await chatApi.DELETE('/api/chat-pins/{id}', { params: { path: { id: current.id } } });
        if (!response.ok) throw new Error(describeApiError(error, response, 'The old pin was not removed'));
        setMeta({ pins: metaRef.current.pins.filter((p) => p.id !== current.id) });
      }
      const { data, error, response } = await chatApi.POST('/api/chat-pins', { body: { chatId, messageId } });
      if (!data) throw new Error(describeApiError(error, response, 'The message was not pinned'));
      setMeta({ pins: [...metaRef.current.pins.filter((p) => p.chatId !== chatId), data] });
    } catch (err) {
      showToast(messageOf(err, 'The message was not pinned'));
      await refreshMeta();
    }
  };

  const unpinMessage = async (chatId: string) => {
    const current = pinOf(chatId, metaRef.current.pins);
    if (!current) return;
    try {
      const { error, response } = await chatApi.DELETE('/api/chat-pins/{id}', { params: { path: { id: current.id } } });
      if (!response.ok) throw new Error(describeApiError(error, response, 'The message was not unpinned'));
      setMeta({ pins: metaRef.current.pins.filter((p) => p.id !== current.id) });
    } catch (err) {
      showToast(messageOf(err, 'The message was not unpinned'));
    }
  };

  // Replaces any mute I already have on this chat.
  const muteChat = async (chatId: string, choice: MuteChoice) => {
    const me = myUserId.current;
    if (!me) return;
    try {
      await removeMyMutes(chatId);
      const { data, error, response } = await chatApi.POST('/api/chat-mutes', {
        body: { chatId, userId: me, mutedUntil: muteEndFor(choice, new Date()) },
      });
      if (!data) throw new Error(describeApiError(error, response, 'The conversation was not muted'));
      setMeta({ mutes: [...metaRef.current.mutes.filter((m) => m.chatId !== chatId), data] });
    } catch (err) {
      showToast(messageOf(err, 'The conversation was not muted'));
    }
  };

  const unmuteChat = async (chatId: string) => {
    try {
      await removeMyMutes(chatId);
    } catch (err) {
      showToast(messageOf(err, 'The conversation was not unmuted'));
    }
  };

  // Deletes my mute rows for one chat; throws on the first refusal.
  const removeMyMutes = async (chatId: string) => {
    const me = myUserId.current;
    const mine = metaRef.current.mutes.filter((m) => m.chatId === chatId && m.userId === me);
    for (const m of mine) {
      const { error, response } = await chatApi.DELETE('/api/chat-mutes/{id}', { params: { path: { id: m.id } } });
      if (!response.ok) throw new Error(describeApiError(error, response, 'The conversation was not unmuted'));
      setMeta({ mutes: metaRef.current.mutes.filter((x) => x.id !== m.id) });
    }
  };

  // Creates a group, then adds me as owner and the others as members, one at a time.
  // Members that could not be added are returned; the group itself is kept.
  const createGroupChat = async (title: string, memberIds: string[]): Promise<{ chatId: string; failedUserIds: string[] }> => {
    const me = myUserId.current;
    if (!me) throw new Error('Your session is still loading. Try again in a moment.');
    const { data: chat, error, response } = await chatApi.POST('/api/chats', {
      body: { type: 'group', title, createdBy: me },
    });
    if (!chat) throw new Error(describeApiError(error, response, 'Could not create the group'));

    const failedUserIds: string[] = [];
    const add = async (userId: string, role: 'owner' | 'member') => {
      try {
        await addParticipant(chat.id, userId, role, 'Could not add the member');
      } catch {
        failedUserIds.push(userId);
      }
    };
    await add(me, 'owner');
    for (const id of memberIds) await add(id, 'member');

    await joinChat(chat.id).catch(() => {});
    await fetchChats().catch(() => {});
    return { chatId: chat.id, failedUserIds };
  };

  // Chat-level block, written after the person-level block (M4) succeeded.
  const blockInChat = async (chatId: string, blockedId: string) => {
    const me = myUserId.current;
    if (!me) throw new Error('Your session is still loading. Try again in a moment.');
    const { data, error, response } = await chatApi.POST('/api/chat-blocks', {
      body: { chatId, blockerId: me, blockedId },
    });
    if (!data) throw new Error(describeApiError(error, response, 'The chat was not blocked'));
  };

  // Removes my chat-level block rows for a person; called when the person is unblocked.
  const unblockInChats = async (blockedId: string) => {
    const me = myUserId.current;
    if (!me) return;
    const { data, error, response } = await chatApi.GET('/api/chat-blocks');
    if (!data) throw new Error(describeApiError(error, response, 'The chat block was not removed'));
    for (const row of data.filter((b) => b.blockerId === me && b.blockedId === blockedId)) {
      const del = await chatApi.DELETE('/api/chat-blocks/{id}', { params: { path: { id: row.id } } });
      if (!del.response.ok) throw new Error(describeApiError(del.error, del.response, 'The chat block was not removed'));
    }
  };

  // Incoming message (ours or the peer's) for any chat I belong to.
  const handleIncomingMessage = (m: MessageDto) => {
    const info = chatInfo.current.get(m.chatId);
    if (!info) return; // a chat I have not loaded this session
    const mine = m.senderId === myUserId.current;
    const msg = messageDtoToChat(m);
    const existing = messagesRef.current[m.chatId] ?? [];
    if (!existing.some((e) => e.id === msg.id)) patchMessages(m.chatId, [...existing, msg]); // dedupe
    setChatThreads((prev) => {
      const current = prev.find((t) => t.chatId === m.chatId) ?? threadFrom(info, '');
      return [{ ...current, lastMessage: previewOf(msg), lastMessageTime: 'Just now' }, ...prev.filter((t) => t.chatId !== m.chatId)];
    });
    if (mine && m.contentType === 'image') attachImage(m.id, m.content);
    const open = windowsRef.current.find((c) => c.chatId === m.chatId);
    if (!mine && open && !open.isMinimized && isVisible()) markRead(messagesRef.current[m.chatId] ?? []);
  };

  // Keep the hub handler pointing at the latest closure without re-subscribing the connection.
  const incomingRef = useRef(handleIncomingMessage);
  incomingRef.current = handleIncomingMessage;

  // Migration of persisted state: a window or thread saved before the chat-id key is dropped
  // (loadChats rediscovers the conversation), and its message lists with it.
  useEffect(() => {
    const windows = keepChatKeyed(windowsRef.current);
    const threads = keepChatKeyed(chatThreads);
    setWindows(windows);
    setChatThreads(threads);
    messagesRef.current = keepMessagesFor(messagesRef.current, threads, windows);
    setChatMessages(messagesRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect the SignalR hub once authenticated (and once we know our own id), wire
  // the receive handler, and hydrate existing conversations.
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    let active = true;
    let unsub: () => void = () => {};
    (async () => {
      try {
        await connectChatHub();
        if (!active) return;
        unsub = onChatMessage((m) => incomingRef.current(m));
        await loadChats();
      } catch {
        // Nothing will load now: settle the list so the menu shows its empty state, not a skeleton.
        setThreadsLoading(false);
        if (active) showToast('Live chat is unavailable right now. Messages may not arrive.', 'info');
      }
    })();
    return () => { active = false; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUserId]);

  // The 15 s cadence, plus focus and visibility, for the open windows.
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    const tick = () => syncOpenChats();
    const timer = window.setInterval(tick, CHAT_REFRESH_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUserId]);

  // The list as shown: unread counts come from messages without my receipt, and a muted
  // chat counts as read.
  const threadsView = useMemo(() => {
    const myId = myUserId.current;
    const now = Date.now();
    const readIds = new Set(meta.receipts.filter((r) => r.userId === myId).map((r) => r.messageId));
    return chatThreads.map((t) => {
      const muted = meta.mutes.some((m) => m.chatId === t.chatId && m.userId === myId && isMuteActive(m.mutedUntil, now));
      const unreadCount = muted ? 0 : unreadPeerMessages(chatMessages[t.chatId] ?? [], myId, readIds).length;
      return { ...t, muted, unreadCount, unread: unreadCount > 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatThreads, chatMessages, meta, myUserId.current]);

  // Forget the previous account's conversation maps (used when the signed-in user changes).
  const reset = () => {
    setWindows([]);
    messagesRef.current = {};
    setChatMessages({});
    setChatThreads([]);
    metaRef.current = EMPTY_META;
    setMetaState(EMPTY_META);
    setMemberNames({});
    chatInfo.current.clear();
    dmChatByPeer.current.clear();
    pendingChatByPeer.current.clear();
    receiptsInFlight.current.clear();
    attachedMessages.current.clear();
  };

  // Torn down by auth on logout: drop the maps and close the connection.
  const teardown = () => {
    chatInfo.current.clear();
    dmChatByPeer.current.clear();
    pendingChatByPeer.current.clear();
    disconnectChatHub().catch(() => {});
  };

  /**
   * Re-read my conversations now. The messenger menu calls this when it opens, so a chat
   * someone else started since login shows up (and its hub group is joined). The hub does
   * not announce new chats (track B, B11), and the 15 s cadence only serves open windows.
   */
  const refreshChats = (): Promise<void> => fetchChats().catch(() => {});

  return {
    refreshChats,
    activeChats,
    chatMessages,
    chatThreads: threadsView,
    threadsLoading,
    memberNames,
    chatMeta: meta,
    isChatMuted,
    openChatWithUser,
    openChat,
    closeChat,
    minimizeChat,
    sendMessage,
    sendImage,
    reactToMessage,
    pinMessage,
    unpinMessage,
    muteChat,
    unmuteChat,
    createGroupChat,
    blockInChat,
    unblockInChats,
    markOpenChatsRead: syncOpenChats,
    teardown,
    reset,
  };
}
