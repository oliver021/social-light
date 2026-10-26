// SignalR connection manager for the chat hub. Thin wrapper: connect with the
// bearer token (passed on the WebSocket handshake via access_token), join/leave
// conversation groups, send a message (persisted + broadcast server-side), and
// surface incoming messages. The hub contract is the novel realtime layer the
// code-engine generated for the Chat module (ChatHub: Join/Leave/Send, ReceiveMessage).
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { CHAT_HUB_URL, getAccessToken } from './gateway';
import type { components as ChatComponents } from '@sdk/chat';

export type MessageDto = ChatComponents['schemas']['MessageDto'];

let connection: HubConnection | null = null;
const messageHandlers = new Set<(m: MessageDto) => void>();

/** Idempotently connect (or reuse) the hub connection using the current token. */
export async function connectChatHub(): Promise<HubConnection> {
  if (connection && connection.state === HubConnectionState.Connected) return connection;
  if (connection) {
    try { await connection.start(); return connection; } catch { /* rebuild below */ }
  }

  connection = new HubConnectionBuilder()
    .withUrl(CHAT_HUB_URL, { accessTokenFactory: () => getAccessToken() ?? '' })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on('ReceiveMessage', (message: MessageDto) => {
    for (const handler of messageHandlers) handler(message);
  });

  await connection.start();
  return connection;
}

export async function joinChat(chatId: string): Promise<void> {
  const conn = await connectChatHub();
  await conn.invoke('Join', chatId);
}

export async function leaveChat(chatId: string): Promise<void> {
  if (!connection || connection.state !== HubConnectionState.Connected) return;
  await connection.invoke('Leave', chatId);
}

/**
 * Persist + broadcast a message through the hub. Server binds the sender from the JWT.
 * For `image` messages `content` is the uploaded file url.
 */
export async function sendChatMessage(chatId: string, content: string, contentType: 'text' | 'image' = 'text'): Promise<void> {
  const conn = await connectChatHub();
  await conn.invoke('Send', chatId, contentType, content, null);
}

/** Subscribe to incoming messages; returns an unsubscribe fn. */
export function onChatMessage(handler: (m: MessageDto) => void): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

export async function disconnectChatHub(): Promise<void> {
  messageHandlers.clear();
  if (connection) {
    try { await connection.stop(); } catch { /* ignore */ }
    connection = null;
  }
}
