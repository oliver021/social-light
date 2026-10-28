import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import { renderWithProviders } from '../../test/render';
import { OverflowMenu } from './OverflowMenu';

describe('OverflowMenu', () => {
  it('opens from the keyboard, and selecting an item runs its handler', async () => {
    const onDelete = vi.fn();
    const { user } = renderWithProviders(
      <OverflowMenu
        label="More actions for this post"
        items={[{ id: 'delete', label: 'Delete post', icon: Trash2, danger: true, onSelect: onDelete }]}
      />,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'More actions for this post' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete post' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when every item is hidden', () => {
    renderWithProviders(
      <OverflowMenu label="More actions" items={[{ id: 'a', label: 'Hidden', hidden: true, onSelect: vi.fn() }]} />,
    );
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
  });

  it('leaves out the hidden items but keeps the visible ones', async () => {
    const { user } = renderWithProviders(
      <OverflowMenu
        label="More actions"
        items={[
          { id: 'a', label: 'Shown', onSelect: vi.fn() },
          { id: 'b', label: 'Not shown', hidden: true, onSelect: vi.fn() },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menuitem', { name: 'Shown' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Not shown' })).not.toBeInTheDocument();
  });
});
