import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { Navbar } from './Navbar';
import type { Person } from '../context/AppContext';
import type { NotificationItem } from '../types';

// Characterisation test: pins the navbar's behaviour before it is split into
// components/navbar/* (M0.3 section 4).
const ana: Person = {
  userId: 'user-ana',
  name: 'Ana Ruiz',
  handle: '@ana',
  avatar: '',
  bio: '',
  followed: false,
};

const notification: NotificationItem = {
  id: 'n-1',
  type: 'like',
  actor: { name: 'Ben', avatar: '' },
  text: 'liked your post',
  createdAt: '2m ago',
  read: false,
};

describe('Navbar', () => {
  it('typing in search shows the matching person', async () => {
    const { user } = renderWithProviders(<Navbar onToggleMobileDrawer={() => {}} />, {
      context: { people: [ana] },
    });
    await user.type(screen.getByRole('textbox', { name: 'Search people, posts and items' }), 'ana');
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('@ana')).toBeInTheDocument();
  });

  it('selecting a matching person opens their profile', async () => {
    const openProfile = vi.fn();
    const { user } = renderWithProviders(<Navbar onToggleMobileDrawer={() => {}} />, {
      context: { people: [ana], openProfile },
    });
    await user.type(screen.getByRole('textbox', { name: 'Search people, posts and items' }), 'ana');
    await user.click(screen.getByText('Ana Ruiz'));
    expect(openProfile).toHaveBeenCalledWith('user-ana');
  });

  it('the bell opens the notifications list and marks them read', async () => {
    const markNotificationsAsRead = vi.fn();
    const { user } = renderWithProviders(<Navbar onToggleMobileDrawer={() => {}} />, {
      context: { notifications: [notification], markNotificationsAsRead },
    });
    await user.click(screen.getByRole('button', { name: /^Notifications/ }));
    expect(markNotificationsAsRead).toHaveBeenCalled();
    expect(screen.getByText('liked your post')).toBeInTheDocument();
  });

  it('the account menu has Log out, which calls logout', async () => {
    const logout = vi.fn();
    const { user } = renderWithProviders(<Navbar onToggleMobileDrawer={() => {}} />, {
      context: { logout },
    });
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('menuitem', { name: /Log out/ }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
