import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { CommentThread } from './CommentThread';
import type { Comment, Post } from '../../types';

const ME = 'me-0000-0000-0000-000000000001';
const comment = (id: string, name: string, parentCommentId: string | null, extra: Partial<Comment> = {}): Comment => ({
  id,
  authorId: `user-${id}`,
  author: { name, handle: `@${name.toLowerCase()}`, avatar: '' },
  content: `text ${id}`,
  createdAt: 'now',
  parentCommentId,
  likes: 0,
  likedByMe: false,
  ...extra,
});

const basePost = (comments: Comment[]): Post => ({
  id: 'post-1',
  type: 'text',
  authorId: 'author-2',
  author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
  content: 'Hello',
  createdAt: '5m ago',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments,
  sharesCount: 0,
  currentUserReaction: null,
});

describe('CommentThread replies', () => {
  it('shows replies under their parent and folds after two, with a View more button', async () => {
    const post = basePost([
      comment('top', 'Ben', null),
      comment('r1', 'Cy', 'top'),
      comment('r2', 'Di', 'top'),
      comment('r3', 'Ed', 'top'),
    ]);
    const { user } = renderWithProviders(<CommentThread post={post} open />);
    expect(screen.getByText('text r1')).toBeInTheDocument();
    expect(screen.getByText('text r2')).toBeInTheDocument();
    expect(screen.queryByText('text r3')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'View 1 more reply' }));
    expect(screen.getByText('text r3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more repl/ })).toBeNull();
  });

  it('Reply opens an input under the comment; Enter sends it to that comment', async () => {
    const addComment = vi.fn(async () => {});
    const post = basePost([comment('c-2', 'Ben', null)]);
    const { user } = renderWithProviders(<CommentThread post={post} open />, { context: { addComment } });

    await user.click(screen.getByRole('button', { name: 'Reply to Ben' }));
    const field = screen.getByRole('textbox', { name: 'Write a reply to Ben' });
    await user.type(field, '  Agreed  {Enter}');

    expect(addComment).toHaveBeenCalledWith('post-1', 'Agreed', 'c-2');
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Write a reply to Ben' })).toBeNull());
  });

  it('Escape cancels the reply without sending it', async () => {
    const addComment = vi.fn(async () => {});
    const post = basePost([comment('c-2', 'Ben', null)]);
    const { user } = renderWithProviders(<CommentThread post={post} open />, { context: { addComment } });

    await user.click(screen.getByRole('button', { name: 'Reply to Ben' }));
    await user.type(screen.getByRole('textbox', { name: 'Write a reply to Ben' }), 'never sent{Escape}');

    expect(addComment).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Write a reply to Ben' })).toBeNull();
  });

  it('keeps the reply text and its field when the server refuses it', async () => {
    const showToast = vi.fn();
    const addComment = vi.fn(async () => {
      throw new Error('Server said no');
    });
    const post = basePost([comment('c-2', 'Ben', null)]);
    const { user } = renderWithProviders(<CommentThread post={post} open />, { context: { addComment, showToast } });

    await user.click(screen.getByRole('button', { name: 'Reply to Ben' }));
    await user.type(screen.getByRole('textbox', { name: 'Write a reply to Ben' }), 'Keep me{Enter}');

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Server said no'));
    expect(screen.getByRole('textbox', { name: 'Write a reply to Ben' })).toHaveValue('Keep me');
  });

  it('a reply to a reply shows the @name of the comment it answers', () => {
    const post = basePost([comment('top', 'Ben', null), comment('r1', 'Cy', 'top'), comment('r2', 'Di', 'r1')]);
    renderWithProviders(<CommentThread post={post} open />);
    const reply = screen.getByText('text r2').closest('p');
    expect(within(reply as HTMLElement).getByText('@Cy')).toBeInTheDocument();
  });

  it('a deleted parent shows "Comment deleted" and its replies stay visible', () => {
    const post = basePost([
      comment('gone', 'Ben', null, { deleted: true, authorId: undefined, content: '' }),
      comment('r1', 'Cy', 'gone'),
    ]);
    renderWithProviders(<CommentThread post={post} open />);
    expect(screen.getByText('Comment deleted')).toBeInTheDocument();
    expect(screen.getByText('text r1')).toBeInTheDocument();
  });
});

describe('CommentThread comment likes', () => {
  it('Like calls toggleCommentLike with the post and comment ids, and shows pressed state and count', async () => {
    const toggleCommentLike = vi.fn(async () => {});
    const post = basePost([comment('c-2', 'Ben', null, { likes: 2, likedByMe: true, authorId: 'user-c-2' })]);
    const { user } = renderWithProviders(<CommentThread post={post} open />, { context: { toggleCommentLike } });

    const like = screen.getByRole('button', { name: 'Like comment by Ben' });
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveTextContent('Like · 2');
    await user.click(like);
    expect(toggleCommentLike).toHaveBeenCalledWith('post-1', 'c-2');
  });

  it('a deleted placeholder offers no Like or Reply', () => {
    const post = basePost([comment('gone', 'Ben', null, { deleted: true, authorId: undefined, content: '' })]);
    renderWithProviders(<CommentThread post={post} open />);
    expect(screen.queryByRole('button', { name: 'Like comment by Ben' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reply to Ben' })).toBeNull();
  });

  it('shows the owner menu only on my own reply', () => {
    const post = basePost([comment('mine', 'Test User', null, { authorId: ME }), comment('theirs', 'Ben', 'mine')]);
    renderWithProviders(<CommentThread post={post} open />);
    expect(screen.getAllByRole('button', { name: /^More actions for your comment/ })).toHaveLength(1);
  });
});
