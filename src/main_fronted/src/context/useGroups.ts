import { useRef, useState, type MutableRefObject } from 'react';
import { Group } from '../types';
import { groupsApi, describeApiError, messageOf } from '../api/gateway';
import { usePersistentState } from './usePersistentState';
import { type ToastSeverity } from './useToast';

interface Deps {
  myUserId: MutableRefObject<string>;
  showToast: (message: string, severity?: ToastSeverity) => void;
}

export interface NewGroup {
  name: string;
  description: string;
  privacy: 'public' | 'private';
}

/**
 * Groups (M6): the real Groups module. Loads groups + their memberships (member
 * counts and whether I've joined), creates communities (the creator becomes a member),
 * and joins/leaves through group-members (userId is not JWT-bound on this v0 module,
 * so we pass my id).
 */
export function useGroups({ myUserId, showToast }: Deps) {
  const [groups, setGroups] = usePersistentState<Group[]>('nexus_groups', () => []);
  // Maps a groupId -> this user's group-member id, so leaving a group can DELETE it.
  const myGroupMemberIds = useRef<Map<string, string>>(new Map());
  // True until the first list load settles (success or failure), so the tab can show a skeleton.
  const [loading, setLoading] = useState(true);

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
    myGroupMemberIds.current.clear();
    for (const m of members ?? []) {
      memberCounts.set(m.groupId, (memberCounts.get(m.groupId) ?? 0) + 1);
      if (m.userId === myId) myGroupMemberIds.current.set(m.groupId, m.id);
    }
    setGroups(
      groupList.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description ?? '',
        category: g.privacyType ? g.privacyType[0].toUpperCase() + g.privacyType.slice(1) : 'Community',
        memberCount: memberCounts.get(g.id) ?? 0,
        joined: myGroupMemberIds.current.has(g.id),
        coverUrl: g.coverImage ?? g.avatar ?? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
      })),
    );
  };

  // Create the community, then make its creator a member. Rejects with a readable message
  // so the dialog stays open. Reloads the list on success.
  const createGroup = async (input: NewGroup): Promise<void> => {
    const myId = myUserId.current;
    if (!myId) throw new Error('Your session is still loading. Try again in a moment.');
    const { data: group, error, response } = await groupsApi.POST('/api/groups', {
      body: {
        name: input.name.trim(),
        description: input.description.trim() || null,
        avatar: null,
        coverImage: null,
        privacyType: input.privacy,
        approvalRequired: false,
      },
    });
    if (!group || !response.ok) throw new Error(describeApiError(error, response, 'The community was not created'));

    const join = await groupsApi.POST('/api/group-members', {
      body: { groupId: group.id, userId: myId, role: 'member' },
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

  // Forget the previous account's memberships (used when the signed-in user changes).
  const reset = () => {
    myGroupMemberIds.current.clear();
    setGroups([]);
  };

  return { groups, loading, loadGroups, toggleJoinGroup, createGroup, reset };
}
