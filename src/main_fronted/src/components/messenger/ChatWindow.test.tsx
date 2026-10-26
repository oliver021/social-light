import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { ChatWindow } from './ChatWindow';
import type { ChatBoxState, ChatMessage, ChatThread } from '../../types';

const ME = 'me-0000-0000-0000-000000000001';
const ana: ChatBoxState = { chatId: 'chat-ana', kind: 'dm', userId: 'user-ana', name: 'Ana Ruiz', avatar: '', handle: '@ana', isMinimized: false };
const group: ChatBoxState = { chatId: 'chat-group', kind: 'group', userId: '', name: 'Trip', avatar: '', handle: '', isMinimized: false };

const thread = (over: Partial<ChatThread>): ChatThread => ({
  chatId: 'chat-ana', kind: 'dm', userId: 'user-ana', name: 'Ana Ruiz', avatar: '', handle: '@ana',
  lastMessage: '', lastMessageTime: '', unreadCount: 0, unread: false, muted: false, ...over,
});

const mine: ChatMessage = { id: 'm1', senderId: ME, text: 'See you there', createdAt: 'Just now', contentType: 'text' };
const theirs: ChatMessage = { id: 'm2', senderId: 'user-ana', text: 'Sure', createdAt: 'Just now', contentType: 'text' };

describe('ChatWindow: mute', () => {
  it('Mute for 8 hours calls muteChat with that choice and this chat', async () => {
    const muteChat = vi.fn(async () => {});
    const { user } = renderWithProviders(<ChatWindow chat={ana} messages={[]} />, { context: { muteChat } });
    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mute for 8 hours' }));
    expect(muteChat).toHaveBeenCalledWith('chat-ana', 'eight_hours');
  });

  it('Mute until I turn it back on stores the always choice', async () => {
    const muteChat = vi.fn(async () => {});
    const { user } = renderWithProviders(<ChatWindow chat={ana} messages={[]} />, { context: { muteChat } });
    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mute until I turn it back on' }));
    expect(muteChat).toHaveBeenCalledWith('chat-ana', 'always');
  });

  it('a muted chat shows the muted mark and offers Unmute instead', async () => {
    const unmuteChat = vi.fn(async () => {});
    const { user } = renderWithProviders(<ChatWindow chat={ana} messages={[]} />, {
      context: { isChatMuted: () => true, unmuteChat },
    });
    expect(screen.getByRole('img', { name: 'Muted' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Ana Ruiz' }));
    expect(screen.queryByRole('menuitem', { name: 'Mute for 8 hours' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Unmute' }));
    expect(unmuteChat).toHaveBeenCalledWith('chat-ana');
  });
});

describe('ChatWindow: block from the chat', () => {
  it('asks first; a successful person block is followed by the chat-level block', async () => {
    const blockUser = vi.fn(async () => true);
    const blockInChat = vi.fn(async () => {});
    const { user } = renderWithProviders(<ChatWindow chat={ana} messages={[]} />, { context: { blockUser, blockInChat } });
    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Block' }));
    await waitFor(() => expect(blockInChat).toHaveBeenCalledWith('chat-ana', 'user-ana'));
    expect(blockUser).toHaveBeenCalledWith('user-ana');
  });

  it('a refused person block writes no chat-level block', async () => {
    const blockUser = vi.fn(async () => false);
    const blockInChat = vi.fn(async () => {});
    const { user } = renderWithProviders(<ChatWindow chat={ana} messages={[]} />, { context: { blockUser, blockInChat } });
    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block' }));
    await waitFor(() => expect(blockUser).toHaveBeenCalled());
    expect(blockInChat).not.toHaveBeenCalled();
  });

  it('a group offers no Block action', async () => {
    const { user } = renderWithProviders(<ChatWindow chat={group} messages={[]} />, {
      context: { chatThreads: [thread({ chatId: 'chat-group', kind: 'group', userId: '', name: 'Trip', memberCount: 3 })] },
    });
    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Trip' }));
    expect(screen.queryByRole('menuitem', { name: /^Block/ })).not.toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
  });
});

describe('ChatWindow: seen, unread and pins', () => {
  it('"Seen" sits under my latest message that Ana has read', () => {
    const chatMeta = { receipts: [{ id: 'r1', messageId: 'm1', userId: 'user-ana', readAt: 'x' }], reactions: [], pins: [], mutes: [] };
    renderWithProviders(<ChatWindow chat={ana} messages={[mine, theirs]} />, { context: { chatMeta } });
    expect(screen.getByLabelText('Seen by Ana Ruiz')).toHaveTextContent('Seen');
  });

  it('in a group "Seen" counts the readers', () => {
    renderWithProviders(<ChatWindow chat={group} messages={[mine]} />, {
      context: {
        chatMeta: {
          receipts: [
            { id: 'r1', messageId: 'm1', userId: 'user-ana', readAt: 'x' },
            { id: 'r2', messageId: 'm1', userId: 'user-ben', readAt: 'x' },
          ],
          reactions: [], pins: [], mutes: [],
        },
      },
    });
    expect(screen.getByLabelText('Seen by 2')).toHaveTextContent('Seen by 2');
  });

  it('shows the unread badge of the chat', () => {
    renderWithProviders(<ChatWindow chat={{ ...ana, isMinimized: false }} messages={[]} />, {
      context: { chatThreads: [thread({ unreadCount: 2, unread: true })] },
    });
    expect(screen.getByLabelText('2 unread')).toBeInTheDocument();
  });

  it('the pinned bar shows the pinned text and Unpin calls unpinMessage for this chat', async () => {
    const unpinMessage = vi.fn(async () => {});
    const { user } = renderWithProviders(<ChatWindow chat={ana} messages={[mine, theirs]} />, {
      context: { chatMeta: { receipts: [], reactions: [], pins: [{ id: 'p1', chatId: 'chat-ana', messageId: 'm2' }], mutes: [] }, unpinMessage },
    });
    expect(screen.getByRole('button', { name: 'Go to the pinned message' })).toHaveTextContent('Sure');
    await user.click(screen.getByRole('button', { name: 'Unpin message' }));
    expect(unpinMessage).toHaveBeenCalledWith('chat-ana');
  });
});

describe('ChatWindow: images', () => {
  it('choosing a file sends it through sendImage for this chat', async () => {
    const sendImage = vi.fn(async () => {});
    const { container } = renderWithProviders(<ChatWindow chat={ana} messages={[]} />, { context: { sendImage } });
    const file = new File(['x'], 'beach.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(sendImage).toHaveBeenCalledWith('chat-ana', file, expect.any(Function)));
  });

  it('a failed upload says why, and the composer keeps working', async () => {
    const showToast = vi.fn();
    const sendImage = vi.fn(async () => { throw new Error('Upload failed (HTTP 500). Please try again.'); });
    const { container, user } = renderWithProviders(<ChatWindow chat={ana} messages={[]} />, { context: { sendImage, showToast } });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'b.png', { type: 'image/png' })] } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Upload failed (HTTP 500). Please try again.'));
    expect(screen.getByRole('button', { name: 'Send an image' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Message Ana Ruiz' })).toBeEnabled();
  });
});
