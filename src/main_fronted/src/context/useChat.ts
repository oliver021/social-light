import { useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, ChatBoxState, ChatThread } from '../types';
import { chatApi, getProfile } from '../api/gateway';
import { connectChatHub, joinChat, sendChatMessage, onChatMessage, disconnectChatHub, type MessageDto } from '../api/realtime';
import { usePersistentState } from './usePersistentState';

interface Deps {
  currentUser: UserProfile;
  isAuthenticated: boolean;
}

/**
 * Messenger (C3/C4): real conversations over the Chat module + SignalR hub. The UI
 * stays keyed by the peer's userId; behind the seam we map peer -> backend chatId
 * (find-or-create a DM) and route sends/receives through the hub. Because ChatHub
 * broadcasts with Clients.Group (which includes the sender), BOTH our own and the
 * peer's messages arrive through the single onChatMessage handler — so there's no
 * optimistic echo to reconcile.
 */
export function useChat({ currentUser, isAuthenticated }: Deps) {
  const [activeChats, setActiveChats] = usePersistentState<ChatBoxState[]>('nexus_active_chats', () => []);
  const [chatMessages, setChatMessages] = usePersistentState<Record<string, ChatMessage[]>>('nexus_chat_messages', () => ({}));
  const [chatThreads, setChatThreads] = usePersistentState<ChatThread[]>('nexus_chat_threads', () => []);

  const chatIdByPeer = useRef<Map<string, string>>(new Map()); // peerUserId -> chatId
  const peerByChatId = useRef<Map<string, { userId: string; name: string; avatar: string; handle: string }>>(new Map());

  // Find an existing DM between me and `peer`, else create one (chat + both
  // participants). The v0 chat module has no per-user query, so we list once.
  const findOrCreateDmChat = async (peer: { userId: string; name: string; avatar: string; handle: string }): Promise<string | null> => {
    const cached = chatIdByPeer.current.get(peer.userId);
    if (cached) return cached;
    const myId = currentUser.id;
    if (!myId) return null;

    const { data: parts } = await chatApi.GET('/api/chat-participants');
    let chatId: string | undefined;
    if (parts) {
      const myChatIds = new Set(parts.filter((p) => p.userId === myId).map((p) => p.chatId));
      chatId = parts.find((p) => p.userId === peer.userId && myChatIds.has(p.chatId))?.chatId;
    }
    if (!chatId) {
      const { data: chat } = await chatApi.POST('/api/chats', {
        body: { type: 'dm', title: null, createdBy: myId },
      });
      if (!chat) return null;
      chatId = chat.id;
      await chatApi.POST('/api/chat-participants', { body: { chatId, userId: myId, role: 'member' } });
      await chatApi.POST('/api/chat-participants', { body: { chatId, userId: peer.userId, role: 'member' } });
    }
    chatIdByPeer.current.set(peer.userId, chatId);
    peerByChatId.current.set(chatId, peer);
    return chatId;
  };

  const messageDtoToChat = (m: MessageDto): ChatMessage => ({
    id: m.id,
    senderId: m.senderId === currentUser.id ? 'current-user-1' : m.senderId,
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
  // list + message cache. Replaces the seeded mock threads with real ones.
  const loadChats = async () => {
    const myId = currentUser.id;
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
      const peer = {
        userId: other.userId,
        name: profile?.displayName || 'Member',
        avatar: profile?.avatarUrl ?? `https://api.dicebear.com/7.x/identicon/svg?seed=${other.userId}`,
        handle: profile?.handle ? `@${profile.handle}` : `@${other.userId.slice(0, 8)}`,
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

    // Establish the backend conversation, subscribe to live updates, load history.
    (async () => {
      const peer = { userId: user.id, name: user.name, avatar: user.avatar, handle: user.handle };
      const chatId = await findOrCreateDmChat(peer);
      if (!chatId) return;
      await joinChat(chatId);
      await loadChatHistory(chatId, user.id);
    })().catch(() => {});
  };

  const closeChat = (userId: string) => {
    setActiveChats((prev) => prev.filter((c) => c.userId !== userId));
  };

  const minimizeChat = (userId: string) => {
    setActiveChats((prev) =>
      prev.map((c) => c.userId === userId ? { ...c, isMinimized: !c.isMinimized } : c)
    );
  };

  // Send through the hub: persisted server-side (sender bound from JWT) and broadcast
  // back to us as ReceiveMessage, which the handler renders — so we do NOT append here.
  const sendMessage = (userId: string, text: string) => {
    if (!text.trim()) return;
    const chatId = chatIdByPeer.current.get(userId);
    if (!chatId) return; // not a backed conversation (yet)
    sendChatMessage(chatId, text).catch(() => {});
  };

  // Incoming message (ours or the peer's) for any joined conversation.
  const handleIncomingMessage = (m: MessageDto) => {
    const peer = peerByChatId.current.get(m.chatId);
    if (!peer) return; // a chat we haven't opened/mapped this session
    const mine = m.senderId === currentUser.id;
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

  // Keep the hub handler pointing at the latest closure (currentUser/activeChats)
  // without re-subscribing the connection on every render.
  const incomingRef = useRef(handleIncomingMessage);
  incomingRef.current = handleIncomingMessage;

  // Connect the SignalR hub once authenticated (and once we know our own id), wire
  // the receive handler, and hydrate existing conversations.
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;
    let active = true;
    let unsub: () => void = () => {};
    (async () => {
      try {
        await connectChatHub();
        if (!active) return;
        unsub = onChatMessage((m) => incomingRef.current(m));
        await loadChats();
      } catch {
        /* hub/chat unavailable — messenger just stays empty */
      }
    })();
    return () => { active = false; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser.id]);

  // Torn down by auth on logout: drop the peer maps and close the connection.
  const teardown = () => {
    chatIdByPeer.current.clear();
    peerByChatId.current.clear();
    disconnectChatHub().catch(() => {});
  };

  return { activeChats, chatMessages, chatThreads, openChatWithUser, closeChat, minimizeChat, sendMessage, teardown };
}
