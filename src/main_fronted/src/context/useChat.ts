import { useEffect, useRef, type MutableRefObject } from 'react';
import { ChatMessage, ChatBoxState, ChatThread } from '../types';
import { chatApi, getProfile, describeApiError, messageOf, mediaUrl } from '../api/gateway';
import { connectChatHub, joinChat, sendChatMessage, onChatMessage, disconnectChatHub, type MessageDto } from '../api/realtime';
import { usePersistentState } from './usePersistentState';
import { type ToastSeverity } from './useToast';
import { withHandle, defaultAvatar } from '../api/mappers';

/** A conversation partner. `userId` is always the real backend user id. */
interface Peer {
  userId: string;
  name: string;
  avatar: string;
  handle: string;
}

interface Deps {
  /** The signed-in user's id (JWT sub), read at call time. */
  myUserId: MutableRefObject<string>;
  /** Re-runs the hub connection when the signed-in user becomes known. */
  currentUserId: string;
  isAuthenticated: boolean;
  showToast: (message: string, severity?: ToastSeverity) => void;
}

/**
 * Messenger: real conversations over the Chat module + SignalR hub. The UI is keyed by
 * the peer's userId; behind it, a DM is found or created (chat + BOTH participants, me
 * included) and every send waits for that same creation, so a first message is never
 * sent into a chat the other person is not in. Failures are reported to the user.
 */
export function useChat({ myUserId, currentUserId, isAuthenticated, showToast }: Deps) {
  const [activeChats, setActiveChats] = usePersistentState<ChatBoxState[]>('nexus_active_chats', () => []);
  const [chatMessages, setChatMessages] = usePersistentState<Record<string, ChatMessage[]>>('nexus_chat_messages', () => ({}));
  const [chatThreads, setChatThreads] = usePersistentState<ChatThread[]>('nexus_chat_threads', () => []);

  const chatIdByPeer = useRef<Map<string, string>>(new Map()); // peerUserId -> chatId
  const peerByChatId = useRef<Map<string, Peer>>(new Map());
  const pendingChatByPeer = useRef<Map<string, Promise<string>>>(new Map()); // in-flight DM creation

  const addParticipant = async (chatId: string, userId: string, failure: string) => {
    const { error, response } = await chatApi.POST('/api/chat-participants', {
      body: { chatId, userId, role: 'member' },
    });
    if (!response.ok) throw new Error(describeApiError(error, response, failure));
  };

  // Find an existing DM between me and `peer`, else create one with both participants.
  const createOrFindDm = async (peer: Peer): Promise<string> => {
    const myId = myUserId.current;
    if (!myId) throw new Error('Your session is still loading. Try again in a moment.');

    const { data: parts, error: partsError, response: partsResponse } = await chatApi.GET('/api/chat-participants');
    if (!parts) throw new Error(describeApiError(partsError, partsResponse, 'Could not load your conversations'));

    const myChatIds = new Set(parts.filter((p) => p.userId === myId).map((p) => p.chatId));
    let chatId = parts.find((p) => p.userId === peer.userId && myChatIds.has(p.chatId))?.chatId;

    if (!chatId) {
      const { data: chat, error, response } = await chatApi.POST('/api/chats', {
        body: { type: 'dm', title: null, createdBy: myId },
      });
      if (!chat) throw new Error(describeApiError(error, response, 'Could not start the conversation'));
      chatId = chat.id;
      // Both members must be in the chat before anything is sent, or the other person never gets it.
      await addParticipant(chatId, myId, 'Could not add you to the conversation');
      await addParticipant(chatId, peer.userId, `Could not add ${peer.name} to the conversation`);
    }

    await joinChat(chatId).catch(() => {
      throw new Error('Could not connect to live chat. Check your connection and try again.');
    });
    chatIdByPeer.current.set(peer.userId, chatId);
    peerByChatId.current.set(chatId, peer);
    return chatId;
  };

  // Resolve the peer's chat once; concurrent callers (open + first send) share one request.
  const ensureDmChat = (peer: Peer): Promise<string> => {
    const known = chatIdByPeer.current.get(peer.userId);
    if (known) return Promise.resolve(known);
    const pending = pendingChatByPeer.current.get(peer.userId);
    if (pending) return pending;
    const created = createOrFindDm(peer).finally(() => pendingChatByPeer.current.delete(peer.userId));
    pendingChatByPeer.current.set(peer.userId, created);
    return created;
  };

  const messageDtoToChat = (m: MessageDto): ChatMessage => ({
    id: m.id,
    senderId: m.senderId,
    text: m.content,
    createdAt: 'Just now',
  });

  // Pull a conversation's history (no timestamp in the v0 schema, so DB order).
  const loadChatHistory = async (chatId: string, peerId: string) => {
    const { data } = await chatApi.GET('/api/messages');
    if (!data) return;
    const history = data.filter((m) => m.chatId === chatId).map(messageDtoToChat);
    setChatMessages((prev) => ({ ...prev, [peerId]: history }));
  };

  // On login: discover my existing conversations, resolve each peer's profile, join
  // their hub groups (so inbound arrives before I open them), and build the thread
  // list + message cache.
  const loadChats = async () => {
    const myId = myUserId.current;
    if (!myId) return;
    const { data: parts } = await chatApi.GET('/api/chat-participants');
    if (!parts) return;
    const myChatIds = parts.filter((p) => p.userId === myId).map((p) => p.chatId);
    if (myChatIds.length === 0) { setChatThreads([]); return; }

    const { data: allMessages } = await chatApi.GET('/api/messages');
    const threads: ChatThread[] = [];
    const messagesByPeer: Record<string, ChatMessage[]> = {};

    for (const chatId of myChatIds) {
      const other = parts.find((p) => p.chatId === chatId && p.userId !== myId);
      if (!other) continue; // empty/self chat
      const profile = await getProfile(other.userId).catch(() => null);
      const peer: Peer = {
        userId: other.userId,
        name: profile?.displayName || 'Member',
        avatar: mediaUrl(profile?.avatarUrl) ?? defaultAvatar(other.userId),
        handle: withHandle(profile?.handle),
      };
      chatIdByPeer.current.set(peer.userId, chatId);
      peerByChatId.current.set(chatId, peer);
      await joinChat(chatId).catch(() => {});

      const history = (allMessages ?? []).filter((m) => m.chatId === chatId).map(messageDtoToChat);
      messagesByPeer[peer.userId] = history;
      const last = history[history.length - 1];
      threads.push({
        userId: peer.userId, name: peer.name, avatar: peer.avatar, handle: peer.handle,
        lastMessage: last?.text ?? 'Say hello!', lastMessageTime: 'recently', unread: false,
      });
    }
    setChatThreads(threads);
    setChatMessages((prev) => ({ ...prev, ...messagesByPeer }));
  };

  const openChatWithUser = (user: { id: string; name: string; avatar: string; handle: string }) => {
    if (!user.id || user.id === myUserId.current) return; // no chat with an unknown or with myself

    setActiveChats((prev) => {
      const exists = prev.find((c) => c.userId === user.id);
      // Re-opening an existing chat moves it to the end (the newest chat is the one shown on phones).
      if (exists) return [...prev.filter((c) => c.userId !== user.id), { ...exists, isMinimized: false }];
      const list = [...prev];
      if (list.length >= 2) list.shift(); // Max 2 chats side-by-side
      return [...list, { userId: user.id, name: user.name, avatar: user.avatar, handle: user.handle, isMinimized: false }];
    });
    setChatThreads((prev) => {
      const exists = prev.find((t) => t.userId === user.id);
      if (exists) return prev.map((t) => t.userId === user.id ? { ...t, unread: false } : t);
      return [{ userId: user.id, name: user.name, avatar: user.avatar, handle: user.handle, lastMessage: 'Conversation started', lastMessageTime: 'Just now', unread: false }, ...prev];
    });

    // Establish the backend conversation and load its history. Failures are shown.
    const peer: Peer = { userId: user.id, name: user.name, avatar: user.avatar, handle: user.handle };
    ensureDmChat(peer)
      .then((chatId) => loadChatHistory(chatId, user.id))
      .catch((err) => showToast(messageOf(err, 'Could not open the conversation')));
  };

  const closeChat = (userId: string) => {
    setActiveChats((prev) => prev.filter((c) => c.userId !== userId));
  };

  const minimizeChat = (userId: string) => {
    setActiveChats((prev) =>
      prev.map((c) => c.userId === userId ? { ...c, isMinimized: !c.isMinimized } : c)
    );
  };

  // Send through the hub: the DM is created (or found) first, then the message is persisted
  // server-side (sender bound from JWT) and broadcast back as ReceiveMessage. Rejects on failure
  // so the composer keeps the text.
  const sendMessage = async (userId: string, text: string): Promise<void> => {
    const body = text.trim();
    if (!body) return;
    const known = activeChats.find((c) => c.userId === userId) ?? chatThreads.find((t) => t.userId === userId);
    if (!known) throw new Error('This conversation is no longer open. Reopen it and try again.');
    const chatId = await ensureDmChat({ userId, name: known.name, avatar: known.avatar, handle: known.handle });
    await sendChatMessage(chatId, body);
  };

  // Incoming message (ours or the peer's) for any joined conversation.
  const handleIncomingMessage = (m: MessageDto) => {
    const peer = peerByChatId.current.get(m.chatId);
    if (!peer) return; // a chat we haven't opened/mapped this session
    const mine = m.senderId === myUserId.current;
    const msg = messageDtoToChat(m);
    setChatMessages((prev) => {
      const existing = prev[peer.userId] ?? [];
      if (existing.some((e) => e.id === msg.id)) return prev; // dedupe
      return { ...prev, [peer.userId]: [...existing, msg] };
    });
    setChatThreads((prev) => {
      const rest = prev.filter((t) => t.userId !== peer.userId);
      const isActive = activeChats.some((c) => c.userId === peer.userId && !c.isMinimized);
      return [{
        userId: peer.userId, name: peer.name, avatar: peer.avatar, handle: peer.handle,
        lastMessage: msg.text, lastMessageTime: 'Just now', unread: !mine && !isActive,
      }, ...rest];
    });
  };

  // Keep the hub handler pointing at the latest closure (activeChats) without
  // re-subscribing the connection on every render.
  const incomingRef = useRef(handleIncomingMessage);
  incomingRef.current = handleIncomingMessage;

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
        if (active) showToast('Live chat is unavailable right now. Messages may not arrive.', 'info');
      }
    })();
    return () => { active = false; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUserId]);

  // Forget the previous account's conversation maps (used when the signed-in user changes).
  const reset = () => {
    setActiveChats([]);
    setChatMessages({});
    setChatThreads([]);
    chatIdByPeer.current.clear();
    peerByChatId.current.clear();
    pendingChatByPeer.current.clear();
  };

  // Torn down by auth on logout: drop the peer maps and close the connection.
  const teardown = () => {
    chatIdByPeer.current.clear();
    peerByChatId.current.clear();
    pendingChatByPeer.current.clear();
    disconnectChatHub().catch(() => {});
  };

  return { activeChats, chatMessages, chatThreads, openChatWithUser, closeChat, minimizeChat, sendMessage, teardown, reset };
}
