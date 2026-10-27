import { useMemo, useState, type MutableRefObject } from 'react';
import { Post } from '../types';
import { organizationsApi, postsApi, describeApiError, messageOf, getProfile, mediaUrl } from '../api/gateway';
import { defaultAvatar, postDtoToPost, withHandle } from '../api/mappers';
import type { components as OrganizationsComponents } from '@sdk/organizations';
import { type ToastSeverity } from './useToast';
import type { PostTarget } from './useFeed';

type OrganizationDto = OrganizationsComponents['schemas']['OrganizationDto'];
type MemberDto = OrganizationsComponents['schemas']['OrganizationMemberDto'];

/** What the organizations need from the feed (M11): post for an organization, show its posts, delete a post. */
export interface OrganizationFeedDeps {
  /** The one path that writes a post and links it to an organization (M9). */
  createPostIn: (target: PostTarget, content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', extra?: any) => Promise<Post>;
  setOrganizationFeed: (organizationId: string, posts: Post[]) => void;
  deletePost: (postId: string) => Promise<void>;
}

interface Deps {
  myUserId: MutableRefObject<string>;
  showToast: (message: string, severity?: ToastSeverity) => void;
  feed: OrganizationFeedDeps;
}

export interface NewOrganization {
  name: string;
  description: string;
  /** Uploaded logo url (root-relative, as stored). Optional. */
  logo?: string;
}

/**
 * Who may post for an organization (M11): its owner, or a member whose role is `admin` (M12
 * adds the control that sets it). Plain members do not post; the page is the organization's voice.
 */
export function canPostToOrganization(org: Pick<Organization, 'isOwner' | 'myRole'>): boolean {
  return org.isOwner || org.myRole === 'admin';
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

const timeOf = (iso: string | null | undefined) => {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? 0 : t;
};

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
export function useOrganizations({ myUserId, showToast, feed }: Deps) {
  const [orgs, setOrgs] = useState<OrganizationDto[]>([]);
  const [rows, setRows] = useState<MemberDto[]>([]);
  // True until the first load settles (success or failure), so the tab can show a skeleton.
  const [loading, setLoading] = useState(true);
  // A readable reason when the last load failed; the tab shows it with a retry.
  const [loadError, setLoadError] = useState<string | null>(null);
  // Members per organization id, filled when its detail view is opened.
  const [membersByOrg, setMembersByOrg] = useState<Record<string, OrganizationMember[]>>({});
  // True while an organization's posts are being read (M11).
  const [organizationPostsLoading, setOrganizationPostsLoading] = useState(false);

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
  // The post-feed rows that link posts to it are removed best-effort too (M11), so no post
  // keeps pointing at an organization that is gone. The posts themselves stay with their authors.
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
    await deleteOrganizationPostLinks(organizationId).catch(() => {});
  };

  // Removes the `organization` post-feed rows of one organization. A failure is ignored by the
  // caller: the organization is already deleted, and the rows only add a dead link.
  const deleteOrganizationPostLinks = async (organizationId: string): Promise<void> => {
    const { data } = await postsApi.GET('/api/post-feeds');
    if (!data) return;
    await Promise.all(
      data
        .filter((f) => f.feedType === 'organization' && f.targetId === organizationId)
        .map((f) => postsApi.DELETE('/api/post-feeds/{id}', { params: { path: { id: f.id } } }).catch(() => {})),
    );
  };

  // The posts of one organization (M11): the post-feed rows with feedType 'organization' and this
  // targetId, resolved to posts (authors through Profile), newest first. Mirrors loadGroupPosts.
  // Errors are reported with a toast; the list keeps what it had.
  const loadOrganizationPosts = async (organizationId: string): Promise<void> => {
    setOrganizationPostsLoading(true);
    try {
      const [{ data: feeds }, { data: postList }] = await Promise.all([
        postsApi.GET('/api/post-feeds'),
        postsApi.GET('/api/posts'),
      ]);
      if (!feeds || !postList) throw new Error('The organization posts could not be loaded');
      const postIds = new Set(feeds.filter((f) => f.feedType === 'organization' && f.targetId === organizationId).map((f) => f.postId));
      const mine = postList
        .filter((p) => postIds.has(p.id))
        .sort((a, b) => timeOf(b.publishedAt) - timeOf(a.publishedAt));
      const authorIds = [...new Set(mine.map((p) => p.authorId))];
      const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
      const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));
      feed.setOrganizationFeed(organizationId, mine.map((p) => postDtoToPost(p, profileById.get(p.authorId) ?? null)));
    } catch (err) {
      showToast(messageOf(err, 'The organization posts could not be loaded'));
    } finally {
      setOrganizationPostsLoading(false);
    }
  };

  // Post for an organization (M11). Only its owner or an admin may; anyone else is refused here
  // before any request. The write and the organization link are done by createPostIn (M9), then
  // the organization's posts are re-read. Rejects with a readable message; the composer keeps the text.
  const createOrganizationPost = async (
    organizationId: string,
    content: string,
    type: 'text' | 'link' | 'image' | 'video' | 'poll' = 'text',
    extra?: any,
  ): Promise<void> => {
    const org = organizations.find((o) => o.id === organizationId);
    if (!org || !canPostToOrganization(org)) throw new Error('Only the owner or an admin can post for this organization.');
    await feed.createPostIn({ kind: 'organization', id: organizationId, name: org.name }, content, type, extra);
    await loadOrganizationPosts(organizationId);
  };

  // Owner moderation (M11): take a post out of this organization. Only the post-feed rows that
  // link THIS post to THIS organization are deleted; the post stays on its author's profile and
  // on Home (never DELETE /api/posts). The server does not check the owner yet (B13), so the
  // control is shown to the owner only, and this refuses anyone else before any request.
  // Rejects with the server's reason; the list is re-read after any row was removed.
  const removePostFromOrganization = async (organizationId: string, postId: string): Promise<void> => {
    const org = organizations.find((o) => o.id === organizationId);
    if (!org?.isOwner) throw new Error('Only the owner can remove posts from this organization.');
    const { data: feeds, error, response } = await postsApi.GET('/api/post-feeds');
    if (!feeds) throw new Error(describeApiError(error, response, 'The post could not be removed from the organization'));
    const links = feeds.filter((f) => f.feedType === 'organization' && f.targetId === organizationId && f.postId === postId);
    let removed = 0;
    let failure: string | null = null;
    for (const link of links) {
      const res = await postsApi.DELETE('/api/post-feeds/{id}', { params: { path: { id: link.id } } });
      if (!res.response.ok) {
        failure = describeApiError(res.error, res.response, 'The post was not removed from the organization');
        break;
      }
      removed += 1;
    }
    if (failure && removed === 0) throw new Error(failure);
    await loadOrganizationPosts(organizationId);
    if (failure) throw new Error(failure);
  };

  // Owner moderation (M11): remove a member row from this organization. The owner row cannot be
  // removed. The member list and the member count change only after the server's 2xx.
  const removeOrganizationMember = async (organizationId: string, memberRowId: string): Promise<void> => {
    const org = organizations.find((o) => o.id === organizationId);
    if (!org?.isOwner) throw new Error('Only the owner can remove members from this organization.');
    const row = rows.find((r) => r.id === memberRowId && r.organizationId === organizationId);
    if (row && (row.role === 'owner' || row.userId === org.ownerId)) {
      throw new Error('The owner cannot be removed from the organization.');
    }
    await checked(
      organizationsApi.DELETE('/api/organization-members/{id}', { params: { path: { id: memberRowId } } }),
      'The member was not removed',
    );
    setRows((prev) => prev.filter((r) => r.id !== memberRowId));
    setMembersByOrg((prev) => (prev[organizationId]
      ? { ...prev, [organizationId]: prev[organizationId].filter((m) => m.id !== memberRowId) }
      : prev));
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
    setOrganizationPostsLoading(false);
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
    organizationPostsLoading,
    loadOrganizationPosts,
    createOrganizationPost,
    removePostFromOrganization,
    removeOrganizationMember,
    reset,
  };
}
