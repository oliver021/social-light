import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { UserAvatar, initialsOf } from './UserAvatar';

describe('UserAvatar', () => {
  it('falls back to initials when there is no image', () => {
    renderWithProviders(<UserAvatar name="Ana Ruiz" />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('gives the image an alt text equal to the name', () => {
    renderWithProviders(<UserAvatar name="Ana Ruiz" src="https://cdn.example.test/ana.png" />);
    expect(screen.getByRole('img', { name: 'Ana Ruiz' })).toBeInTheDocument();
  });

  it('shows a stored /bff avatar url once, not prefixed twice', () => {
    renderWithProviders(<UserAvatar name="Ana Ruiz" src="/bff/blobs/a.png" />);
    const img = screen.getByRole('img', { name: 'Ana Ruiz' });
    expect(img.getAttribute('src')).toBe('/bff/blobs/a.png');
  });

  it('with onClick it is a button named "Open {name}\'s profile"', async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(<UserAvatar name="Ana Ruiz" onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: "Open Ana Ruiz's profile" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('without onClick it is not a button', () => {
    renderWithProviders(<UserAvatar name="Ana Ruiz" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('initialsOf takes up to two letters and copes with blanks', () => {
    expect(initialsOf('  grace   brewster hopper ')).toBe('GB');
    expect(initialsOf('')).toBe('?');
  });
});
