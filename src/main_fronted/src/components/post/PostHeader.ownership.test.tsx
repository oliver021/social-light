import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostHeader } from './PostHeader';
import type { Post } from '../../types';

const ME = 'me-0000-0000-0000-000000000001';
const basePost: Post = {
  id: 'post-1',
  type: 'text',
  authorId: ME,
  author: { name: 'Test User', handle: '@testuser', avatar: '' },
  content: 'smoke delete me',
  createdAt: '5m ago',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  sharesCount: 0,
  currentUserReaction: null,
};

describe('PostHeader ownership', () => {
  it('shows the more-actions menu to the author', () => {
    renderWithProviders(<PostHeader post={basePost} />);
    expect(screen.getByRole('button', { name: 'More actions for this post' })).toBeInTheDocument();
  });

  it('does not offer Delete on someone else\'s post (the menu holds Hide, Snooze, Mute and Block there)', async () => {
    const { user } = renderWithProviders(<PostHeader post={{ ...basePost, authorId: 'other-user' }} />);
    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    expect(screen.queryByRole('menuitem', { name: 'Delete post' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hide post' })).toBeInTheDocument();
  });

  it('does not show it when the post has no owner id', () => {
    renderWithProviders(<PostHeader post={{ ...basePost, authorId: undefined }} />);
    expect(screen.queryByRole('button', { name: 'More actions for this post' })).not.toBeInTheDocument();
  });

  it('Delete post asks first, and Cancel does nothing', async () => {
    const deletePost = vi.fn(async () => {});
    const { user } = renderWithProviders(<PostHeader post={basePost} />, { context: { deletePost } });
    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete post' }));
    expect(screen.getByRole('heading', { name: 'Delete this post?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deletePost).not.toHaveBeenCalled();
  });

  it('confirming calls deletePost with the post id and reports success', async () => {
    const deletePost = vi.fn(async () => {});
    const showToast = vi.fn();
    const { user } = renderWithProviders(<PostHeader post={basePost} />, { context: { deletePost, showToast } });
    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete post' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deletePost).toHaveBeenCalledWith('post-1'));
    expect(showToast).toHaveBeenCalledWith('Post deleted', 'success');
  });

  it('a failed delete keeps the dialog open with the server message', async () => {
    const deletePost = vi.fn(async () => {
      throw new Error('The post was not deleted: nope');
    });
    const { user } = renderWithProviders(<PostHeader post={basePost} />, { context: { deletePost } });
    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete post' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await within(dialog).findByText('The post was not deleted: nope')).toBeInTheDocument();
  });
});
