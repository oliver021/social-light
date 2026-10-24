import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { Messenger } from './Messenger';
import type { ChatBoxState } from '../types';

const ana: ChatBoxState = {
  userId: 'user-ana',
  name: 'Ana Ruiz',
  avatar: '',
  handle: '@ana',
  isMinimized: false,
};

describe('Messenger', () => {
  it('an empty conversation invites the first message', () => {
    renderWithProviders(<Messenger />, { context: { activeChats: [ana], chatMessages: {} } });
    expect(screen.getByText('Say hello to start the conversation.')).toBeInTheDocument();
  });

  it('sending a message calls sendMessage and clears the composer', async () => {
    const sendMessage = vi.fn(async () => {});
    const { user } = renderWithProviders(<Messenger />, {
      context: { activeChats: [ana], chatMessages: {}, sendMessage },
    });
    const input = screen.getByRole('textbox', { name: 'Message Ana Ruiz' });
    await user.type(input, 'hi there');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(sendMessage).toHaveBeenCalledWith('user-ana', 'hi there');
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('a failed send keeps the text and shows the reason', async () => {
    const showToast = vi.fn();
    const sendMessage = vi.fn(async () => {
      throw new Error('Chat is unavailable');
    });
    const { user } = renderWithProviders(<Messenger />, {
      context: { activeChats: [ana], chatMessages: {}, sendMessage, showToast },
    });
    const input = screen.getByRole('textbox', { name: 'Message Ana Ruiz' });
    await user.type(input, 'hello');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Chat is unavailable'));
    expect(input).toHaveValue('hello');
  });

  it('with an empty composer the button sends a thumbs up', async () => {
    const sendMessage = vi.fn(async () => {});
    const { user } = renderWithProviders(<Messenger />, {
      context: { activeChats: [ana], chatMessages: {}, sendMessage },
    });
    await user.click(screen.getByRole('button', { name: 'Send thumbs up' }));
    expect(sendMessage).toHaveBeenCalledWith('user-ana', '👍');
  });

  it('the minimize button calls minimizeChat for that chat', async () => {
    const minimizeChat = vi.fn();
    const { user } = renderWithProviders(<Messenger />, {
      context: { activeChats: [ana], chatMessages: {}, minimizeChat },
    });
    await user.click(screen.getByRole('button', { name: 'Minimize chat with Ana Ruiz' }));
    expect(minimizeChat).toHaveBeenCalledWith('user-ana');
  });
});
