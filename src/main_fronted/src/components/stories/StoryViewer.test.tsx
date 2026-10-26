import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { StoryViewer } from './StoryViewer';
import type { StoryGroup } from '../../context/useStories';

const LATER = new Date(Date.now() + 3600_000).toISOString();
const ME = 'me-0000-0000-0000-000000000001';

const theirs = (): StoryGroup => ({
  authorId: 'author-2',
  authorName: 'Ana Ruiz',
  authorAvatar: '',
  stories: [
    { id: 's-1', authorId: 'author-2', authorName: 'Ana Ruiz', authorAvatar: '', mediaType: 'image', mediaUrl: '/blobs/1.png', caption: 'first', expiresAt: LATER },
    { id: 's-2', authorId: 'author-2', authorName: 'Ana Ruiz', authorAvatar: '', mediaType: 'image', mediaUrl: '/blobs/2.png', caption: 'second', expiresAt: LATER },
  ],
});

const mine = (): StoryGroup => ({
  authorId: ME,
  authorName: 'Test User',
  authorAvatar: '',
  stories: [
    { id: 'm-1', authorId: ME, authorName: 'Test User', authorAvatar: '', mediaType: 'image', mediaUrl: '/blobs/m.png', caption: 'mine', expiresAt: LATER },
  ],
});

describe('StoryViewer navigation', () => {
  it('ArrowRight moves to the next story of the author', async () => {
    const { user } = renderWithProviders(<StoryViewer group={theirs()} open onClose={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'first' })).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(await screen.findByRole('img', { name: 'second' })).toBeInTheDocument();
    expect(screen.getByText('Story 2 of 2')).toBeInTheDocument();
  });

  it('ArrowLeft goes back, and the first story stays put', async () => {
    const { user } = renderWithProviders(<StoryViewer group={theirs()} open onClose={vi.fn()} />);
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('img', { name: 'first' })).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowLeft}');
    expect(await screen.findByRole('img', { name: 'first' })).toBeInTheDocument();
  });

  it('Escape closes the viewer', async () => {
    const onClose = vi.fn();
    const { user } = renderWithProviders(<StoryViewer group={theirs()} open onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('Next on the last story closes the viewer', async () => {
    const onClose = vi.fn();
    const { user } = renderWithProviders(<StoryViewer group={theirs()} open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Next story' }));
    await user.click(screen.getByRole('button', { name: 'Next story' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('records a view for the story shown', () => {
    const viewStory = vi.fn();
    renderWithProviders(<StoryViewer group={theirs()} open onClose={vi.fn()} />, { context: { viewStory } });
    expect(viewStory).toHaveBeenCalledWith('s-1');
  });
});

describe('StoryViewer replies', () => {
  it('sends a reply on Enter and shows "Sent"', async () => {
    const replyToStory = vi.fn(async () => {});
    const { user } = renderWithProviders(<StoryViewer group={theirs()} open onClose={vi.fn()} />, { context: { replyToStory } });
    const box = screen.getByRole('textbox', { name: 'Reply to Ana Ruiz…' });
    await user.type(box, 'Lovely{Enter}');
    await waitFor(() => expect(replyToStory).toHaveBeenCalledWith('s-1', 'Lovely'));
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    expect(box).toHaveValue('');
  });

  it('a refused reply keeps the text and shows the reason', async () => {
    const replyToStory = vi.fn(async () => {
      throw new Error('Your reply was not sent: Replies are closed');
    });
    const { user } = renderWithProviders(<StoryViewer group={theirs()} open onClose={vi.fn()} />, { context: { replyToStory } });
    const box = screen.getByRole('textbox', { name: 'Reply to Ana Ruiz…' });
    await user.type(box, 'Hi{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Your reply was not sent: Replies are closed');
    expect(box).toHaveValue('Hi');
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
  });

  it('shows the Replies button only on my own story', () => {
    const { unmount } = renderWithProviders(<StoryViewer group={theirs()} open onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^Replies/ })).not.toBeInTheDocument();
    unmount();
    renderWithProviders(<StoryViewer group={mine()} open onClose={vi.fn()} />, { context: { loadReplies: vi.fn(async () => []) } });
    expect(screen.getByRole('button', { name: 'Replies (0)' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Reply to/ })).not.toBeInTheDocument();
  });

  it('opens the list of replies to my story', async () => {
    const loadReplies = vi.fn(async () => [
      { id: 'r-1', body: 'Great shot', authorId: 'ana', authorName: 'Ana Ruiz', authorAvatar: '', handle: '@ana' },
    ]);
    const { user } = renderWithProviders(<StoryViewer group={mine()} open onClose={vi.fn()} />, { context: { loadReplies } });
    await user.click(await screen.findByRole('button', { name: 'Replies (1)' }));
    expect(screen.getByText('Great shot')).toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
  });

  it('shows the reason in an alert when the replies cannot be loaded', async () => {
    const loadReplies = vi.fn(async () => {
      throw new Error('Replies could not be loaded: the server failed (HTTP 500). Try again in a moment.');
    });
    const { user } = renderWithProviders(<StoryViewer group={mine()} open onClose={vi.fn()} />, { context: { loadReplies } });
    await waitFor(() => expect(loadReplies).toHaveBeenCalledWith('m-1'));
    await user.click(screen.getByRole('button', { name: 'Replies (0)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Replies could not be loaded');
    expect(screen.queryByText('No replies yet.')).not.toBeInTheDocument();
  });
});
