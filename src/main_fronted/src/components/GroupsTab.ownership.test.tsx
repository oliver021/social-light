import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { GroupsTab } from './GroupsTab';
import type { Group } from '../types';

const groups: Group[] = [
  { id: 'g-1', name: 'Makers', description: 'Things we make', category: 'Public', memberCount: 3, joined: true, coverUrl: '' },
];

describe('GroupsTab ownership', () => {
  it('shows delete on a community I own', () => {
    renderWithProviders(<GroupsTab />, {
      context: { groups, selectedGroupId: 'g-1', myRoleByGroup: new Map([['g-1', 'owner']]) },
    });
    expect(screen.getByRole('button', { name: 'More actions for this community' })).toBeInTheDocument();
  });

  it('hides delete on a community I only joined', () => {
    renderWithProviders(<GroupsTab />, {
      context: { groups, selectedGroupId: 'g-1', myRoleByGroup: new Map([['g-1', 'member']]) },
    });
    expect(screen.queryByRole('button', { name: 'More actions for this community' })).not.toBeInTheDocument();
  });

  it('Delete community asks first, then deletes and leaves the community view', async () => {
    const deleteGroup = vi.fn(async () => {});
    const setSelectedGroupId = vi.fn();
    const { user } = renderWithProviders(<GroupsTab />, {
      context: { groups, selectedGroupId: 'g-1', myRoleByGroup: new Map([['g-1', 'owner']]), deleteGroup, setSelectedGroupId },
    });
    await user.click(screen.getByRole('button', { name: 'More actions for this community' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete community' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('g-1'));
    await waitFor(() => expect(setSelectedGroupId).toHaveBeenCalledWith(null));
  });
});
