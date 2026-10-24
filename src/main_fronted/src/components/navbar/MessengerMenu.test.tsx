import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { MessengerMenu } from './MessengerMenu';
import type { ChatThread } from '../../types';

const thread: ChatThread = {
  userId: 'user-ana',
  name: 'Ana Ruiz',
  avatar: '',
  handle: '@ana',
  lastMessage: 'See you soon',
  lastMessageTime: '5m',
  unread: true,
};

describe('MessengerMenu', () => {
  it('names the icon with the unread count', () => {
    renderWithProviders(<MessengerMenu />, { context: { chatThreads: [thread] } });
    expect(screen.getByRole('button', { name: 'Open messenger, 1 unread' })).toBeInTheDocument();
  });

  it('shows an empty state with no conversations', async () => {
    const { user } = renderWithProviders(<MessengerMenu />, { context: { chatThreads: [] } });
    await user.click(screen.getByRole('button', { name: 'Open messenger' }));
    expect(screen.getByRole('heading', { name: 'No conversations yet' })).toBeInTheDocument();
    expect(screen.getByText('Message someone from People you may know.')).toBeInTheDocument();
  });

  it('choosing a conversation opens its chat with the peer id', async () => {
    const openChatWithUser = vi.fn();
    const { user } = renderWithProviders(<MessengerMenu />, {
      context: { chatThreads: [thread], openChatWithUser },
    });
    await user.click(screen.getByRole('button', { name: 'Open messenger, 1 unread' }));
    await user.click(screen.getByRole('button', { name: 'Chat with Ana Ruiz' }));
    expect(openChatWithUser).toHaveBeenCalledWith({ id: 'user-ana', name: 'Ana Ruiz', avatar: '', handle: '@ana' });
  });
});

describe('MessengerMenu loading state', () => {
  it('shows a skeleton, not the empty state, while the thread list is pending', async () => {
    const { user } = renderWithProviders(<MessengerMenu />, { context: { chatThreads: [], chatThreadsLoading: true } });
    await user.click(screen.getByRole('button', { name: 'Open messenger' }));
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No conversations yet' })).not.toBeInTheDocument();
  });

  it('shows the empty state once the list has settled', async () => {
    const { user } = renderWithProviders(<MessengerMenu />, { context: { chatThreads: [], chatThreadsLoading: false } });
    await user.click(screen.getByRole('button', { name: 'Open messenger' }));
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No conversations yet' })).toBeInTheDocument();
  });
});
