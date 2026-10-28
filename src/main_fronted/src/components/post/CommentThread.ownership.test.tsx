import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { CommentThread } from './CommentThread';
import type { Post } from '../../types';

const ME = 'me-0000-0000-0000-000000000001';
const post: Post = {
  id: 'post-1',
  type: 'text',
  authorId: 'author-2',
  author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
  content: 'Hello',
  createdAt: '5m ago',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [
    { id: 'c-1', authorId: ME, author: { name: 'Test User', handle: '@testuser', avatar: '' }, content: 'my comment', createdAt: 'now', parentCommentId: null },
    { id: 'c-2', authorId: 'other-user', author: { name: 'Ben', handle: '@ben', avatar: '' }, content: 'their comment', createdAt: 'now', parentCommentId: null },
  ],
  sharesCount: 0,
  currentUserReaction: null,
};

describe('CommentThread ownership', () => {
  it('gives the menu only to my own comment', () => {
    renderWithProviders(<CommentThread post={post} open />);
    const menus = screen.getAllByRole('button', { name: /^More actions for your comment/ });
    expect(menus).toHaveLength(1);
    expect(menus[0]).toHaveAccessibleName(/my comment/);
  });

  it('Delete comment asks first, then calls deleteComment with the post and comment id', async () => {
    const deleteComment = vi.fn(async () => {});
    const { user } = renderWithProviders(<CommentThread post={post} open />, { context: { deleteComment } });
    await user.click(screen.getByRole('button', { name: /^More actions for your comment/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete comment' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Delete this comment?' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteComment).toHaveBeenCalledWith('post-1', 'c-1'));
  });
});
