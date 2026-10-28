import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('confirm calls onConfirm and then closes', async () => {
    const onConfirm = vi.fn(async () => {});
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmDialog open title="Delete this post?" confirmLabel="Delete" destructive onConfirm={onConfirm} onClose={onClose} />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('a rejected onConfirm shows the message as an alert and keeps the dialog open', async () => {
    const onConfirm = vi.fn(async () => {
      throw new Error('The server refused the delete');
    });
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmDialog open title="Delete this post?" confirmLabel="Delete" destructive onConfirm={onConfirm} onClose={onClose} />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The server refused the delete');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Cancel calls onClose only and never onConfirm', async () => {
    const onConfirm = vi.fn(async () => {});
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmDialog open title="Delete this post?" confirmLabel="Delete" destructive onConfirm={onConfirm} onClose={onClose} />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('focuses Cancel by default when the action is destructive', () => {
    renderWithProviders(
      <ConfirmDialog open title="Delete this post?" confirmLabel="Delete" destructive onConfirm={vi.fn(async () => {})} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
