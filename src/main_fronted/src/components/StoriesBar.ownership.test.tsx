import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { StoriesBar } from './StoriesBar';
import type { Story } from '../context/AppContext';

const ME = 'me-0000-0000-0000-000000000001';
const LATER = new Date(Date.now() + 3600_000).toISOString();
const stories: Story[] = [
  { id: 's-1', authorId: ME, authorName: 'Test User', authorAvatar: '', mediaType: 'image', mediaUrl: '/blobs/a.png', caption: 'mine', expiresAt: LATER },
  { id: 's-2', authorId: 'other-user', authorName: 'Ana Ruiz', authorAvatar: '', mediaType: 'image', mediaUrl: '/blobs/b.png', caption: 'theirs', expiresAt: LATER },
];

describe('StoriesBar ownership', () => {
  it('shows the delete control in my own story only', async () => {
    const { user } = renderWithProviders(<StoriesBar />, { context: { stories } });
    await user.click(screen.getByRole('button', { name: 'Open story from Ana Ruiz' }));
    expect(screen.queryByRole('button', { name: 'Delete your story' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close story' }));
    // The viewer's exit transition keeps the page aria-hidden for a moment.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open story from Test User' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Open story from Test User' }));
    expect(screen.getByRole('button', { name: 'Delete your story' })).toBeInTheDocument();
  });

  it('Delete your story asks first, then deletes and closes the viewer', async () => {
    const deleteStory = vi.fn(async () => {});
    const { user } = renderWithProviders(<StoriesBar />, { context: { stories, deleteStory } });
    await user.click(screen.getByRole('button', { name: 'Open story from Test User' }));
    await user.click(screen.getByRole('button', { name: 'Delete your story' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this story?' });
    expect(within(dialog).getByRole('heading', { name: 'Delete this story?' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteStory).toHaveBeenCalledWith('s-1'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Close story' })).not.toBeInTheDocument());
  });
});
