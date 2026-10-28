import { useRef, useState, type MutableRefObject } from 'react';
import { Group, Post } from '../types';
import { groupsApi, postsApi, describeApiError, messageOf, getProfile, mediaUrl } from '../api/gateway';
import { defaultAvatar, postDtoToPost, withHandle } from '../api/mappers';
import { usePersistentState } from './usePersistentState';
import { type ToastSeverity } from './useToast';
import type { PostTarget } from './useFeed';

/** What the communities need from the feed: post into a community, show its posts, delete a post. */
export interface GroupFeedDeps {
  /** The one path that writes a post and links it to a community (M9). */
  createPostIn: (target: PostTarget, content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', extra?: any) => Promise<Post>;
  setGroupFeed: (groupId: string, posts: Post[]) => void;
  deletePost: (postId: string) => Promise<void>;
  /** Show my new post at the top of the home feed (and my profile), with its community link. */
  addToFeed: (post: Post) => void;
}

interface Deps {
  myUserId: MutableRefObject<string>;
  showToast: (message: string, severity?: ToastSeverity) => void;
  feed: GroupFeedDeps;
}

export interface NewGroup {
  name: string;
  description: string;
  privacy: 'public' | 'private';
  /** Uploaded cover image url (root-relative, as stored). Optional. */
  coverImage?: string;
  /** Uploaded avatar url (root-relative, as stored). Optional. */
  avatar?: string;
}

/** A member of a community, with the profile resolved. */
export interface GroupMember {
  id: string;
  userId: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
}

const timeOf = (iso: string | null | undefined) => {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Groups (M6, M5): the real Groups module. Loads groups + their memberships (member
 * counts and whether I've joined), creates communities (the creator becomes a member),
 * joins/leaves through group-members, and lists a community's posts (through the Posts
 * module's post-feed rows) and its members. The member's userId is not JWT-bound on this
 * v0 module, so we pass my id.
 */
export function useGroups({ myUserId, showToast, feed }: Deps) {
  const [groups, setGroups] = usePersistentState<Group[]>('nexus_groups', () => []);
  // Maps a groupId -> this user's group-member id, so leaving a group can DELETE it.
  const myGroupMemberIds = useRef<Map<string, string>>(new Map());
  // Maps a groupId -> my role in it ('owner' for the creator). A community has no owner
  // field of its own, so ownership is read from the creator's membership.
  const [myRoleByGroup, setMyRoleByGroup] = useState<Map<string, string>>(() => new Map());
  // True until the first list load settles (success or failure), so the tab can show a skeleton.
  const [loading, setLoading] = useState(true);
  // Members per community id, filled when its Members tab is opened.
  const [membersByGroup, setMembersByGroup] = useState<Record<string, GroupMember[]>>({});
  // True while a community's posts are being read.
  const [groupPostsLoading, setGroupPostsLoading] = useState(false);

  const loadGroups = async () => {
    try {
      await fetchGroups();
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    const [{ data: groupList }, { data: members }] = await Promise.all([
      groupsApi.GET('/api/groups'),
      groupsApi.GET('/api/group-members'),
    ]);
    if (!groupList) return;
    const myId = myUserId.current;
    const memberCounts = new Map<string, number>();
    const myRoles = new Map<string, string>();
    myGroupMemberIds.current.clear();
    for (const m of members ?? []) {
      memberCounts.set(m.groupId, (memberCounts.get(m.groupId) ?? 0) + 1);
      if (m.userId === myId) {
        myGroupMemberIds.current.set(m.groupId, m.id);
        myRoles.set(m.groupId, m.role);
      }
    }
    setMyRoleByGroup(myRoles);
    setGroups(
      groupList.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description ?? '',
        category: g.privacyType ? g.privacyType[0].toUpperCase() + g.privacyType.slice(1) : 'Community',
        memberCount: memberCounts.get(g.id) ?? 0,
        joined: myGroupMemberIds.current.has(g.id),
        coverUrl: mediaUrl(g.coverImage) ?? mediaUrl(g.avatar) ?? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
        coverImage: mediaUrl(g.coverImage),
        privacy: g.privacyType,
      })),
    );
  };

  // Create the community, then make its creator the owner member. Rejects with a readable
  // message so the dialog stays open. Reloads the list on success.
  const createGroup = async (input: NewGroup): Promise<void> => {
    const myId = myUserId.current;
    if (!myId) throw new Error('Your session is still loading. Try again in a moment.');
    const { data: group, error, response } = await groupsApi.POST('/api/groups', {
      body: {
        name: input.name.trim(),
        description: input.description.trim() || null,
        avatar: input.avatar || null,
        coverImage: input.coverImage || null,
        privacyType: input.privacy,
        approvalRequired: false,
      },
    });
    if (!group || !response.ok) throw new Error(describeApiError(error, response, 'The community was not created'));

    const join = await groupsApi.POST('/api/group-members', {
      body: { groupId: group.id, userId: myId, role: 'owner' },
    });
    if (!join.response.ok) {
      await loadGroups().catch(() => {});
      throw new Error(describeApiError(join.error, join.response, 'The community was created but you could not join it'));
    }
    if (join.data) myGroupMemberIds.current.set(group.id, join.data.id);
    await loadGroups();
  };

  // Join or leave. Optimistic; reverts and reports on failure. Resolves true when the
  // membership changed on the server.
  const toggleJoinGroup = async (groupId: string): Promise<boolean> => {
    const group = groups.find((g) => g.id === groupId);
    const wasJoined = group?.joined ?? false;
    const memberId = myGroupMemberIds.current.get(groupId);
    // Optimistic flip of joined + member count.
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, joined: !wasJoined, memberCount: Math.max(0, g.memberCount + (wasJoined ? -1 : 1)) }
          : g,
      ),
    );
    const revert = () => setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, joined: wasJoined, memberCount: Math.max(0, g.memberCount + (wasJoined ? 1 : -1)) }
          : g,
      ),
    );
    try {
      if (wasJoined) {
        if (memberId) {
          const { error, response } = await groupsApi.DELETE('/api/group-members/{id}', { params: { path: { id: memberId } } });
          if (!response.ok) throw new Error(describeApiError(error, response, 'Could not leave the community'));
        }
        myGroupMemberIds.current.delete(groupId);
      } else {
        const { data, error, response } = await groupsApi.POST('/api/group-members', {
          body: { groupId, userId: myUserId.current, role: 'member' },
        });
        if (!response.ok) throw new Error(describeApiError(error, response, 'Could not join the community'));
        if (data) myGroupMemberIds.current.set(groupId, data.id);
      }
      return true;
    } catch (err) {
      revert();
      showToast(messageOf(err, 'The community was not updated'));
      return false;
    }
  };

  // Delete a community I own. On success it leaves the list and my own membership row is
  // removed best-effort. Rejects with a readable message so the dialog stays open.
  const deleteGroup = async (groupId: string): Promise<void> => {
    const { error, response } = await groupsApi.DELETE('/api/groups/{id}', { params: { path: { id: groupId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The community was not deleted'));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setMyRoleByGroup((prev) => {
      const next = new Map(prev);
      next.delete(groupId);
      return next;
    });
    const memberId = myGroupMemberIds.current.get(groupId);
    myGroupMemberIds.current.delete(groupId);
    if (memberId) {
      groupsApi.DELETE('/api/group-members/{id}', { params: { path: { id: memberId } } }).catch(() => {});
    }
  };

  // The posts of one community: the Posts module's post-feed rows with feedType 'group' and this
  // targetId, resolved to posts (authors through Profile), newest first. Errors are reported
  // with a toast; the list keeps what it had.
  const loadGroupPosts = async (groupId: string): Promise<void> => {
    setGroupPostsLoading(true);
    try {
      const [{ data: feeds }, { data: postList }] = await Promise.all([
        postsApi.GET('/api/post-feeds'),
        postsApi.GET('/api/posts'),
      ]);
      if (!feeds || !postList) throw new Error('The community posts could not be loaded');
      const postIds = new Set(feeds.filter((f) => f.feedType === 'group' && f.targetId === groupId).map((f) => f.postId));
      const mine = postList
        .filter((p) => postIds.has(p.id))
        .sort((a, b) => timeOf(b.publishedAt) - timeOf(a.publishedAt));
      const authorIds = [...new Set(mine.map((p) => p.authorId))];
      const profiles = await Promise.all(authorIds.map((id) => getProfile(id).catch(() => null)));
      const profileById = new Map(authorIds.map((id, i) => [id, profiles[i]]));
      feed.setGroupFeed(groupId, mine.map((p) => postDtoToPost(p, profileById.get(p.authorId) ?? null)));
    } catch (err) {
      showToast(messageOf(err, 'The community posts could not be loaded'));
    } finally {
      setGroupPostsLoading(false);
    }
  };

  // Post inside a community: the write and the community link are done by createPostIn (M9),
  // then the community's posts are re-read. Rejects with a readable message; the composer keeps
  // the text.
  const createGroupPost = async (
    groupId: string,
    content: string,
    type: 'text' | 'link' | 'image' | 'video' | 'poll' = 'text',
    extra?: any,
  ): Promise<void> => {
    const groupName = groups.find((g) => g.id === groupId)?.name ?? 'Community';
    await feed.createPostIn({ kind: 'group', id: groupId, name: groupName }, content, type, extra);
    await loadGroupPosts(groupId);
  };

  // The members of one community, owners first, with profiles resolved. The owner row is
  // what the Owner label is read from.
  const loadMembers = async (groupId: string): Promise<void> => {
    try {
      const { data, error, response } = await groupsApi.GET('/api/group-members');
      if (!data) throw new Error(describeApiError(error, response, 'The members could not be loaded'));
      const rows = data
        .filter((m) => m.groupId === groupId)
        .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner'));
      const userIds = [...new Set(rows.map((m) => m.userId))];
      const profiles = await Promise.all(userIds.map((id) => getProfile(id).catch(() => null)));
      const profileById = new Map(userIds.map((id, i) => [id, profiles[i]]));
      const members: GroupMember[] = rows.map((m) => {
        const p = profileById.get(m.userId);
        return {
          id: m.id,
          userId: m.userId,
          name: p?.displayName || 'Member',
          handle: withHandle(p?.handle),
          avatar: mediaUrl(p?.avatarUrl) ?? defaultAvatar(m.userId),
          role: m.role,
        };
      });
      setMembersByGroup((prev) => ({ ...prev, [groupId]: members }));
    } catch (err) {
      showToast(messageOf(err, 'The members could not be loaded'));
    }
  };

  // Owner moderation (M10): take a post out of this community. Only the post-feed rows that
  // link THIS post to THIS community are deleted; the post itself stays on its author's profile
  // and on Home (never DELETE /api/posts). The server does not check that the caller owns the
  // community yet (B3/B13), so the control is shown to the owner only (GroupsTab), and the
  // server's answer decides here. Rejects with the server's reason; the list is re-read after
  // any row was removed, so it always shows what the server holds.
  const removePostFromGroup = async (groupId: string, postId: string): Promise<void> => {
    const { data: feeds, error, response } = await postsApi.GET('/api/post-feeds');
    if (!feeds) throw new Error(describeApiError(error, response, 'The post could not be removed from the community'));
    const links = feeds.filter((f) => f.feedType === 'group' && f.targetId === groupId && f.postId === postId);
    let removed = 0;
    let failure: string | null = null;
    for (const link of links) {
      const res = await postsApi.DELETE('/api/post-feeds/{id}', { params: { path: { id: link.id } } });
      if (!res.response.ok) {
        failure = describeApiError(res.error, res.response, 'The post was not removed from the community');
        break;
      }
      removed += 1;
    }
    if (failure && removed === 0) throw new Error(failure);
    await loadGroupPosts(groupId);
    if (failure) throw new Error(failure);
  };

  // Owner moderation (M10): remove a member row from this community. The owner row cannot be
  // removed. The member list and the member count change only after the server's 2xx. The
  // server does not check ownership yet (B13); the control is shown to the owner only.
  const removeMember = async (groupId: string, memberRowId: string): Promise<void> => {
    const member = (membersByGroup[groupId] ?? []).find((m) => m.id === memberRowId);
    if (member?.role === 'owner') throw new Error('The owner cannot be removed from the community.');
    const { error, response } = await groupsApi.DELETE('/api/group-members/{id}', { params: { path: { id: memberRowId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The member was not removed'));
    setMembersByGroup((prev) => (prev[groupId]
      ? { ...prev, [groupId]: prev[groupId].filter((m) => m.id !== memberRowId) }
      : prev));
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g)));
  };

  // Forget the previous account's memberships, roles and community data (used when the signed-in user changes).
  const reset = () => {
    myGroupMemberIds.current.clear();
    setMyRoleByGroup(new Map());
    setMembersByGroup({});
    setGroups([]);
  };

  return {
    groups,
    loading,
    loadGroups,
    toggleJoinGroup,
    createGroup,
    deleteGroup,
    myRoleByGroup,
    reset,
    loadGroupPosts,
    groupPostsLoading,
    createGroupPost,
    removePostFromGroup,
    loadMembers,
    membersByGroup,
    removeMember,
  };
}
