import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { PostCard } from './PostCard';
import type { Post } from '../types';

// Characterisation test: pins the post's visible behaviour so the split into
// components/post/* (M0.3 section 4) can be checked against the same assertions.
const post: Post = {
  id: 'post-1',
  type: 'text',
  authorId: 'author-2',
  author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
  content: 'Hello from the feed',
  createdAt: '5m ago',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  sharesCount: 2,
  currentUserReaction: null,
};

describe('PostCard', () => {
  it('renders the author, the content and the reaction, comment and share buttons', () => {
    renderWithProviders(<PostCard post={post} />);
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Hello from the feed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('Share opens the share dialog, and sharing from it calls sharePost with the post id', async () => {
    const { user, ctx } = renderWithProviders(<PostCard post={post} />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    const dialog = screen.getByRole('dialog', { name: 'Share post' });
    await user.click(within(dialog).getByRole('button', { name: 'Share' }));
    expect(ctx.sharePost).toHaveBeenCalledWith('post-1', '');
  });

  it('typing a comment and pressing the send button calls addComment(postId, text)', async () => {
    const addComment = vi.fn(async () => {});
    const { user } = renderWithProviders(<PostCard post={post} />, {
      context: { addComment },
    });
    await user.click(screen.getByRole('button', { name: 'Comment' }));
    await user.type(screen.getByRole('textbox', { name: 'Write a comment' }), '  Nice post  ');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(addComment).toHaveBeenCalledWith('post-1', 'Nice post');
    expect(screen.getByRole('textbox', { name: 'Write a comment' })).toHaveValue('');
  });

  it('keeps the typed comment when addComment rejects and shows the error', async () => {
    const showToast = vi.fn();
    const addComment = vi.fn(async () => {
      throw new Error('Server said no');
    });
    const { user } = renderWithProviders(<PostCard post={post} />, {
      context: { addComment, showToast },
    });
    await user.click(screen.getByRole('button', { name: 'Comment' }));
    await user.type(screen.getByRole('textbox', { name: 'Write a comment' }), 'Keep me');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(showToast).toHaveBeenCalledWith('Server said no');
    expect(screen.getByRole('textbox', { name: 'Write a comment' })).toHaveValue('Keep me');
  });
});
