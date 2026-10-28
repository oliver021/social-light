import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostHeader } from './PostHeader';
import type { Post } from '../../types';

const post: Post = {
  id: 'p1',
  type: 'text',
  authorId: 'ana-0000-0000-0000-000000000002',
  author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
  content: 'Hi',
  createdAt: 'now',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  sharesCount: 0,
};

describe('PostHeader author link', () => {
  it('clicking the author name opens that author\'s profile', async () => {
    const { user, ctx } = renderWithProviders(<PostHeader post={post} />);
    await user.click(screen.getByRole('button', { name: 'Ana Ruiz' }));
    expect(ctx.openProfile).toHaveBeenCalledWith('ana-0000-0000-0000-000000000002');
    expect(ctx.openChatWithUser).not.toHaveBeenCalled();
  });

  it('an anonymous author (no id) is not a link', () => {
    renderWithProviders(<PostHeader post={{ ...post, authorId: undefined }} />);
    expect(screen.queryByRole('button', { name: 'Ana Ruiz' })).not.toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
  });
});
