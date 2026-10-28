import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { AsyncButton } from './AsyncButton';

describe('AsyncButton', () => {
  it('clicks while the first is pending do not call the handler again', async () => {
    let finish!: () => void;
    const onClick = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderWithProviders(<AsyncButton onClick={onClick}>Save</AsyncButton>);
    const button = screen.getByRole('button', { name: 'Save' });

    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    finish();
    await vi.waitFor(() => expect(button).toBeEnabled());
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('re-enables after the action fails, so the user can try again', async () => {
    // The caller shows its own error (as the app does); the button must still reset.
    const onClick = vi.fn(async () => {
      try {
        throw new Error('boom');
      } catch {
        /* the caller reports the failure */
      }
    });
    renderWithProviders(<AsyncButton onClick={onClick}>Save</AsyncButton>);
    const button = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(button);
    await vi.waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
