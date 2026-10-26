import { useMemo, useState, type MutableRefObject } from 'react';
import { organizationsApi, describeApiError, messageOf, getProfile, mediaUrl } from '../api/gateway';
import { defaultAvatar, withHandle } from '../api/mappers';
import type { components as OrganizationsComponents } from '@sdk/organizations';
import { type ToastSeverity } from './useToast';

type OrganizationDto = OrganizationsComponents['schemas']['OrganizationDto'];
type MemberDto = OrganizationsComponents['schemas']['OrganizationMemberDto'];

interface Deps {
  myUserId: MutableRefObject<string>;
  showToast: (message: string, severity?: ToastSeverity) => void;
}

export interface NewOrganization {
  name: string;
  description: string;
  /** Uploaded logo url (root-relative, as stored). Optional. */
  logo?: string;
}

/** An organization with my relationship to it, derived from the loaded rows. */
export interface Organization {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  /** Displayable logo url, or undefined when there is none. */
  logo: string | undefined;
  /** True only when the server says `verified` (users cannot verify themselves). */
  verified: boolean;
  memberCount: number;
  /** My membership row id, or null when I have not joined. */
  myMembershipId: string | null;
  /** My role in it ('owner' or 'member'), or null. */
  myRole: string | null;
  /** True when I am the owner (ownerId is my id). */
  isOwner: boolean;
}

/** A member of an organization, with the profile resolved. */
export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
}

/**
 * The organization was saved but its owner row was not. It stays in the list, so the create
 * dialog must close rather than let the user create a second one.
 */
export class OrganizationKeptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrganizationKeptError';
  }
}

/**
 * Await one typed-client call and turn a failure into a readable Error. Resolves only on a
 * 2xx; a thrown transport error and a non-2xx both reject with the server's own reason.
 */
async function checked<R extends { response: Response; error?: unknown }>(request: Promise<R>, fallback: string): Promise<R> {
  let result: R;
  try {
    result = await request;
  } catch (err) {
    throw new Error(messageOf(err, fallback));
  }
  if (!result.response.ok) throw new Error(describeApiError(result.error, result.response, fallback));
  return result;
}

/**
 * Organizations (M8): the real Organizations module. Loads every organization and every
 * membership row, derives my role and the member count, creates an organization (the creator
 * is added as its owner), joins and leaves through organization-members, deletes an
 * organization I own, and lists an organization's members with their profiles.
 *
 * Neither resource is bound from the JWT, so every owner or member id sent here is the
 * signed-in user's own id (`myUserId`), never anyone else's.
 */
export function useOrganizations({ myUserId, showToast }: Deps) {
  const [orgs, setOrgs] = useState<OrganizationDto[]>([]);
  const [rows, setRows] = useState<MemberDto[]>([]);
  // True until the first load settles (success or failure), so the tab can show a skeleton.
  const [loading, setLoading] = useState(true);
  // A readable reason when the last load failed; the tab shows it with a retry.
  const [loadError, setLoadError] = useState<string | null>(null);
  // Members per organization id, filled when its detail view is opened.
  const [membersByOrg, setMembersByOrg] = useState<Record<string, OrganizationMember[]>>({});

  // Derived, so a join, leave or delete updates every view from one source.
  const organizations = useMemo<Organization[]>(() => {
    const me = myUserId.current;
    const counts = new Map<string, number>();
    const mine = new Map<string, MemberDto>();
    for (const r of rows) {
      counts.set(r.organizationId, (counts.get(r.organizationId) ?? 0) + 1);
      if (r.userId === me) mine.set(r.organizationId, r);
    }
    return orgs.map((o) => {
      const membership = mine.get(o.id);
      return {
        id: o.id,
        ownerId: o.ownerId,
        name: o.name,
        description: o.description ?? '',
        logo: mediaUrl(o.logo),
        verified: o.verificationStatus === 'verified',
        memberCount: counts.get(o.id) ?? 0,
        myMembershipId: membership?.id ?? null,
        myRole: membership?.role ?? null,
        isOwner: o.ownerId === me,
      };
    });
  }, [orgs, rows, myUserId]);

  const loadOrganizations = async (): Promise<void> => {
    try {
      const [orgRes, rowRes] = await Promise.all([
        organizationsApi.GET('/api/organizations'),
        organizationsApi.GET('/api/organization-members'),
      ]);
      if (!orgRes.response.ok) throw new Error(describeApiError(orgRes.error, orgRes.response, 'The organizations could not be loaded'));
      if (!rowRes.response.ok) throw new Error(describeApiError(rowRes.error, rowRes.response, 'The organizations could not be loaded'));
      setOrgs(orgRes.data ?? []);
      setRows(rowRes.data ?? []);
      setLoadError(null);
    } catch (err) {
      setLoadError(messageOf(err, 'The organizations could not be loaded'));
    } finally {
      setLoading(false);
    }
  };

  // Create the organization, then make its creator the owner member. The organization is kept
  // when the owner row cannot be written; the reason is reported so the dialog can say so.
  // Rejects with a readable message so the dialog stays open.
  const createOrganization = async (input: NewOrganization): Promise<void> => {
    const me = myUserId.current;
    if (!me) throw new Error('Your session is still loading. Try again in a moment.');
    const { data: org } = await checked(
      organizationsApi.POST('/api/organizations', {
        body: {
          ownerId: me,
          name: input.name.trim(),
          description: input.description.trim() || null,
          logo: input.logo || null,
          verificationStatus: 'unverified',
        },
      }),
      'The organization was not created',
    );
    if (!org) throw new Error('The organization was not created');
    setOrgs((prev) => [...prev, org]);

    let owner: MemberDto | undefined;
    try {
      ({ data: owner } = await checked(
        organizationsApi.POST('/api/organization-members', {
          body: { organizationId: org.id, userId: me, role: 'owner' },
        }),
        'The organization was created but you could not be added as its owner',
      ));
    } catch (err) {
      throw new OrganizationKeptError(messageOf(err, 'The organization was created but you could not be added as its owner'));
    }
    if (owner) setRows((prev) => [...prev, owner]);
  };

  // Join as a member. Resolves true only after the server accepts the row; otherwise it
  // reports the reason with a toast and resolves false.
  const joinOrganization = async (organizationId: string): Promise<boolean> => {
    const me = myUserId.current;
    if (!me) {
      showToast('Your session is still loading. Try again in a moment.');
      return false;
    }
    try {
      const { data } = await checked(
        organizationsApi.POST('/api/organization-members', {
          body: { organizationId, userId: me, role: 'member' },
        }),
        'You could not join the organization',
      );
      if (data) setRows((prev) => [...prev, data]);
      return true;
    } catch (err) {
      showToast(messageOf(err, 'You could not join the organization'));
      return false;
    }
  };

  // Leave by deleting my own membership row. The owner cannot leave: the owner deletes the
  // organization instead. Resolves true when the server removed the row.
  const leaveOrganization = async (organizationId: string): Promise<boolean> => {
    const org = organizations.find((o) => o.id === organizationId);
    if (!org?.myMembershipId) return false;
    if (org.isOwner) {
      showToast('The owner cannot leave. Delete the organization instead.');
      return false;
    }
    const memberId = org.myMembershipId;
    try {
      await checked(
        organizationsApi.DELETE('/api/organization-members/{id}', { params: { path: { id: memberId } } }),
        'You could not leave the organization',
      );
      setRows((prev) => prev.filter((r) => r.id !== memberId));
      return true;
    } catch (err) {
      showToast(messageOf(err, 'You could not leave the organization'));
      return false;
    }
  };

  // Delete an organization I own. Rejects with a readable message so the confirm dialog can
  // show it. My own membership row is removed best-effort; the rest disappear with the list.
  const deleteOrganization = async (organizationId: string): Promise<void> => {
    const org = organizations.find((o) => o.id === organizationId);
    if (!org?.isOwner) throw new Error('Only the owner can delete this organization.');
    await checked(
      organizationsApi.DELETE('/api/organizations/{id}', { params: { path: { id: organizationId } } }),
      'The organization was not deleted',
    );
    setOrgs((prev) => prev.filter((o) => o.id !== organizationId));
    setRows((prev) => prev.filter((r) => r.organizationId !== organizationId));
    if (org.myMembershipId) {
      organizationsApi
        .DELETE('/api/organization-members/{id}', { params: { path: { id: org.myMembershipId } } })
        .catch(() => {});
    }
  };

  // The members of one organization, owners first, with profiles resolved from Profile.
  const loadOrganizationMembers = async (organizationId: string): Promise<void> => {
    const rowsFor = rows
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner'));
    const userIds = [...new Set(rowsFor.map((r) => r.userId))];
    const profiles = await Promise.all(userIds.map((id) => getProfile(id).catch(() => null)));
    const profileById = new Map(userIds.map((id, i) => [id, profiles[i]]));
    const members: OrganizationMember[] = rowsFor.map((r) => {
      const p = profileById.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        name: p?.displayName || 'Member',
        handle: withHandle(p?.handle),
        avatar: mediaUrl(p?.avatarUrl) ?? defaultAvatar(r.userId),
        role: r.role,
      };
    });
    setMembersByOrg((prev) => ({ ...prev, [organizationId]: members }));
  };

  // The organizations a person is a member of (from the loaded rows, which every signed-in user can read).
  const organizationsOf = (userId: string): Organization[] => {
    const ids = new Set(rows.filter((r) => r.userId === userId).map((r) => r.organizationId));
    return organizations.filter((o) => ids.has(o.id));
  };

  // Forget the previous account's organizations and memberships (used when the signed-in user changes).
  const reset = () => {
    setOrgs([]);
    setRows([]);
    setMembersByOrg({});
    setLoadError(null);
    setLoading(true);
  };

  return {
    organizations,
    loading,
    loadError,
    loadOrganizations,
    createOrganization,
    joinOrganization,
    leaveOrganization,
    deleteOrganization,
    organizationMembers: membersByOrg,
    loadOrganizationMembers,
    organizationsOf,
    reset,
  };
}
