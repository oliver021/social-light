import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { ResponsiveDialog } from './ResponsiveDialog';

describe('ResponsiveDialog', () => {
  it('shows the title as the dialog name and a Close button that calls onClose', async () => {
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <ResponsiveDialog open title="New post" onClose={onClose}>
        <p>Form goes here</p>
      </ResponsiveDialog>,
    );
    expect(screen.getByRole('dialog', { name: 'New post' })).toBeInTheDocument();
    expect(screen.getByText('Form goes here')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
