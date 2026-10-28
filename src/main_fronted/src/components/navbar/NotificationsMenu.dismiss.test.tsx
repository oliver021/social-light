import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { NotificationsMenu } from './NotificationsMenu';
import type { NotificationItem } from '../../types';

const notif = (id: string, name: string): NotificationItem => ({
  id,
  type: 'like',
  actor: { name, avatar: '' },
  text: 'liked your post',
  createdAt: '2m ago',
  read: true,
});

describe('NotificationsMenu dismiss', () => {
  it('names each dismiss button after the actor and dismisses that notification', async () => {
    const dismissNotification = vi.fn(async () => {});
    const { user } = renderWithProviders(<NotificationsMenu />, {
      context: { notifications: [notif('n-1', 'Ben'), notif('n-2', 'Ana')], dismissNotification },
    });
    await user.click(screen.getByRole('button', { name: /^Notifications/ }));
    await user.click(screen.getByRole('button', { name: 'Dismiss notification from Ben' }));
    expect(dismissNotification).toHaveBeenCalledWith('n-1');
  });

  it('Clear all dismisses everything listed', async () => {
    const clearNotifications = vi.fn(async () => {});
    const { user } = renderWithProviders(<NotificationsMenu />, {
      context: { notifications: [notif('n-1', 'Ben')], clearNotifications },
    });
    await user.click(screen.getByRole('button', { name: /^Notifications/ }));
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(clearNotifications).toHaveBeenCalledTimes(1);
  });

  it('shows no Clear all when the list is empty', async () => {
    const { user } = renderWithProviders(<NotificationsMenu />, { context: { notifications: [] } });
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });
});
