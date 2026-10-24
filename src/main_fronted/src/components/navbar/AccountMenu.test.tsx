import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('opens a menu with the signed-in name and Log out', async () => {
    const { user } = renderWithProviders(<AccountMenu />);
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /My profile/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Log out/ })).toBeInTheDocument();
  });

  it('My profile opens the profile tab', async () => {
    const setActiveTab = vi.fn();
    const { user } = renderWithProviders(<AccountMenu />, { context: { setActiveTab } });
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('menuitem', { name: /My profile/ }));
    expect(setActiveTab).toHaveBeenCalledWith('profile');
  });

  it('renders nothing when signed out', () => {
    const { container } = renderWithProviders(<AccountMenu />, { context: { isAuthenticated: false } });
    expect(container).toBeEmptyDOMElement();
  });
});
