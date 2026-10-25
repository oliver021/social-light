import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { ReelsTab } from './ReelsTab';
import type { Reel } from '../context/useReels';

const ME = 'me-0000-0000-0000-000000000001';
const reels: Reel[] = [
  { id: 'r-1', creatorId: ME, creatorName: 'Test User', creatorAvatar: '', videoUrl: '/blobs/v.mp4', caption: 'my clip', duration: 4 },
  { id: 'r-2', creatorId: 'other-user', creatorName: 'Ana Ruiz', creatorAvatar: '', videoUrl: '/blobs/w.mp4', caption: 'their clip', duration: 6 },
];

describe('ReelsTab ownership', () => {
  it('shows the menu on my reel only', () => {
    renderWithProviders(<ReelsTab />, { context: { reels } });
    expect(screen.getAllByRole('button', { name: 'More actions for your reel' })).toHaveLength(1);
  });

  it('Delete reel asks first, then calls deleteReel with the reel id', async () => {
    const deleteReel = vi.fn(async () => {});
    const { user } = renderWithProviders(<ReelsTab />, { context: { reels, deleteReel } });
    await user.click(screen.getByRole('button', { name: 'More actions for your reel' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete reel' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteReel).toHaveBeenCalledWith('r-1'));
  });
});
