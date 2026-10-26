import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { AppShell } from './AppShell';
import { TABS, TAB_ID, tabDef } from './tabs';

describe('AppShell', () => {
  it('renders the main landmark with id "main" and a skip link to it', () => {
    renderWithProviders(<AppShell />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', '#main');
  });

  it('shows one sidebar item per TABS entry, with the registry label', () => {
    renderWithProviders(<AppShell />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const tab of TABS) {
      expect(within(nav).getByRole('button', { name: tab.label })).toBeInTheDocument();
    }
    expect(within(nav).getAllByRole('button')).toHaveLength(TABS.length);
  });

  it('shows one bottom navigation item per tab marked inBottomNav, with the short label', () => {
    renderWithProviders(<AppShell />);
    const bottom = screen.getByRole('navigation', { name: 'Mobile navigation' });
    const inBottom = TABS.filter((tab) => tab.inBottomNav);
    for (const tab of inBottom) {
      expect(within(bottom).getByRole('button', { name: tab.shortLabel })).toBeInTheDocument();
    }
    expect(within(bottom).getAllByRole('button')).toHaveLength(inBottom.length);
  });

  it('keeps Organizations out of the phone bottom navigation', () => {
    renderWithProviders(<AppShell />);
    const bottom = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(bottom).queryByRole('button', { name: tabDef(TAB_ID.organizations).shortLabel })).not.toBeInTheDocument();
  });

  it('places Organizations right after Communities in the sidebar', () => {
    renderWithProviders(<AppShell />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const labels = within(nav).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    const at = labels.indexOf(tabDef(TAB_ID.organizations).label);
    expect(at).toBeGreaterThan(-1);
    expect(labels[at - 1]).toBe(tabDef(TAB_ID.groups).label);
  });

  it('renders the Organizations page for the organizations tab', () => {
    renderWithProviders(<AppShell />, { context: { activeTab: 'organizations' } });
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Organizations' })).toBeInTheDocument();
    expect(main.querySelector('#organizations-tab-page')).not.toBeNull();
  });

  it('clicking a sidebar item switches the active tab through the context', async () => {
    const setActiveTab = vi.fn();
    const { user } = renderWithProviders(<AppShell />, { context: { setActiveTab } });
    const nav = screen.getByRole('navigation', { name: 'Main' });
    await user.click(within(nav).getByRole('button', { name: tabDef(TAB_ID.reels).label }));
    expect(setActiveTab).toHaveBeenCalledWith(TAB_ID.reels);
  });
});
