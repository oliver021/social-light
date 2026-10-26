import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { GroupsTab } from './GroupsTab';
import type { Group } from '../types';

const design: Group = {
  id: 'g1',
  name: 'Design Systems',
  description: 'Tokens, components and docs.',
  category: 'Design Systems',
  memberCount: 12,
  joined: false,
  coverUrl: 'https://example.test/design.png',
};

const gaming: Group = {
  id: 'g2',
  name: 'Gaming Lounge',
  description: 'Matches and patch notes.',
  category: 'Gaming',
  memberCount: 1,
  joined: true,
  coverUrl: 'https://example.test/gaming.png',
};

/** The empty state and the page header both offer "Create community" when there are no groups. */
const createButtons = () => screen.getAllByRole('button', { name: 'Create community' });

describe('GroupsTab discovery', () => {
  it('shows the empty state with a create action when there are no communities', async () => {
    const { user, ctx } = renderWithProviders(<GroupsTab />, { context: { groups: [] } });
    expect(screen.getByRole('heading', { name: 'No communities yet' })).toBeInTheDocument();
    await user.click(createButtons()[createButtons().length - 1]);
    expect(await screen.findByRole('dialog', { name: 'Create a community' })).toBeInTheDocument();
    expect(ctx.createGroup).not.toHaveBeenCalled();
  });

  it('shows the search empty state when no community matches the filter', async () => {
    const { user } = renderWithProviders(<GroupsTab />, { context: { groups: [design, gaming] } });
    await user.type(screen.getByRole('textbox', { name: 'Search communities' }), 'zzz');
    expect(screen.getByRole('heading', { name: 'No communities match your search' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create community' })).toBeInTheDocument();
  });

  it('filters by category and marks the active chip as pressed', async () => {
    const { user } = renderWithProviders(<GroupsTab />, { context: { groups: [design, gaming] } });
    await user.click(screen.getByRole('button', { name: 'Gaming' }));
    expect(screen.getByRole('button', { name: 'Gaming' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Open Gaming Lounge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Design Systems' })).not.toBeInTheDocument();
  });

  it('joining calls the hook and then records the notification', async () => {
    const { user, ctx } = renderWithProviders(<GroupsTab />, { context: { groups: [design] } });
    await user.click(screen.getByRole('button', { name: 'Join Design Systems' }));
    expect(ctx.toggleJoinGroup).toHaveBeenCalledWith('g1');
    await waitFor(() =>
      expect(ctx.addNotification).toHaveBeenCalledWith('group', 'Design Systems', 'You joined the community.'),
    );
  });

  it('a membership change the hook refused records no notification', async () => {
    const toggleJoinGroup = vi.fn(async () => false);
    const { user, ctx } = renderWithProviders(<GroupsTab />, { context: { groups: [design], toggleJoinGroup } });
    await user.click(screen.getByRole('button', { name: 'Join Design Systems' }));
    await waitFor(() => expect(toggleJoinGroup).toHaveBeenCalledWith('g1'));
    expect(ctx.addNotification).not.toHaveBeenCalled();
  });

  it('a joined community shows "Joined" with a Leave name', () => {
    renderWithProviders(<GroupsTab />, { context: { groups: [gaming] } });
    expect(screen.getByRole('button', { name: 'Leave Gaming Lounge' })).toHaveTextContent('Joined');
  });
});

describe('GroupsTab create dialog', () => {
  it('asks for a name before it calls the API', async () => {
    const { user, ctx } = renderWithProviders(<GroupsTab />, { context: { groups: [design] } });
    await user.click(createButtons()[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Create a community' });
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Give the community a name.');
    expect(ctx.createGroup).not.toHaveBeenCalled();
  });

  it('a created community sends the form, closes and reports success', async () => {
    const { user, ctx } = renderWithProviders(<GroupsTab />, { context: { groups: [design] } });
    await user.click(createButtons()[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Create a community' });
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'Robotics');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() =>
      expect(ctx.createGroup).toHaveBeenCalledWith({ name: 'Robotics', description: '', privacy: 'public' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create a community' })).not.toBeInTheDocument());
    expect(ctx.showToast).toHaveBeenCalledWith('Community "Robotics" created. You are a member.', 'success');
  });

  it('a refused create shows the server message and keeps the dialog open', async () => {
    const createGroup = vi.fn(async () => {
      throw new Error('That name is already taken');
    });
    const { user, ctx } = renderWithProviders(<GroupsTab />, { context: { groups: [design], createGroup } });
    await user.click(createButtons()[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Create a community' });
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'Design Systems');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That name is already taken');
    expect(screen.getByRole('dialog', { name: 'Create a community' })).toBeInTheDocument();
    expect(ctx.showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });
});

describe('GroupsTab community view', () => {
  it('opens a community, shows its banner and the empty posts state, and goes back', async () => {
    const { user, ctx } = renderWithProviders(<GroupsTab />, {
      context: { groups: [design], selectedGroupId: 'g1' },
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Design Systems' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Posts in Design Systems' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No posts in this community yet' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'All communities' }));
    expect(ctx.setSelectedGroupId).toHaveBeenCalledWith(null);
  });
});

describe('GroupsTab loading state', () => {
  it('shows placeholder cards while the first groups load is pending', () => {
    renderWithProviders(<GroupsTab />, { context: { groups: [], groupsLoading: true } });
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No communities yet' })).not.toBeInTheDocument();
  });

  it('shows the empty state once the load has settled with no groups', () => {
    renderWithProviders(<GroupsTab />, { context: { groups: [], groupsLoading: false } });
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No communities yet' })).toBeInTheDocument();
  });
});

const member = { id: 'm-1', userId: 'me-0000-0000-0000-000000000001', name: 'Test User', handle: '@me', avatar: '', role: 'owner' };

describe('GroupsTab community posts and members', () => {
  it('only a member sees the composer', () => {
    const { unmount } = renderWithProviders(<GroupsTab />, { context: { groups: [gaming], selectedGroupId: 'g2' } });
    expect(screen.getByRole('textbox', { name: 'Post in this community' })).toBeInTheDocument();
    unmount();
    renderWithProviders(<GroupsTab />, { context: { groups: [design], selectedGroupId: 'g1' } });
    expect(screen.queryByRole('textbox', { name: 'Post in this community' })).not.toBeInTheDocument();
  });

  it('a member posts into the community through createGroupPost, and the text clears on success', async () => {
    const createGroupPost = vi.fn(async () => {});
    const { user } = renderWithProviders(<GroupsTab />, { context: { groups: [gaming], selectedGroupId: 'g2', createGroupPost } });
    await user.type(screen.getByRole('textbox', { name: 'Post in this community' }), 'Who plays tonight?');
    await user.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => expect(createGroupPost).toHaveBeenCalledWith('g2', 'Who plays tonight?', 'text'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Post in this community' })).toHaveValue(''));
  });

  it('a refused community post keeps the text and shows the reason', async () => {
    const createGroupPost = vi.fn(async () => {
      throw new Error('Your post was not added to the community: Not a member');
    });
    const { user } = renderWithProviders(<GroupsTab />, { context: { groups: [gaming], selectedGroupId: 'g2', createGroupPost } });
    await user.type(screen.getByRole('textbox', { name: 'Post in this community' }), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Post' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your post was not added to the community: Not a member');
    expect(screen.getByRole('textbox', { name: 'Post in this community' })).toHaveValue('Hi');
  });

  it('lists the community posts it was given', () => {
    renderWithProviders(<GroupsTab />, {
      context: {
        groups: [design],
        selectedGroupId: 'g1',
        groupPosts: [{ id: 'p-1', type: 'text', author: { name: 'Ana', handle: '', avatar: '' }, content: 'Tokens are live', createdAt: 'now', reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 }, comments: [], sharesCount: 0 }],
      },
    });
    expect(screen.getByText('Tokens are live')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No posts in this community yet' })).not.toBeInTheDocument();
  });

  it('the Members tab shows the owner with an Owner label', async () => {
    const loadMembers = vi.fn(async () => {});
    const { user } = renderWithProviders(<GroupsTab />, {
      context: { groups: [design], selectedGroupId: 'g1', loadMembers, groupMembers: { g1: [member] } },
    });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    expect(await screen.findByText('Owner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test User' })).toBeInTheDocument();
    expect(loadMembers).toHaveBeenCalledWith('g1');
  });

  it('a community with a cover image shows it', () => {
    renderWithProviders(<GroupsTab />, { context: { groups: [{ ...design, coverImage: '/blobs/cover.png', privacy: 'private' }], selectedGroupId: 'g1' } });
    expect(screen.getByRole('img', { name: 'Cover image of Design Systems' })).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });
});
