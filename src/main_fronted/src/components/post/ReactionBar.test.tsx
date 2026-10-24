import { describe, it, expect, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { ReactionBar } from './ReactionBar';
import { makePost } from './fixtures';

describe('ReactionBar', () => {
  it('the comment toggle reports its state with aria-expanded and calls onToggleComments', async () => {
    const onToggleComments = vi.fn();
    const { user } = renderWithProviders(
      <ReactionBar post={makePost()} commentOpen={false} onToggleComments={onToggleComments} />,
    );
    expect(screen.getByRole('button', { name: 'Comment' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Comment' }));
    expect(onToggleComments).toHaveBeenCalledTimes(1);
  });

  it('focusing the React button opens the picker, and choosing a reaction sends it', async () => {
    const { user, ctx } = renderWithProviders(
      <ReactionBar post={makePost({ id: 'post-9' })} commentOpen={false} onToggleComments={() => {}} />,
    );
    act(() => screen.getByRole('button', { name: 'React' }).focus());
    await user.click(await screen.findByRole('button', { name: 'Love' }));
    expect(ctx.reactToPost).toHaveBeenCalledWith('post-9', 'love');
  });

  it('shows the reaction the viewer chose instead of React', () => {
    renderWithProviders(
      <ReactionBar post={makePost({ currentUserReaction: 'love' })} commentOpen={false} onToggleComments={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Love' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
  });

  it('Share calls sharePost with the post id', async () => {
    const { user, ctx } = renderWithProviders(
      <ReactionBar post={makePost({ id: 'post-3' })} commentOpen={false} onToggleComments={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(ctx.sharePost).toHaveBeenCalledWith('post-3');
  });
});
