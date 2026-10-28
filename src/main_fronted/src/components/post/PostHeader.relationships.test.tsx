import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostHeader } from './PostHeader';
import type { Post } from '../../types';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';

const anaPost: Post = {
  id: 'post-ana',
  type: 'text',
  authorId: ANA,
  author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
  content: 'Sunset from the pier',
  createdAt: '5m ago',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  sharesCount: 0,
  currentUserReaction: null,
};

const openMenu = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
};

describe('PostHeader: actions on someone else\'s post', () => {
  it('offers Hide, Snooze, Mute and Block, named after the author, and no Delete', async () => {
    const { user } = renderWithProviders(<PostHeader post={anaPost} />);
    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: 'Hide post' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Snooze Ana Ruiz for 30 days' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Mute Ana Ruiz' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete post' })).not.toBeInTheDocument();
  });

  it('Hide post calls hidePost with the post id', async () => {
    const { user, ctx } = renderWithProviders(<PostHeader post={anaPost} />);
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Hide post' }));
    expect(ctx.hidePost).toHaveBeenCalledWith('post-ana');
  });

  it('Snooze and Mute call the person operations and confirm success', async () => {
    const { user, ctx } = renderWithProviders(<PostHeader post={anaPost} />);
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Snooze Ana Ruiz for 30 days' }));
    await waitFor(() => expect(ctx.snoozeUser).toHaveBeenCalledWith(ANA));
    await waitFor(() => expect(ctx.showToast).toHaveBeenCalledWith('Snoozed Ana Ruiz for 30 days', 'success'));

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Mute Ana Ruiz' }));
    await waitFor(() => expect(ctx.muteUser).toHaveBeenCalledWith(ANA));
  });

  it('a muted author gets Unmute instead of Snooze and Mute, and Unmute removes that preference', async () => {
    const { user, ctx } = renderWithProviders(<PostHeader post={anaPost} />, {
      context: {
        mutedUsers: [{ userId: ANA, preferenceId: 'pref-ana', preferenceType: 'mute', expiresAt: null }],
      },
    });
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'Mute Ana Ruiz' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Snooze Ana Ruiz for 30 days' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Unmute Ana Ruiz' }));
    await waitFor(() => expect(ctx.removePreference).toHaveBeenCalledWith('pref-ana'));
  });

  it('Block asks first, Cancel does nothing, and Block calls blockUser', async () => {
    const { user, ctx } = renderWithProviders(<PostHeader post={anaPost} />);
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' }));

    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Block Ana Ruiz?' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("They won't be told.");
    expect(dialog).not.toHaveTextContent("can't see you");
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(ctx.blockUser).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' }));
    dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Block' }));
    expect(ctx.blockUser).toHaveBeenCalledWith(ANA);
  });
});

describe('PostHeader: my own post', () => {
  it('has only Delete, none of the actions on other people\'s posts', async () => {
    const { user } = renderWithProviders(<PostHeader post={{ ...anaPost, authorId: ME, author: { name: 'Test User', handle: '@testuser', avatar: '' } }} />);
    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: 'Delete post' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Hide post' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Snooze|Mute|Unmute|Block/ })).not.toBeInTheDocument();
  });
});

describe('PostHeader: shared copy', () => {
  it('a read-only copy has no menu at all', () => {
    renderWithProviders(<PostHeader post={anaPost} readOnly />);
    expect(screen.queryByRole('button', { name: 'More actions for this post' })).not.toBeInTheDocument();
  });
});
