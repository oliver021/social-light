import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { OrganizationsTab } from './OrganizationsTab';
import { OrganizationKeptError, type Organization } from '../context/useOrganizations';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';

const base = (overrides: Partial<Organization>): Organization => ({
  id: 'o-1',
  ownerId: ANA,
  name: 'Makers',
  description: 'Things we make',
  logo: undefined,
  verified: false,
  memberCount: 3,
  myMembershipId: null,
  myRole: null,
  isOwner: false,
  ...overrides,
});

const ownedByMe = base({ id: 'o-mine', name: 'My Club', ownerId: ME, isOwner: true, myMembershipId: 'm-1', myRole: 'owner', memberCount: 1 });
const joined = base({ id: 'o-joined', name: 'Joined Club', myMembershipId: 'm-2', myRole: 'member' });
const open = base({ id: 'o-open', name: 'Open Club', myMembershipId: null, myRole: null });

describe('OrganizationsTab list', () => {
  it('shows Join to someone who is not a member, Leave to a member, and Owner to the owner', () => {
    renderWithProviders(<OrganizationsTab />, {
      context: { organizations: [ownedByMe, joined, open] },
    });
    expect(screen.getByRole('button', { name: 'Join Open Club' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave Joined Club' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave My Club' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join My Club' })).not.toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('shows the Verified chip only for a verified organization', () => {
    renderWithProviders(<OrganizationsTab />, {
      context: { organizations: [base({ id: 'o-v', name: 'Trusted', verified: true }), base({ id: 'o-u', name: 'Plain', verified: false })] },
    });
    const trusted = screen.getByRole('button', { name: 'Open Trusted' }).closest('article')!;
    expect(within(trusted).getByText('Verified')).toBeInTheDocument();
    const plain = screen.getByRole('button', { name: 'Open Plain' }).closest('article')!;
    expect(within(plain).queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.getAllByText('Verified')).toHaveLength(1);
  });

  it('a Join click calls joinOrganization with that organization and confirms only after it succeeds', async () => {
    const joinOrganization = vi.fn(async () => true);
    const showToast = vi.fn();
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: { organizations: [open], joinOrganization, showToast },
    });
    await user.click(screen.getByRole('button', { name: 'Join Open Club' }));
    await waitFor(() => expect(joinOrganization).toHaveBeenCalledWith('o-open'));
    expect(showToast).toHaveBeenCalledWith('You joined Open Club.', 'success');
  });

  it('a failed join shows no success message', async () => {
    const joinOrganization = vi.fn(async () => false);
    const showToast = vi.fn();
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: { organizations: [open], joinOrganization, showToast },
    });
    await user.click(screen.getByRole('button', { name: 'Join Open Club' }));
    await waitFor(() => expect(joinOrganization).toHaveBeenCalled());
    expect(showToast).not.toHaveBeenCalled();
  });

  it('the search box filters by name', async () => {
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: { organizations: [ownedByMe, open] },
    });
    await user.type(screen.getByRole('textbox', { name: 'Search organizations' }), 'open');
    expect(screen.getByRole('button', { name: 'Open Open Club' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open My Club' })).not.toBeInTheDocument();
  });

  it('shows the empty state with a way to create one', async () => {
    const { user, ctx } = renderWithProviders(<OrganizationsTab />, { context: { organizations: [] } });
    expect(screen.getByText('No organizations yet')).toBeInTheDocument();
    // The header and the empty state both offer the same action.
    await user.click(screen.getAllByRole('button', { name: 'Create organization' })[0]);
    expect(screen.getByRole('dialog', { name: 'Create an organization' })).toBeInTheDocument();
    expect(ctx.createOrganization).not.toHaveBeenCalled();
  });

  it('does not show "No organizations yet" while the first load is pending', () => {
    renderWithProviders(<OrganizationsTab />, { context: { organizations: [], organizationsLoading: true } });
    expect(screen.queryByText('No organizations yet')).not.toBeInTheDocument();
  });

  it('does not show "No organizations yet" when the load failed; it offers a retry instead', async () => {
    const loadOrganizations = vi.fn(async () => {});
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: { organizations: [], organizationsError: 'The organizations could not be loaded: database offline', loadOrganizations },
    });
    expect(screen.queryByText('No organizations yet')).not.toBeInTheDocument();
    expect(screen.getByText(/database offline/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(loadOrganizations).toHaveBeenCalled();
  });
});

describe('OrganizationsTab organization page', () => {
  const detailContext = (org: Organization, extra: Record<string, unknown> = {}) => ({
    organizations: [org],
    selectedOrganizationId: org.id,
    personView: vi.fn((userId: string) => ({ name: userId === ME ? 'Test User' : 'Ana Ruiz', avatar: '', handle: '@ana' })),
    ...extra,
  });

  it('the owner sees Delete in the menu and no Leave button', async () => {
    const { user } = renderWithProviders(<OrganizationsTab />, { context: detailContext(ownedByMe) });
    expect(screen.queryByRole('button', { name: 'Leave My Club' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More actions for My Club' }));
    expect(screen.getByRole('menuitem', { name: 'Delete organization' })).toBeInTheDocument();
  });

  it('a member sees Leave and no delete menu', () => {
    renderWithProviders(<OrganizationsTab />, { context: detailContext(joined) });
    expect(screen.getByRole('button', { name: 'Leave Joined Club' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions for Joined Club' })).not.toBeInTheDocument();
  });

  it('someone outside sees Join and no delete menu', () => {
    renderWithProviders(<OrganizationsTab />, { context: detailContext(open) });
    expect(screen.getByRole('button', { name: 'Join Open Club' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More actions/ })).not.toBeInTheDocument();
  });

  it('Delete asks first: Cancel does nothing, Delete calls deleteOrganization and leaves the page', async () => {
    const deleteOrganization = vi.fn(async () => {});
    const setSelectedOrganizationId = vi.fn();
    const { user } = renderWithProviders(<OrganizationsTab />, {
      context: detailContext(ownedByMe, { deleteOrganization, setSelectedOrganizationId }),
    });
    await user.click(screen.getByRole('button', { name: 'More actions for My Club' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete organization' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this organization?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(deleteOrganization).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'More actions for My Club' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete organization' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteOrganization).toHaveBeenCalledWith('o-mine'));
    await waitFor(() => expect(setSelectedOrganizationId).toHaveBeenCalledWith(null));
  });

  it('shows the owner and the members with their roles, and asks for them when opened', async () => {
    const loadOrganizationMembers = vi.fn(async () => {});
    renderWithProviders(<OrganizationsTab />, {
      context: detailContext(joined, {
        loadOrganizationMembers,
        organizationMembers: {
          'o-joined': [
            { id: 'm-a', userId: ANA, name: 'Ana Ruiz', handle: '@ana', avatar: '', role: 'owner' },
            { id: 'm-me', userId: ME, name: 'Test User', handle: '@me', avatar: '', role: 'member' },
          ],
        },
      }),
    });
    await waitFor(() => expect(loadOrganizationMembers).toHaveBeenCalledWith('o-joined'));
    const section = screen.getByRole('heading', { name: 'Members' }).closest('section')!;
    expect(within(section).getByText('Owner')).toBeInTheDocument();
    expect(within(section).getByText('Member')).toBeInTheDocument();
    expect(within(section).getByText('Ana Ruiz')).toBeInTheDocument();
    expect(within(section).getByText('Test User')).toBeInTheDocument();
  });
});

describe('OrganizationsTab create dialog', () => {
  async function openCreate(user: ReturnType<typeof renderWithProviders>['user']) {
    await user.click(screen.getAllByRole('button', { name: 'Create organization' })[0]);
    return screen.getByRole('dialog', { name: 'Create an organization' });
  }

  it('asks for a name and sends nothing without one', async () => {
    const createOrganization = vi.fn(async () => {});
    const { user } = renderWithProviders(<OrganizationsTab />, { context: { organizations: [ownedByMe], createOrganization } });
    const dialog = await openCreate(user);
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(within(dialog).getByText('Give the organization a name.')).toBeInTheDocument();
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it('sends the typed name and description, never an owner id', async () => {
    const createOrganization = vi.fn(async (_input: { name: string; description: string; logo?: string }) => {});
    const { user } = renderWithProviders(<OrganizationsTab />, { context: { organizations: [], createOrganization } });
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'Chess Club');
    await user.type(within(dialog).getByRole('textbox', { name: /description/i }), 'Weekly games');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));
    const input = createOrganization.mock.calls[0][0] as Record<string, unknown>;
    expect(input).toEqual({ name: 'Chess Club', description: 'Weekly games' });
    expect(input).not.toHaveProperty('ownerId');
    expect(input).not.toHaveProperty('verificationStatus');
  });

  it('a generic failure keeps the dialog open with the reason', async () => {
    const createOrganization = vi.fn(async () => {
      throw new Error('The organization was not created: name is taken');
    });
    const { user } = renderWithProviders(<OrganizationsTab />, { context: { organizations: [], createOrganization } });
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'Taken');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText(/name is taken/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Create an organization' })).toBeInTheDocument();
  });

  it('when the owner row failed, the dialog closes and the error is shown, so the organization is not created twice', async () => {
    const createOrganization = vi.fn(async () => {
      throw new OrganizationKeptError('The organization was created but you could not be added as its owner');
    });
    const showToast = vi.fn();
    const { user } = renderWithProviders(<OrganizationsTab />, { context: { organizations: [], createOrganization, showToast } });
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByRole('textbox', { name: /name/i }), 'Half made');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining('could not be added as its owner'), 'error'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create an organization' })).not.toBeInTheDocument());
  });
});
