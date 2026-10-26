import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrganizations, OrganizationKeptError } from './useOrganizations';
import { mockApi, type RecordedCall } from '../test/mockApi';
import { clearProfileCache } from '../api/gateway';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';

const org = (id: string, ownerId: string, overrides: Record<string, unknown> = {}) => ({
  id,
  ownerId,
  name: `Org ${id}`,
  description: null,
  logo: null,
  verificationStatus: 'unverified',
  ...overrides,
});

const row = (id: string, organizationId: string, userId: string, role: string) => ({ id, organizationId, userId, role });

/** The owner and member ids a request carried, for the "only my own id" rule. */
function ownerAndUserIds(call: RecordedCall): string[] {
  const body = (call.body ?? {}) as Record<string, unknown>;
  return [body.ownerId, body.userId].filter((v): v is string => typeof v === 'string');
}

function setup(routes: Record<string, unknown> = {}) {
  const { calls } = mockApi({
    'GET /api/organizations': [],
    'GET /api/organization-members': [],
    'GET /api/profiles/{userId}': { status: 404 },
    ...routes,
  });
  const showToast = vi.fn();
  const hook = renderHook(() => useOrganizations({ myUserId: { current: ME }, showToast }));
  return { ...hook, calls, showToast };
}

beforeEach(() => {
  clearProfileCache();
});

describe('useOrganizations.loadOrganizations', () => {
  it('derives my membership, the member count, the owner flag and the verified flag', async () => {
    const { result } = setup({
      'GET /api/organizations': [
        org('o-mine', ME),
        org('o-joined', ANA),
        org('o-verified', ANA, { verificationStatus: 'verified' }),
      ],
      'GET /api/organization-members': [
        row('m-1', 'o-mine', ME, 'owner'),
        row('m-2', 'o-joined', ANA, 'owner'),
        row('m-3', 'o-joined', ME, 'member'),
        row('m-4', 'o-verified', ANA, 'owner'),
      ],
    });
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadOrganizations();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.loadError).toBeNull();

    const byId = Object.fromEntries(result.current.organizations.map((o) => [o.id, o]));
    expect(byId['o-mine']).toMatchObject({ isOwner: true, myRole: 'owner', myMembershipId: 'm-1', memberCount: 1, verified: false });
    expect(byId['o-joined']).toMatchObject({ isOwner: false, myRole: 'member', myMembershipId: 'm-3', memberCount: 2 });
    expect(byId['o-verified']).toMatchObject({ isOwner: false, myMembershipId: null, memberCount: 1, verified: true });
  });

  it('reports a failed load with the server reason, keeps the list empty and stops loading', async () => {
    const { result } = setup({
      'GET /api/organizations': { status: 500, body: { title: 'database offline' } },
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.organizations).toEqual([]);
    expect(result.current.loadError).toContain('database offline');
  });
});

describe('useOrganizations.createOrganization', () => {
  it('posts the organization with me as owner and then adds me as the owner member', async () => {
    const { result, calls } = setup({
      'POST /api/organizations': (call) => org('o-new', (call.body as { ownerId: string }).ownerId, { name: 'Makers Club' }),
      'POST /api/organization-members': (call) => row('m-new', (call.body as { organizationId: string }).organizationId, ME, 'owner'),
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    await act(async () => {
      await result.current.createOrganization({ name: '  Makers Club ', description: '', logo: '' });
    });

    const orgPost = calls.find((c) => c.method === 'POST' && c.path === '/api/organizations');
    expect(orgPost?.body).toEqual({
      ownerId: ME,
      name: 'Makers Club',
      description: null,
      logo: null,
      verificationStatus: 'unverified',
    });
    const memberPost = calls.find((c) => c.method === 'POST' && c.path === '/api/organization-members');
    expect(memberPost?.body).toEqual({ organizationId: 'o-new', userId: ME, role: 'owner' });

    const created = result.current.organizations.find((o) => o.id === 'o-new');
    expect(created).toMatchObject({ name: 'Makers Club', isOwner: true, myRole: 'owner', memberCount: 1, verified: false });
  });

  it('sends the description and logo when they are given', async () => {
    const { result, calls } = setup({
      'POST /api/organizations': (call) => org('o-2', (call.body as { ownerId: string }).ownerId),
      'POST /api/organization-members': row('m-2', 'o-2', ME, 'owner'),
    });
    await act(async () => {
      await result.current.createOrganization({ name: 'Club', description: 'Weekly meetups', logo: '/blobs/abc.png' });
    });
    expect(calls.find((c) => c.path === '/api/organizations')?.body).toMatchObject({
      description: 'Weekly meetups',
      logo: '/blobs/abc.png',
    });
  });

  it('keeps the organization and rejects with the owner-row message when the second request fails', async () => {
    const { result, calls } = setup({
      'POST /api/organizations': (call) => org('o-kept', (call.body as { ownerId: string }).ownerId, { name: 'Kept' }),
      'POST /api/organization-members': { status: 500, body: { title: 'membership store down' } },
    });
    let caught: unknown;
    await act(async () => {
      try {
        await result.current.createOrganization({ name: 'Kept', description: '', logo: '' });
      } catch (err) {
        caught = err;
      }
    });
    expect(caught).toBeInstanceOf(OrganizationKeptError);
    expect((caught as Error).message).toContain('The organization was created but you could not be added as its owner');
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2);
    expect(result.current.organizations.map((o) => o.id)).toEqual(['o-kept']);
    expect(result.current.organizations[0].isOwner).toBe(true);
    expect(result.current.organizations[0].myMembershipId).toBeNull();
  });

  it('rejects with the server reason and creates nothing when the organization itself is refused', async () => {
    const { result, calls } = setup({
      'POST /api/organizations': { status: 400, body: { title: 'Name is taken' } },
    });
    let caught: unknown;
    await act(async () => {
      try {
        await result.current.createOrganization({ name: 'Taken', description: '', logo: '' });
      } catch (err) {
        caught = err;
      }
    });
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(OrganizationKeptError);
    expect((caught as Error).message).toContain('Name is taken');
    expect(calls.some((c) => c.path === '/api/organization-members')).toBe(false);
    expect(result.current.organizations).toEqual([]);
  });
});

describe('useOrganizations join and leave', () => {
  it('join posts a member row for me and shows me as a member after the 2xx', async () => {
    const { result, calls, showToast } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-owner', 'o-1', ANA, 'owner')],
      'POST /api/organization-members': (call) => row('m-me', (call.body as { organizationId: string }).organizationId, ME, 'member'),
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    let ok = false;
    await act(async () => {
      ok = await result.current.joinOrganization('o-1');
    });
    expect(ok).toBe(true);
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ organizationId: 'o-1', userId: ME, role: 'member' });
    expect(result.current.organizations[0]).toMatchObject({ myMembershipId: 'm-me', myRole: 'member', memberCount: 2 });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('a failed join leaves the list unchanged and reports the reason', async () => {
    const { result, showToast } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-owner', 'o-1', ANA, 'owner')],
      'POST /api/organization-members': { status: 403, body: { title: 'Joining is closed' } },
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    let ok = true;
    await act(async () => {
      ok = await result.current.joinOrganization('o-1');
    });
    expect(ok).toBe(false);
    expect(result.current.organizations[0]).toMatchObject({ myMembershipId: null, memberCount: 1 });
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Joining is closed'));
  });

  it('leave deletes my own membership row and clears my membership after the 2xx', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-owner', 'o-1', ANA, 'owner'), row('m-me', 'o-1', ME, 'member')],
      'DELETE /api/organization-members/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    let ok = false;
    await act(async () => {
      ok = await result.current.leaveOrganization('o-1');
    });
    expect(ok).toBe(true);
    expect(calls.find((c) => c.method === 'DELETE')?.path).toBe('/api/organization-members/m-me');
    expect(result.current.organizations[0]).toMatchObject({ myMembershipId: null, memberCount: 1 });
  });

  it('a failed leave keeps me in the organization and reports the reason', async () => {
    const { result, showToast } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-owner', 'o-1', ANA, 'owner'), row('m-me', 'o-1', ME, 'member')],
      'DELETE /api/organization-members/{id}': { status: 500, body: { title: 'try later' } },
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    let ok = true;
    await act(async () => {
      ok = await result.current.leaveOrganization('o-1');
    });
    expect(ok).toBe(false);
    expect(result.current.organizations[0]).toMatchObject({ myMembershipId: 'm-me', memberCount: 2 });
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('try later'));
  });

  it('the owner cannot leave: nothing is sent and the owner is told to delete instead', async () => {
    const { result, calls, showToast } = setup({
      'GET /api/organizations': [org('o-mine', ME)],
      'GET /api/organization-members': [row('m-owner', 'o-mine', ME, 'owner')],
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    let ok = true;
    await act(async () => {
      ok = await result.current.leaveOrganization('o-mine');
    });
    expect(ok).toBe(false);
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Delete the organization instead'));
  });
});

describe('useOrganizations delete and members', () => {
  it('the owner deletes the organization and it leaves the list', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-mine', ME)],
      'GET /api/organization-members': [row('m-owner', 'o-mine', ME, 'owner')],
      'DELETE /api/organizations/{id}': { status: 204 },
      'DELETE /api/organization-members/{id}': { status: 204 },
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    await act(async () => {
      await result.current.deleteOrganization('o-mine');
    });
    expect(calls.find((c) => c.method === 'DELETE' && c.path === '/api/organizations/o-mine')).toBeDefined();
    expect(result.current.organizations).toEqual([]);
  });

  it('a non-owner cannot delete: nothing is sent and the call rejects', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-ana', ANA)],
      'GET /api/organization-members': [row('m-ana', 'o-ana', ANA, 'owner')],
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    await expect(result.current.deleteOrganization('o-ana')).rejects.toThrow('Only the owner can delete this organization.');
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    expect(result.current.organizations).toHaveLength(1);
  });

  it('a failed delete rejects with the server reason and keeps the organization', async () => {
    const { result } = setup({
      'GET /api/organizations': [org('o-mine', ME)],
      'GET /api/organization-members': [row('m-owner', 'o-mine', ME, 'owner')],
      'DELETE /api/organizations/{id}': { status: 500, body: { title: 'still has posts' } },
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    await expect(result.current.deleteOrganization('o-mine')).rejects.toThrow('still has posts');
    expect(result.current.organizations.map((o) => o.id)).toEqual(['o-mine']);
  });

  it('loadOrganizationMembers lists the owner first, with profiles resolved', async () => {
    const { result } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-me', 'o-1', ME, 'member'), row('m-ana', 'o-1', ANA, 'owner')],
      'GET /api/profiles/{userId}': (call) => {
        const profiles: Record<string, unknown> = {
          [ANA]: { userId: ANA, displayName: 'Ana Ruiz', handle: 'ana', avatarUrl: null },
          [ME]: { userId: ME, displayName: 'Test User', handle: 'me', avatarUrl: null },
        };
        return profiles[call.path.split('/').pop() ?? ''] ?? { status: 404 };
      },
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    await act(async () => {
      await result.current.loadOrganizationMembers('o-1');
    });
    const members = result.current.organizationMembers['o-1'];
    expect(members.map((m) => [m.name, m.role])).toEqual([
      ['Ana Ruiz', 'owner'],
      ['Test User', 'member'],
    ]);
  });

  it('organizationsOf returns the organizations a given person belongs to', async () => {
    const { result } = setup({
      'GET /api/organizations': [org('o-1', ANA), org('o-2', ANA)],
      'GET /api/organization-members': [row('m-1', 'o-1', ANA, 'owner'), row('m-2', 'o-2', ME, 'member')],
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    expect(result.current.organizationsOf(ANA).map((o) => o.id)).toEqual(['o-1']);
    expect(result.current.organizationsOf(ME).map((o) => o.id)).toEqual(['o-2']);
  });
});

describe('useOrganizations ownership rule', () => {
  it('every owner or user id sent in a request is my own id', async () => {
    const { result, calls } = setup({
      'GET /api/organizations': [org('o-1', ANA)],
      'GET /api/organization-members': [row('m-ana', 'o-1', ANA, 'owner')],
      'POST /api/organizations': (call) => org('o-new', (call.body as { ownerId: string }).ownerId),
      'POST /api/organization-members': (call) => row('m-x', (call.body as { organizationId: string }).organizationId, ME, 'member'),
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    await act(async () => {
      await result.current.createOrganization({ name: 'Mine', description: '', logo: '' });
      await result.current.joinOrganization('o-1');
    });
    const sent = calls.filter((c) => c.method === 'POST');
    expect(sent.length).toBeGreaterThanOrEqual(3);
    for (const call of sent) {
      for (const id of ownerAndUserIds(call)) expect(id).toBe(ME);
    }
  });

  it('reset forgets the organizations, memberships and loaded members', async () => {
    const { result } = setup({
      'GET /api/organizations': [org('o-1', ME)],
      'GET /api/organization-members': [row('m-1', 'o-1', ME, 'owner')],
    });
    await act(async () => {
      await result.current.loadOrganizations();
    });
    expect(result.current.organizations).toHaveLength(1);
    act(() => {
      result.current.reset();
    });
    expect(result.current.organizations).toEqual([]);
    expect(result.current.organizationMembers).toEqual({});
    expect(result.current.loading).toBe(true);
  });
});
