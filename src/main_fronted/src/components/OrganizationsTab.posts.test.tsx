import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { OrganizationsTab } from './OrganizationsTab';
import { makePost } from './post/fixtures';
import type { Organization } from '../context/useOrganizations';
import type { OrganizationMember } from '../context/useOrganizations';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';

const base = (overrides: Partial<Organization>): Organization => ({
  id: 'o-1',
  ownerId: ANA,
  name: 'Makers',
  description: '',
  logo: undefined,
  verified: false,
  memberCount: 2,
  myMembershipId: null,
  myRole: null,
  isOwner: false,
  ...overrides,
});

const ownedByMe = base({ id: 'o-mine', name: 'Makers', ownerId: ME, isOwner: true, myMembershipId: 'm-1', myRole: 'owner' });
const asAdmin = base({ id: 'o-admin', name: 'Makers', ownerId: ANA, myMembershipId: 'm-3', myRole: 'admin' });
const asMember = base({ id: 'o-member', name: 'Makers', ownerId: ANA, myMembershipId: 'm-2', myRole: 'member' });

const anaPost = makePost({ id: 'p-ana', authorId: ANA, author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' }, content: 'Ana posts for Makers', organizationId: 'o-mine', organizationName: 'Makers' });
const myPost = makePost({ id: 'p-me', authorId: ME, author: { name: 'Test User', handle: '@me', avatar: '' }, content: 'My own note', organizationId: 'o-mine', organizationName: 'Makers' });

const members: OrganizationMember[] = [
  { id: 'm-owner', userId: ME, name: 'Test User', handle: '@me', avatar: '', role: 'owner' },
  { id: 'm-ben', userId: 'ben', name: 'Ben Park', handle: '@ben', avatar: '', role: 'member' },
];

const detail = (org: Organization, extra: Record<string, unknown> = {}) => ({
  organizations: [org],
  selectedOrganizationId: org.id,
  personView: vi.fn((userId: string) => ({ name: userId === ME ? 'Test User' : 'Ana Ruiz', avatar: '', handle: '@ana' })),
  organizationMembers: { [org.id]: members },
  ...extra,
});

describe('OrganizationsTab posts tab (M11)', () => {
  it('opens on the Posts tab and reads the organization posts when it opens', () => {
    const loadOrganizationPosts = vi.fn(async () => {});
    renderWithProviders(<OrganizationsTab />, { context: detail(ownedByMe, { loadOrganizationPosts }) });
    expect(screen.getByRole('tab', { name: 'Posts' })).toHaveAttribute('aria-selected', 'true');
    expect(loadOrganizationPosts).toHaveBeenCalledWith('o-mine');
  });

  it('the owner gets the full composer, labelled for the organization', () => {
    renderWithProviders(<OrganizationsTab />, { context: detail(ownedByMe) });
    expect(screen.getByRole('textbox', { name: 'Post as part of Makers' })).toBeInTheDocument();
    expect(screen.queryByText(/Only the owner and admins can post/)).not.toBeInTheDocument();
  });

  it('an admin gets the composer too', () => {
    renderWithProviders(<OrganizationsTab />, { context: detail(asAdmin) });
    expect(screen.getByRole('textbox', { name: 'Post as part of Makers' })).toBeInTheDocument();
  });

  it('a plain member gets no composer, only the reason', () => {
    renderWithProviders(<OrganizationsTab />, { context: detail(asMember) });
    expect(screen.queryByRole('textbox', { name: 'Post as part of Makers' })).not.toBeInTheDocument();
    expect(screen.getByText('Only the owner and admins can post for Makers.')).toBeInTheDocument();
  });

  it('shows the empty state when the organization has no posts', () => {
    renderWithProviders(<OrganizationsTab />, { context: detail(ownedByMe, { organizationPosts: [] }) });
    expect(screen.getByText('No posts from Makers yet')).toBeInTheDocument();
  });

  it('lists the organization posts', () => {
    renderWithProviders(<OrganizationsTab />, { context: detail(ownedByMe, { organizationPosts: [anaPost] }) });
    expect(screen.getByText('Ana posts for Makers')).toBeInTheDocument();
    expect(screen.queryByText('No posts from Makers yet')).not.toBeInTheDocument();
  });

  it('the owner can take someone else\'s post out of the organization, after a confirm', async () => {
    const removePostFromOrganization = vi.fn(async () => {});
    const showToast = vi.fn();
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: detail(ownedByMe, { organizationPosts: [anaPost], removePostFromOrganization, showToast }),
    });
    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove from organization' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove this post from Makers?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(removePostFromOrganization).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove from organization' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(removePostFromOrganization).toHaveBeenCalledWith('o-mine', 'p-ana'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Post removed from the organization', 'success'));
  });

  it('the owner gets no "Remove from organization" on their own post', async () => {
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: detail(ownedByMe, { organizationPosts: [myPost] }),
    });
    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    expect(screen.queryByRole('menuitem', { name: 'Remove from organization' })).not.toBeInTheDocument();
  });

  it('a plain member sees no "Remove from organization" on anyone\'s post', async () => {
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: detail(asMember, { organizationPosts: [anaPost] }),
    });
    await user.click(screen.getByRole('button', { name: 'More actions for this post' }));
    expect(screen.queryByRole('menuitem', { name: 'Remove from organization' })).not.toBeInTheDocument();
  });
});

describe('OrganizationsTab members moderation (M11)', () => {
  it('the owner sees Remove on the non-owner row only', async () => {
    const { user } = renderWithProviders(<OrganizationsTab />, { context: detail(ownedByMe) });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    expect(screen.getByRole('button', { name: 'Remove Ben Park' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Test User' })).not.toBeInTheDocument();
  });

  it('a member sees no Remove control', async () => {
    const { user } = renderWithProviders(<OrganizationsTab />, { context: detail(asMember) });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });

  it('removing a member asks first, then calls removeOrganizationMember with the row id', async () => {
    const removeOrganizationMember = vi.fn(async () => {});
    const showToast = vi.fn();
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: detail(ownedByMe, { removeOrganizationMember, showToast }),
    });
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    await user.click(screen.getByRole('button', { name: 'Remove Ben Park' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove Ben Park from this organization?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(removeOrganizationMember).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Remove Ben Park' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(removeOrganizationMember).toHaveBeenCalledWith('o-mine', 'm-ben'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Ben Park was removed from the organization', 'success'));
  });
});
