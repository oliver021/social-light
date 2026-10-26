import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { Messenger } from './Messenger';
import type { ChatBoxState } from '../types';

const ANA_ID = 'user-ana';
const ana: ChatBoxState = { userId: ANA_ID, name: 'Ana Ruiz', avatar: '', handle: '@ana', isMinimized: false };

describe('Messenger: blocking from the chat header', () => {
  it('Block asks first; Cancel does nothing; Block calls blockUser with that person id', async () => {
    const { user, ctx } = renderWithProviders(<Messenger />, { context: { activeChats: [ana], chatMessages: {} } });

    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' }));
    let dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent("They won't be told.");
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(ctx.blockUser).not.toHaveBeenCalled();
  });

  it('confirming calls blockUser for that chat\'s person', async () => {
    const { user, ctx } = renderWithProviders(<Messenger />, { context: { activeChats: [ana], chatMessages: {} } });
    await user.click(screen.getByRole('button', { name: 'More actions for the chat with Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block' }));
    expect(ctx.blockUser).toHaveBeenCalledWith(ANA_ID);
  });
});
