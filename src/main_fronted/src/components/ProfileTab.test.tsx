import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { ProfileTab } from './ProfileTab';

const me = {
  id: 'me-0000-0000-0000-000000000001',
  username: 'testuser',
  name: 'Test User',
  handle: '@testuser',
  avatar: '',
  bio: 'I build interfaces.',
  coverPhoto: '',
  followersCount: 3,
  followingCount: 5,
  interests: [] as string[],
};

describe('ProfileTab', () => {
  it('shows the name, handle and the interests empty state', () => {
    renderWithProviders(<ProfileTab />, { context: { currentUser: me } });
    expect(screen.getByRole('heading', { level: 2, name: 'Test User' })).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No interests yet' })).toBeInTheDocument();
  });

  it('adds an interest through updateProfile and clears the input', async () => {
    const { user, ctx } = renderWithProviders(<ProfileTab />, { context: { currentUser: me } });
    await user.type(screen.getByRole('textbox', { name: 'New interest' }), 'Cycling');
    await user.click(screen.getByRole('button', { name: 'Add interest' }));
    expect(ctx.updateProfile).toHaveBeenCalledWith({ interests: ['Cycling'] });
    expect(screen.getByRole('textbox', { name: 'New interest' })).toHaveValue('');
  });

  it('ignores a duplicate interest', async () => {
    const { user, ctx } = renderWithProviders(<ProfileTab />, {
      context: { currentUser: { ...me, interests: ['Cycling'] } },
    });
    await user.type(screen.getByRole('textbox', { name: 'New interest' }), 'Cycling');
    await user.click(screen.getByRole('button', { name: 'Add interest' }));
    expect(ctx.updateProfile).not.toHaveBeenCalled();
  });

  it('removes an interest through updateProfile', async () => {
    const { user, ctx } = renderWithProviders(<ProfileTab />, {
      context: { currentUser: { ...me, interests: ['Music'] } },
    });
    await user.click(screen.getByRole('button', { name: 'Remove interest Music' }));
    expect(ctx.updateProfile).toHaveBeenCalledWith({ interests: [] });
  });

  it('a failed interest save reports the message', async () => {
    const updateProfile = vi.fn(async () => {
      throw new Error('Interests are full');
    });
    const { user, ctx } = renderWithProviders(<ProfileTab />, { context: { currentUser: me, updateProfile } });
    await user.type(screen.getByRole('textbox', { name: 'New interest' }), 'Chess');
    await user.click(screen.getByRole('button', { name: 'Add interest' }));
    await waitFor(() => expect(ctx.showToast).toHaveBeenCalledWith('Interests are full', 'error'));
  });

  it('refuses an empty display name before saving', async () => {
    const { user, ctx } = renderWithProviders(<ProfileTab />, { context: { currentUser: me } });
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit profile' });
    await user.clear(within(dialog).getByLabelText('Display name'));
    await user.click(within(dialog).getByRole('button', { name: 'Save profile' }));
    expect(await within(dialog).findByText('Enter a display name.')).toBeInTheDocument();
    expect(ctx.updateProfile).not.toHaveBeenCalled();
  });

  it('refuses a handle with characters the API does not allow', async () => {
    const { user, ctx } = renderWithProviders(<ProfileTab />, { context: { currentUser: me } });
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit profile' });
    await user.clear(within(dialog).getByLabelText('Handle'));
    await user.type(within(dialog).getByLabelText('Handle'), 'no!');
    await user.click(within(dialog).getByRole('button', { name: 'Save profile' }));
    expect(await within(dialog).findByText(/3 to 30 letters/)).toBeInTheDocument();
    expect(ctx.updateProfile).not.toHaveBeenCalled();
  });

  it('a saved profile sends the edited fields, closes and reports success', async () => {
    const { user, ctx } = renderWithProviders(<ProfileTab />, { context: { currentUser: me } });
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit profile' });
    await user.clear(within(dialog).getByLabelText('Display name'));
    await user.type(within(dialog).getByLabelText('Display name'), 'Ana');
    await user.click(within(dialog).getByRole('button', { name: 'Save profile' }));
    await waitFor(() =>
      expect(ctx.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana', username: 'testuser', bio: 'I build interfaces.' })),
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit profile' })).not.toBeInTheDocument());
    expect(ctx.showToast).toHaveBeenCalledWith('Profile saved.', 'success');
  });

  it('a refused save shows the server message and keeps the dialog open', async () => {
    const updateProfile = vi.fn(async () => {
      throw new Error('The server refused the change');
    });
    const { user, ctx } = renderWithProviders(<ProfileTab />, { context: { currentUser: me, updateProfile } });
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit profile' });
    await user.click(within(dialog).getByRole('button', { name: 'Save profile' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The server refused the change');
    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeInTheDocument();
    expect(ctx.showToast).not.toHaveBeenCalledWith('Profile saved.', 'success');
  });
});
