import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { FriendButton } from './FriendButton';
import { BlockConfirm } from './BlockConfirm';
import { FriendRequestsCard } from './FriendRequests';
import { PrivacyDialog } from './PrivacyDialog';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';
const BO = 'bo-0000-0000-0000-000000000003';

describe('FriendButton (friendship state on a profile)', () => {
  it('none: "Add friend" sends a request to that person', async () => {
    const { user, ctx } = renderWithProviders(<FriendButton userId={ANA} name="Ana Ruiz" />, {
      context: { relationTo: vi.fn(() => 'none' as const) },
    });
    await user.click(screen.getByRole('button', { name: 'Add Ana Ruiz as a friend' }));
    expect(ctx.sendFriendRequest).toHaveBeenCalledWith(ANA);
  });

  it('requested: "Request sent" opens a menu whose Cancel request cancels it', async () => {
    const { user, ctx } = renderWithProviders(<FriendButton userId={ANA} name="Ana Ruiz" />, {
      context: { relationTo: vi.fn(() => 'requested' as const) },
    });
    await user.click(screen.getByRole('button', { name: 'Friend request to Ana Ruiz sent. Open the request menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Cancel request' }));
    expect(ctx.cancelFriendRequest).toHaveBeenCalledWith(ANA);
  });

  it('incoming: Accept and Decline call the matching operation', async () => {
    const { user, ctx } = renderWithProviders(<FriendButton userId={ANA} name="Ana Ruiz" />, {
      context: { relationTo: vi.fn(() => 'incoming' as const) },
    });
    await user.click(screen.getByRole('button', { name: 'Accept friend request from Ana Ruiz' }));
    expect(ctx.acceptFriend).toHaveBeenCalledWith(ANA);
    await user.click(screen.getByRole('button', { name: 'Decline friend request from Ana Ruiz' }));
    expect(ctx.declineFriend).toHaveBeenCalledWith(ANA);
  });

  it('friends: Unfriend asks first; Cancel does nothing, Confirm unfriends', async () => {
    const { user, ctx } = renderWithProviders(<FriendButton userId={ANA} name="Ana Ruiz" />, {
      context: { relationTo: vi.fn(() => 'friends' as const) },
    });
    await user.click(screen.getByRole('button', { name: 'Friends with Ana Ruiz. Open the friend menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Unfriend' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Unfriend Ana Ruiz?' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(ctx.unfriend).not.toHaveBeenCalled();

  });

  it('friends: Confirm on the Unfriend dialog calls unfriend with that person id', async () => {
    const { user, ctx } = renderWithProviders(<FriendButton userId={ANA} name="Ana Ruiz" />, {
      context: { relationTo: vi.fn(() => 'friends' as const) },
    });
    await user.click(screen.getByRole('button', { name: 'Friends with Ana Ruiz. Open the friend menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Unfriend' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Unfriend' }));
    expect(ctx.unfriend).toHaveBeenCalledWith(ANA);
  });
});

describe('BlockConfirm', () => {
  it('states what changes for me and never promises the person cannot see me', () => {
    renderWithProviders(<BlockConfirm open userId={ANA} name="Ana Ruiz" onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent("They won't be told.");
    expect(dialog).not.toHaveTextContent("can't see you");
  });

  it('Cancel does nothing; Block calls blockUser with that person id', async () => {
    const onClose = vi.fn();
    const { user, ctx } = renderWithProviders(<BlockConfirm open userId={ANA} name="Ana Ruiz" onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(ctx.blockUser).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    onClose.mockClear();
    const second = renderWithProviders(<BlockConfirm open userId={ANA} name="Ana Ruiz" onClose={onClose} />);
    await second.user.click(within(second.getByRole('dialog')).getByRole('button', { name: 'Block' }));
    expect(second.ctx.blockUser).toHaveBeenCalledWith(ANA);
  });
});

const request = (userId: string, name: string) => ({
  userId,
  requestId: `req-${userId}`,
  name,
  avatar: '',
  handle: '',
});

describe('FriendRequestsCard', () => {
  it('is not shown when nobody asked', () => {
    renderWithProviders(<FriendRequestsCard />, { context: { incomingRequests: [] } });
    expect(screen.queryByRole('region', { name: 'Friend requests' })).not.toBeInTheDocument();
  });

  it('Accept and Decline name the sender and call the operations', async () => {
    const { user, ctx } = renderWithProviders(<FriendRequestsCard />, {
      context: { incomingRequests: [request(ANA, 'Ana Ruiz')] },
    });
    expect(screen.getByRole('region', { name: 'Friend requests' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept friend request from Ana Ruiz' }));
    expect(ctx.acceptFriend).toHaveBeenCalledWith(ANA);
    await user.click(screen.getByRole('button', { name: 'Decline friend request from Ana Ruiz' }));
    expect(ctx.declineFriend).toHaveBeenCalledWith(ANA);
  });

  it('shows three rows and a See all dialog with every request', async () => {
    const many = [request('u1', 'One'), request('u2', 'Two'), request('u3', 'Three'), request('u4', 'Four')];
    const { user } = renderWithProviders(<FriendRequestsCard />, { context: { incomingRequests: many } });
    expect(screen.queryByRole('button', { name: 'Accept friend request from Four' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See all 4 friend requests' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Accept friend request from Four' })).toBeInTheDocument();
  });
});

describe('PrivacyDialog', () => {
  it('shows an empty state for each list when nothing is blocked or muted', () => {
    renderWithProviders(<PrivacyDialog open onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'No blocked people' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No muted people' })).toBeInTheDocument();
  });

  it('shows an empty state for hidden posts when none are hidden', () => {
    renderWithProviders(<PrivacyDialog open onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'No hidden posts' })).toBeInTheDocument();
  });

  it('Show again restores a hidden post through removePreference with its preference id', async () => {
    const { user, ctx } = renderWithProviders(<PrivacyDialog open onClose={() => {}} />, {
      context: { hiddenPosts: [{ postId: 'post-9', preferenceId: 'pref-hide-9' }] },
    });
    expect(screen.queryByRole('heading', { name: 'No hidden posts' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show hidden post 1 again' }));
    expect(ctx.removePreference).toHaveBeenCalledWith('pref-hide-9');
  });

  it('Unblock restores a blocked person through unblockUser', async () => {
    const { user, ctx } = renderWithProviders(<PrivacyDialog open onClose={() => {}} />, {
      context: {
        blockedUsers: [{ userId: ANA, blockId: 'blk-1' }],
        personView: vi.fn(() => ({ name: 'Ana Ruiz', avatar: '', handle: '@ana' })),
      },
    });
    await user.click(screen.getByRole('button', { name: 'Unblock Ana Ruiz' }));
    expect(ctx.unblockUser).toHaveBeenCalledWith(ANA);
  });

  it('a snooze shows its end date; Unmute removes the preference', async () => {
    const { user, ctx } = renderWithProviders(<PrivacyDialog open onClose={() => {}} />, {
      context: {
        mutedUsers: [{ userId: BO, preferenceId: 'pref-9', preferenceType: 'snooze', expiresAt: '2031-03-01T12:00:00Z' }],
        personView: vi.fn(() => ({ name: 'Bo Lin', avatar: '', handle: '@bo' })),
      },
    });
    expect(screen.getByText(/Snoozed until/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unmute Bo Lin' }));
    expect(ctx.removePreference).toHaveBeenCalledWith('pref-9');
  });
});
