// Pure rules for the Messenger (M6): mute expiry, unread counts, "Seen by", reaction
// summaries, pin lookup and the persisted-state migration. No React, no I/O, so each rule is
// unit-tested on its own and the hooks only wire them to the backend.
import type { ChatMessage, ChatThread, ChatBoxState } from '../types';

/** The six reactions, the same set as posts. */
export const MESSAGE_REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😆', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
] as const;

export type MessageReactionType = (typeof MESSAGE_REACTIONS)[number]['type'];

export type MuteChoice = 'eight_hours' | 'one_week' | 'always';

const HOUR_MS = 60 * 60 * 1000;

/** The `mutedUntil` to store for a mute choice: an instant, or null for "until I turn it back on". */
export function muteEndFor(choice: MuteChoice, now: Date): string | null {
  if (choice === 'always') return null;
  const ms = choice === 'eight_hours' ? 8 * HOUR_MS : 7 * 24 * HOUR_MS;
  return new Date(now.getTime() + ms).toISOString();
}

/** A mute row still applies when it has no end, or its end is in the future. */
export function isMuteActive(mutedUntil: string | null, now: number): boolean {
  if (mutedUntil === null) return true;
  const end = Date.parse(mutedUntil);
  return Number.isFinite(end) && end > now;
}

/** Peer messages (not mine) that I have no read receipt for. */
export function unreadPeerMessages(messages: ChatMessage[], myId: string, readIds: Set<string>): ChatMessage[] {
  return messages.filter((m) => m.senderId !== myId && !readIds.has(m.id));
}

/** Other people who have a read receipt for a message (never me). */
export function seenByUsers(messageId: string, receipts: { messageId: string; userId: string }[], myId: string): string[] {
  const users = new Set<string>();
  for (const r of receipts) {
    if (r.messageId === messageId && r.userId !== myId) users.add(r.userId);
  }
  return [...users];
}

export interface ReactionSummary {
  /** Count per reaction type, only types with at least one reaction. */
  counts: { type: string; count: number }[];
  total: number;
  /** My reaction on this message, if any. */
  mine: { id: string; reactionType: string } | null;
}

export function summarizeReactions(
  messageId: string,
  reactions: { id: string; messageId: string; userId: string; reactionType: string }[],
  myId: string,
): ReactionSummary {
  const byType = new Map<string, number>();
  let mine: ReactionSummary['mine'] = null;
  let total = 0;
  for (const r of reactions) {
    if (r.messageId !== messageId) continue;
    total += 1;
    byType.set(r.reactionType, (byType.get(r.reactionType) ?? 0) + 1);
    if (r.userId === myId) mine = { id: r.id, reactionType: r.reactionType };
  }
  return {
    counts: [...byType.entries()].map(([type, count]) => ({ type, count })),
    total,
    mine,
  };
}

/** The pin of a chat, if it has one (the UI keeps at most one). */
export function pinOf<T extends { chatId: string }>(chatId: string, pins: T[]): T | undefined {
  return pins.find((p) => p.chatId === chatId);
}

/**
 * Persisted-state migration: a window or thread saved before chats were keyed by chatId has
 * no chatId and is dropped; it is rediscovered by loadChats.
 */
export function keepChatKeyed<T extends { chatId?: string }>(entries: T[]): T[] {
  return entries.filter((e): e is T & { chatId: string } => typeof e.chatId === 'string' && e.chatId.length > 0);
}

/** Keep only the message lists whose chat survived the migration. */
export function keepMessagesFor(
  messages: Record<string, ChatMessage[]>,
  threads: ChatThread[],
  windows: ChatBoxState[],
): Record<string, ChatMessage[]> {
  const live = new Set([...threads.map((t) => t.chatId), ...windows.map((w) => w.chatId)]);
  return Object.fromEntries(Object.entries(messages).filter(([chatId]) => live.has(chatId)));
}

/** Pretty "Seen by" copy for a DM (the name) or a group (a count). */
export function seenLabel(kind: 'dm' | 'group', names: string[], count: number): string {
  if (kind === 'dm') return `Seen by ${names[0] ?? 'them'}`;
  return `Seen by ${count}`;
}
