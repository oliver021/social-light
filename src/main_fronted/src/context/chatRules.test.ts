import { describe, it, expect } from 'vitest';
import {
  muteEndFor,
  isMuteActive,
  unreadPeerMessages,
  seenByUsers,
  summarizeReactions,
  pinOf,
  keepChatKeyed,
  keepMessagesFor,
  seenLabel,
} from './chatRules';
import type { ChatMessage, ChatThread, ChatBoxState } from '../types';

const ME = 'me';
const msg = (id: string, senderId: string): ChatMessage => ({ id, senderId, text: id, createdAt: 'Just now' });

describe('muteEndFor', () => {
  const now = new Date('2026-10-26T10:00:00.000Z');
  it('8 hours and 1 week are instants from now', () => {
    expect(muteEndFor('eight_hours', now)).toBe('2026-10-26T18:00:00.000Z');
    expect(muteEndFor('one_week', now)).toBe('2026-11-02T10:00:00.000Z');
  });
  it('until I turn it back on is null', () => {
    expect(muteEndFor('always', now)).toBeNull();
  });
});

describe('isMuteActive', () => {
  it('null never expires; a past end is expired; a future end applies', () => {
    const now = Date.parse('2026-10-26T10:00:00.000Z');
    expect(isMuteActive(null, now)).toBe(true);
    expect(isMuteActive('2026-10-26T09:00:00.000Z', now)).toBe(false);
    expect(isMuteActive('2026-10-26T11:00:00.000Z', now)).toBe(true);
    expect(isMuteActive('not a date', now)).toBe(false);
  });
});

describe('unreadPeerMessages', () => {
  it('counts peer messages without my receipt, never my own', () => {
    const messages = [msg('a', 'peer'), msg('b', ME), msg('c', 'peer'), msg('d', 'peer')];
    const unread = unreadPeerMessages(messages, ME, new Set(['c']));
    expect(unread.map((m) => m.id)).toEqual(['a', 'd']);
  });
});

describe('seenByUsers', () => {
  it('lists other readers of one message, never me, each once', () => {
    const receipts = [
      { messageId: 'm1', userId: 'peer' },
      { messageId: 'm1', userId: ME },
      { messageId: 'm1', userId: 'peer' },
      { messageId: 'm2', userId: 'other' },
    ];
    expect(seenByUsers('m1', receipts, ME)).toEqual(['peer']);
    expect(seenByUsers('m3', receipts, ME)).toEqual([]);
  });
});

describe('summarizeReactions', () => {
  it('aggregates per type and finds my own reaction', () => {
    const rows = [
      { id: 'r1', messageId: 'm1', userId: 'peer', reactionType: 'like' },
      { id: 'r2', messageId: 'm1', userId: ME, reactionType: 'love' },
      { id: 'r3', messageId: 'm2', userId: ME, reactionType: 'wow' },
    ];
    const s = summarizeReactions('m1', rows, ME);
    expect(s.total).toBe(2);
    expect(s.counts).toEqual([{ type: 'like', count: 1 }, { type: 'love', count: 1 }]);
    expect(s.mine).toEqual({ id: 'r2', reactionType: 'love' });
    expect(summarizeReactions('m9', rows, ME).mine).toBeNull();
  });
});

describe('pinOf and the migration', () => {
  it('finds the pin of one chat', () => {
    const pins = [{ id: 'p1', chatId: 'c1', messageId: 'm1' }, { id: 'p2', chatId: 'c2', messageId: 'm2' }];
    expect(pinOf('c2', pins)?.id).toBe('p2');
    expect(pinOf('c3', pins)).toBeUndefined();
  });

  it('drops entries saved without a chatId', () => {
    const legacy = [{ userId: 'user-ana', name: 'Ana' }, { chatId: 'c1', userId: 'u', name: 'B' }] as unknown as ChatBoxState[];
    expect(keepChatKeyed(legacy).map((c) => c.chatId)).toEqual(['c1']);
  });

  it('keeps message lists only for surviving chats', () => {
    const threads = [{ chatId: 'c1' }] as ChatThread[];
    const windows = [] as ChatBoxState[];
    const kept = keepMessagesFor({ c1: [msg('a', 'x')], 'user-ana': [msg('b', 'x')] }, threads, windows);
    expect(Object.keys(kept)).toEqual(['c1']);
  });
});

describe('seenLabel', () => {
  it('names the reader in a DM and counts readers in a group', () => {
    expect(seenLabel('dm', ['Ana'], 1)).toBe('Seen by Ana');
    expect(seenLabel('group', ['Ana', 'Ben'], 2)).toBe('Seen by 2');
  });
});
