import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { FeedsTab } from './FeedsTab';
import { makePost } from './post/fixtures';

describe('FeedsTab', () => {
  it('shows the post skeleton while the first load is pending', () => {
    renderWithProviders(<FeedsTab />, { context: { posts: [] } });
    expect(screen.getByLabelText('Loading post')).toBeInTheDocument();
    expect(screen.queryByText('Follow a few people to fill your feed')).toBeNull();
  });

  it('shows the empty state once settled and the feed has no posts', async () => {
    renderWithProviders(<FeedsTab />, { context: { posts: [] } });
    expect(
      await screen.findByText('Follow a few people to fill your feed', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find people to follow' })).toBeInTheDocument();
  });

  it('keeps the skeleton, not the empty state, while blocks and mutes are still loading', async () => {
    renderWithProviders(<FeedsTab />, { context: { posts: [], relationsLoading: true } });
    // Past the 1.5 s settle delay the feed would normally show its empty state.
    await new Promise((resolve) => setTimeout(resolve, 1700));
    expect(screen.getByLabelText('Loading post')).toBeInTheDocument();
    expect(screen.queryByText('Follow a few people to fill your feed')).toBeNull();
  });

  it('shows the "no posts yet" empty state when the viewer already follows someone', async () => {
    renderWithProviders(<FeedsTab />, {
      context: { posts: [], people: [{ userId: 'p1', name: 'Bo', handle: '@bo', avatar: '', bio: '', followed: true }] },
    });
    expect(await screen.findByText('No posts yet', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('pages the feed: three posts first, then Show more reveals the rest', async () => {
    const posts = [1, 2, 3, 4].map((n) => makePost({ id: `p${n}`, content: `Post number ${n}` }));
    const { user } = renderWithProviders(<FeedsTab />, { context: { posts } });
    expect(screen.getByText('Post number 3')).toBeInTheDocument();
    expect(screen.queryByText('Post number 4')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show more posts' }));
    expect(screen.getByText('Post number 4')).toBeInTheDocument();
    expect(screen.getByText('You are all caught up.')).toBeInTheDocument();
  });

  it('the Post button stays disabled until there is text, then sends the post', async () => {
    const createPostIn = vi.fn(async () => makePost());
    const { user } = renderWithProviders(<FeedsTab />, { context: { createPostIn } });
    const submit = screen.getByRole('button', { name: /^Post$/ });
    expect(submit).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Post text' }), 'Hello world');
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    expect(createPostIn).toHaveBeenCalledWith({ kind: 'home' }, 'Hello world', 'text', {});
  });
});
