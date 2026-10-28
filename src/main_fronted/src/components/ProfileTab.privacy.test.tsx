import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { ProfileTab } from './ProfileTab';

const me = {
  id: 'me-0000-0000-0000-000000000001',
  username: 'testuser',
  name: 'Test User',
  handle: '@testuser',
  avatar: '',
  bio: '',
  coverPhoto: '',
  followersCount: 0,
  followingCount: 0,
  interests: [] as string[],
};

describe('ProfileTab: friends and privacy', () => {
  it('shows my own friend count', () => {
    renderWithProviders(<ProfileTab />, { context: { currentUser: me, friendCount: 3 } });
    expect(screen.getByText('3 friends')).toBeInTheDocument();
  });

  it('Privacy opens the blocked and muted lists', async () => {
    const { user } = renderWithProviders(<ProfileTab />, { context: { currentUser: me } });
    await user.click(screen.getByRole('button', { name: 'Privacy' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Privacy' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'No blocked people' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'No muted people' })).toBeInTheDocument();
  });
});
