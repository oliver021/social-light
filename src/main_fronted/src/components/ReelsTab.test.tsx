import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { ReelsTab } from './ReelsTab';
import type { Reel } from '../context/useReels';

const reel: Reel = {
  id: 'reel-1',
  creatorId: 'ana-1',
  creatorName: 'Ana Ruiz',
  creatorAvatar: '',
  videoUrl: '/blobs/sunset.mp4',
  caption: 'Sunset over the bay',
  duration: 12,
};

describe('ReelsTab', () => {
  it('shows the page title as the h1 and the new reel action', () => {
    renderWithProviders(<ReelsTab />, { context: { reels: [reel] } });
    expect(screen.getByRole('heading', { level: 1, name: 'Reels' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New reel' })).toBeInTheDocument();
  });

  it('shows the empty state and opens the upload dialog from its action', async () => {
    const { user } = renderWithProviders(<ReelsTab />, { context: { reels: [] } });
    expect(screen.getByRole('heading', { name: 'No reels yet' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'New reel' })[0]);
    expect(screen.getByRole('dialog', { name: 'New reel' })).toBeInTheDocument();
  });

  it('renders a reel with its creator, caption and the mute and play controls', () => {
    renderWithProviders(<ReelsTab />, { context: { reels: [reel] } });
    expect(screen.getByLabelText('Reel by Ana Ruiz: Sunset over the bay')).toBeInTheDocument();
    expect(screen.getByText('Sunset over the bay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unmute reel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play reel' })).toBeInTheDocument();
  });

  it('keeps Publish disabled until a video is chosen', async () => {
    const addReel = vi.fn(async () => {});
    const { user } = renderWithProviders(<ReelsTab />, { context: { reels: [], addReel } });
    await user.click(screen.getAllByRole('button', { name: 'New reel' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'New reel' });
    expect(within(dialog).getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(addReel).not.toHaveBeenCalled();
  });

  it('closes the dialog on Cancel without publishing', async () => {
    const addReel = vi.fn(async () => {});
    const { user } = renderWithProviders(<ReelsTab />, { context: { reels: [], addReel } });
    await user.click(screen.getAllByRole('button', { name: 'New reel' })[0]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New reel' })).not.toBeInTheDocument());
    expect(addReel).not.toHaveBeenCalled();
  });
});

describe('ReelsTab loading state', () => {
  it('shows a reel-shaped skeleton while the first reels load is pending', () => {
    renderWithProviders(<ReelsTab />, { context: { reels: [], reelsLoading: true } });
    expect(screen.getByTestId('skeleton-reels')).toBeInTheDocument();
    expect(screen.queryByText('No reels yet')).not.toBeInTheDocument();
  });

  it('shows the empty state once the load has settled with no reels', () => {
    renderWithProviders(<ReelsTab />, { context: { reels: [], reelsLoading: false } });
    expect(screen.queryByTestId('skeleton-reels')).not.toBeInTheDocument();
    expect(screen.getByText('No reels yet')).toBeInTheDocument();
  });
});
