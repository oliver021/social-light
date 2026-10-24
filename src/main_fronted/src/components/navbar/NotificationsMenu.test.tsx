import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { NotificationsMenu } from './NotificationsMenu';
import type { NotificationItem } from '../../types';

const unread: NotificationItem = {
  id: 'n-1',
  type: 'like',
  actor: { name: 'Ben', avatar: '' },
  text: 'liked your post',
  createdAt: '2m ago',
  read: false,
};

describe('NotificationsMenu', () => {
  it('names the bell with the unread count', () => {
    renderWithProviders(<NotificationsMenu />, { context: { notifications: [unread] } });
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });

  it('shows an empty state when there is nothing to show', async () => {
    const { user } = renderWithProviders(<NotificationsMenu />, { context: { notifications: [] } });
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('heading', { name: 'No notifications yet' })).toBeInTheDocument();
  });

  it('opening the list marks notifications read and lists them', async () => {
    const markNotificationsAsRead = vi.fn();
    const { user } = renderWithProviders(<NotificationsMenu />, {
      context: { notifications: [unread], markNotificationsAsRead },
    });
    await user.click(screen.getByRole('button', { name: /^Notifications/ }));
    expect(markNotificationsAsRead).toHaveBeenCalledTimes(1);
    expect(screen.getByText('liked your post')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No notifications yet' })).not.toBeInTheDocument();
  });
});

describe('NotificationsMenu loading state', () => {
  it('shows a skeleton, not the empty state, while the first load is pending', async () => {
    const { user } = renderWithProviders(<NotificationsMenu />, { context: { notifications: [], notificationsLoading: true } });
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No notifications yet' })).not.toBeInTheDocument();
  });

  it('shows the empty state once the load has settled', async () => {
    const { user } = renderWithProviders(<NotificationsMenu />, { context: { notifications: [], notificationsLoading: false } });
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No notifications yet' })).toBeInTheDocument();
  });
});
