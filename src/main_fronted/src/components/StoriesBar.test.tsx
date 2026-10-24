import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { StoriesBar } from './StoriesBar';
import type { Story } from '../context/useStories';

const story: Story = {
  id: 's1',
  authorId: 'author-2',
  authorName: 'Ana Ruiz',
  authorAvatar: '',
  mediaType: 'image',
  mediaUrl: '/blobs/s1.png',
  caption: '',
};

describe('StoriesBar', () => {
  it('shows skeleton circles while the stories are loading', () => {
    const { container } = renderWithProviders(<StoriesBar />, { context: { stories: [] } });
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
    expect(screen.queryByText('No stories yet')).toBeNull();
  });

  it('shows the empty state once settled with no stories', async () => {
    renderWithProviders(<StoriesBar />, { context: { stories: [] } });
    expect(await screen.findByText('No stories yet', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('opens the new-story dialog from Add story; Share stays disabled until media is uploaded', async () => {
    const { user, ctx } = renderWithProviders(<StoriesBar />, { context: { stories: [story] } });
    await user.click(screen.getByRole('button', { name: 'Add story' }));
    const dialog = screen.getByRole('dialog', { name: 'New story' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled();
    expect(ctx.addStory).not.toHaveBeenCalled();
  });

  it('closing the new-story dialog with Close dismisses it without adding a story', async () => {
    const addStory = vi.fn();
    const { user } = renderWithProviders(<StoriesBar />, { context: { stories: [story], addStory } });
    await user.click(screen.getByRole('button', { name: 'Add story' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New story' })).toBeNull());
    expect(addStory).not.toHaveBeenCalled();
  });

  it('opening a story marks it viewed and shows its image with a real alt text', async () => {
    const viewStory = vi.fn();
    const { user } = renderWithProviders(<StoriesBar />, { context: { stories: [story], viewStory } });
    await user.click(screen.getByRole('button', { name: 'Open story from Ana Ruiz' }));
    expect(viewStory).toHaveBeenCalledWith('s1');
    const viewer = screen.getByRole('dialog', { name: 'Story' });
    expect(viewer.querySelector('img')).toHaveAttribute('alt', 'Story by Ana Ruiz');
  });
});
