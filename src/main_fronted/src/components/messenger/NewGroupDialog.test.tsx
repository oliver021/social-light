import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { NewGroupDialog } from './NewGroupDialog';
import type { Person } from '../../context/useSocial';
import type { AppContextType } from '../../context/AppContext';

const person = (userId: string, name: string): Person => ({ userId, name, handle: `@${name.split(' ')[0].toLowerCase()}`, avatar: '', bio: '', followed: true });
const people = [person('user-ana', 'Ana Ruiz'), person('user-ben', 'Ben Ito'), person('user-cy', 'Cy Park')];

function setup(context: Partial<AppContextType> = {}, onClose = vi.fn()) {
  return renderWithProviders(<NewGroupDialog open onClose={onClose} />, {
    context: { people, isFollowing: () => true, ...context },
  });
}

describe('NewGroupDialog', () => {
  it('Create stays disabled until there is a title and two members', async () => {
    const { user } = setup();
    const create = screen.getByRole('button', { name: 'Create group' });
    expect(create).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: /Group name/ }), 'Trip');
    expect(create).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Ana Ruiz/ }));
    expect(create).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Ben Ito/ }));
    expect(create).toBeEnabled();
  });

  it('creates the group with the title and the picked members, then opens it', async () => {
    const createGroupChat = vi.fn(async () => ({ chatId: 'chat-group', failedUserIds: [] }));
    const openChat = vi.fn();
    const onClose = vi.fn();
    const { user } = setup({ createGroupChat, openChat }, onClose);
    await user.type(screen.getByRole('textbox', { name: /Group name/ }), '  Trip  ');
    await user.click(screen.getByRole('checkbox', { name: /Ana Ruiz/ }));
    await user.click(screen.getByRole('checkbox', { name: /Cy Park/ }));
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    await waitFor(() => expect(openChat).toHaveBeenCalledWith('chat-group'));
    expect(createGroupChat).toHaveBeenCalledWith('Trip', ['user-ana', 'user-cy']);
    expect(onClose).toHaveBeenCalled();
  });

  it('a member who could not be added is named, and the group is still opened', async () => {
    const showToast = vi.fn();
    const createGroupChat = vi.fn(async () => ({ chatId: 'chat-group', failedUserIds: ['user-ben'] }));
    const openChat = vi.fn();
    const { user } = setup({ createGroupChat, openChat, showToast });
    await user.type(screen.getByRole('textbox', { name: /Group name/ }), 'Trip');
    await user.click(screen.getByRole('checkbox', { name: /Ana Ruiz/ }));
    await user.click(screen.getByRole('checkbox', { name: /Ben Ito/ }));
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Could not add Ben Ito. The group was kept.'));
    expect(openChat).toHaveBeenCalledWith('chat-group');
  });

  it('a refused creation shows the reason and keeps the form open', async () => {
    const onClose = vi.fn();
    const createGroupChat = vi.fn(async () => { throw new Error('Could not create the group: refused'); });
    const { user } = setup({ createGroupChat }, onClose);
    await user.type(screen.getByRole('textbox', { name: /Group name/ }), 'Trip');
    await user.click(screen.getByRole('checkbox', { name: /Ana Ruiz/ }));
    await user.click(screen.getByRole('checkbox', { name: /Ben Ito/ }));
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the group: refused');
    expect(onClose).not.toHaveBeenCalled();
    expect(within(screen.getByRole('dialog')).getByRole('textbox', { name: /Group name/ })).toHaveValue('Trip');
  });

  it('with nobody followed, it says so instead of listing no one', () => {
    setup({ people: [], isFollowing: () => false });
    expect(screen.getByText('Follow people to add them to a group.')).toBeInTheDocument();
  });
});
