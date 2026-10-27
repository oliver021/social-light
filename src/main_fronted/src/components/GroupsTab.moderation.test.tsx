import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { GroupsTab } from './GroupsTab';
import { makePost } from './post/fixtures';
import type { Group } from '../types';
import type { GroupMember } from '../context/useGroups';

const ME = 'me-0000-0000-0000-000000000001';

const design: Group = {
  id: 'g1',
  name: 'Design Systems',
  description: 'Tokens, components and docs.',
  category: 'Design Systems',
  memberCount: 2,
  joined: true,
  coverUrl: 'https://example.test/design.png',
};

const anaPost = makePost({ id: 'p-ana', authorId: 'ana', content: 'Ana shares tokens' });
const myPost = makePost({ id: 'p-me', authorId: ME, author: { name: 'Test User', handle: '@testuser', avatar: '' }, content: 'My own note' });

const owner: GroupMember = { id: 'm-1', userId: ME, name: 'Test User', handle: '@testuser', avatar: '', role: 'owner' };
const ben: GroupMember = { id: 'm-2', userId: 'ben', name: 'Ben Park', handle: '@ben', avatar: '', role: 'member' };

const menuFor = async (user: ReturnType<typeof renderWithProviders>['user'], index: number) => {
  const buttons = screen.getAllByRole('button', { name: 'More actions for this post' });
  await user.click(buttons[index]);
};

describe('GroupsTab owner moderation: posts', () => {
  it('the owner sees "Remove from community" on other people\'s posts, not on their own', async () => {
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'owner']]),
        groupPosts: [anaPost, myPost],
      },
    });
    await menuFor(user, 0);
    expect(screen.getByRole('menuitem', { name: 'Remove from community' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    await menuFor(user, 1);
    expect(screen.queryByRole('menuitem', { name: 'Remove from community' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete post' })).toBeInTheDocument();
  });

  it('a member who is not the owner never sees "Remove from community"', async () => {
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'member']]),
        groupPosts: [anaPost],
      },
    });
    await menuFor(user, 0);
    expect(screen.queryByRole('menuitem', { name: 'Remove from community' })).not.toBeInTheDocument();
  });

  it('removing a post asks first, then calls the hook with that post only', async () => {
    const removePostFromGroup = vi.fn(async () => {});
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'owner']]),
        groupPosts: [anaPost],
        removePostFromGroup,
      },
    });
    await menuFor(user, 0);
    await user.click(screen.getByRole('menuitem', { name: 'Remove from community' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Remove this post from Design Systems?')).toBeInTheDocument();
    expect(within(dialog).getByText("It stays on Ana Ruiz's profile.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(removePostFromGroup).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await menuFor(user, 0);
    await user.click(screen.getByRole('menuitem', { name: 'Remove from community' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(removePostFromGroup).toHaveBeenCalledWith('g1', 'p-ana'));
  });

  it('a refused removal keeps the dialog open with the server reason', async () => {
    const removePostFromGroup = vi.fn(async () => {
      throw new Error('The post was not removed from the community: Not the owner');
    });
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'owner']]),
        groupPosts: [anaPost],
        removePostFromGroup,
      },
    });
    await menuFor(user, 0);
    await user.click(screen.getByRole('menuitem', { name: 'Remove from community' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
    expect(await within(dialog).findByText('The post was not removed from the community: Not the owner')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('GroupsTab owner moderation: members', () => {
  it('the owner sees "Remove" on every member except the owner row', async () => {
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'owner']]),
        groupMembers: { g1: [owner, ben] },
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    expect(screen.getByRole('button', { name: 'Remove Ben Park' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Test User' })).not.toBeInTheDocument();
  });

  it('a member who is not the owner sees no remove control', async () => {
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'member']]),
        groupMembers: { g1: [owner, ben] },
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    expect(screen.getByRole('button', { name: 'Test User' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });

  it('removing a member confirms, then calls the hook with that member row', async () => {
    const removeMember = vi.fn(async () => {});
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'owner']]),
        groupMembers: { g1: [owner, ben] },
        removeMember,
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    await user.click(screen.getByRole('button', { name: 'Remove Ben Park' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Remove Ben Park from this community?')).toBeInTheDocument();
    expect(removeMember).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('g1', 'm-2'));
  });

  it('a refused removal shows the server reason and the member stays listed', async () => {
    const removeMember = vi.fn(async () => {
      throw new Error('The member was not removed: Forbidden');
    });
    const { user } = renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        myRoleByGroup: new Map([['g1', 'owner']]),
        groupMembers: { g1: [owner, ben] },
        removeMember,
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    await user.click(screen.getByRole('button', { name: 'Remove Ben Park' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
    expect(await within(dialog).findByText('The member was not removed: Forbidden')).toBeInTheDocument();
    // The dialog is still open, so the page behind it is hidden from the accessibility tree;
    // the member is still in the list in the DOM.
    expect(screen.getByText('Ben Park')).toBeInTheDocument();
  });
});

describe('GroupsTab composer for non-members', () => {
  it('a non-member sees the join prompt instead of the composer, and can join from it', async () => {
    const toggleJoinGroup = vi.fn(async () => true);
    const { user } = renderWithProviders(<GroupsTab />, {
      context: { groups: [{ ...design, joined: false }], selectedGroupId: 'g1', toggleJoinGroup },
    });
    expect(screen.getByText('Join to post in this community')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Post in this community' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Join Design Systems to post' }));
    expect(toggleJoinGroup).toHaveBeenCalledWith('g1');
  });
});
