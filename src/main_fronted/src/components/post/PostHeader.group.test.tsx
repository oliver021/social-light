import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostHeader } from './PostHeader';
import type { Post } from '../../types';

const post: Post = {
  id: 'p-1',
  type: 'text',
  authorId: 'ana',
  author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
  content: 'Hi',
  createdAt: '2h',
  groupId: 'g1',
  groupName: 'Design Systems',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  sharesCount: 0,
};

describe('PostHeader community link', () => {
  it('shows the community after the author and opens it', async () => {
    const openGroup = vi.fn();
    const { user } = renderWithProviders(<PostHeader post={post} />, { context: { openGroup } });
    await user.click(screen.getByRole('button', { name: 'Open community Design Systems' }));
    expect(openGroup).toHaveBeenCalledWith('g1');
    expect(screen.getByText('› Design Systems')).toBeInTheDocument();
  });

  it('a post outside any community shows no community link', () => {
    renderWithProviders(<PostHeader post={{ ...post, groupId: undefined, groupName: undefined }} />);
    expect(screen.queryByRole('button', { name: /Open community/ })).not.toBeInTheDocument();
  });
});
