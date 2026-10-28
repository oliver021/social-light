import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../../types';
import { summarizeReactions } from '../../context/chatRules';

const text: ChatMessage = { id: 'm1', senderId: 'user-ana', text: 'Lunch?', createdAt: 'Just now', contentType: 'text' };
const photo: ChatMessage = { id: 'm2', senderId: 'user-ana', text: '/blobs/beach.png', createdAt: 'Just now', contentType: 'image' };
const none = summarizeReactions('m1', [], 'me');

function bubble(overrides: Partial<Parameters<typeof MessageBubble>[0]> = {}) {
  const props = {
    message: text,
    isMe: false,
    senderName: 'Ana Ruiz',
    showSender: false,
    reactions: none,
    pinned: false,
    onReact: vi.fn(),
    onPin: vi.fn(),
    ...overrides,
  };
  return { ...renderWithProviders(<MessageBubble {...props} />), props };
}

describe('MessageBubble reactions', () => {
  it('the React button is keyboard reachable and opens the six reactions', async () => {
    const { user, props } = bubble();
    const react = screen.getByRole('button', { name: 'React to message' });
    react.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('group', { name: 'Reactions' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^React with / })).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'React with Love' }));
    expect(props.onReact).toHaveBeenCalledWith('love');
    expect(screen.queryByRole('group', { name: 'Reactions' })).not.toBeInTheDocument();
  });

  it('shows the reaction count under the bubble', () => {
    const reactions = summarizeReactions('m1', [
      { id: 'r1', messageId: 'm1', userId: 'user-ana', reactionType: 'like' },
      { id: 'r2', messageId: 'm1', userId: 'me', reactionType: 'like' },
    ], 'me');
    bubble({ reactions });
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('MessageBubble content', () => {
  it('an image renders with its alt text, and opens full size in a dialog', async () => {
    const { user } = bubble({ message: photo });
    expect(screen.getByRole('img', { name: 'Image from Ana Ruiz' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open image from Ana Ruiz' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Image from Ana Ruiz' })).toBeInTheDocument();
  });

  it('an unknown content type renders as text, never as an image', () => {
    bubble({ message: { ...text, contentType: 'poll', text: 'Vote now' } });
    expect(screen.getByText('Vote now')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('MessageBubble pin', () => {
  it('Pin message calls onPin for an unpinned message', async () => {
    const { user, props } = bubble();
    await user.click(screen.getByRole('button', { name: 'More actions for this message from Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Pin message' }));
    expect(props.onPin).toHaveBeenCalledTimes(1);
  });

  it('a pinned message offers no Pin action', () => {
    bubble({ pinned: true });
    expect(screen.queryByRole('button', { name: 'More actions for this message from Ana Ruiz' })).not.toBeInTheDocument();
  });
});
