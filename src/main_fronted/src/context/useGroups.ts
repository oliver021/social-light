import { useRef, type MutableRefObject } from 'react';
import { Group } from '../types';
import { groupsApi } from '../api/gateway';
import { usePersistentState } from './usePersistentState';

interface Deps {
  myUserId: MutableRefObject<string>;
}

/**
 * Groups (M6): the real Groups module. Loads groups + their memberships (member
 * counts and whether I've joined), and joins/leaves through group-members (userId
 * is not JWT-bound on this v0 module, so we pass my id).
 */
export function useGroups({ myUserId }: Deps) {
  const [groups, setGroups] = usePersistentState<Group[]>('nexus_groups', () => []);
  // Maps a groupId -> this user's group-member id, so leaving a group can DELETE it.
  const myGroupMemberIds = useRef<Map<string, string>>(new Map());

  const loadGroups = async () => {
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

  const toggleJoinGroup = (groupId: string) => {
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
    (async () => {
      try {
        if (wasJoined) {
          if (memberId) await groupsApi.DELETE('/api/group-members/{id}', { params: { path: { id: memberId } } });
          myGroupMemberIds.current.delete(groupId);
        } else {
          const { data } = await groupsApi.POST('/api/group-members', {
            body: { groupId, userId: myUserId.current, role: 'member' },
          });
          if (data) myGroupMemberIds.current.set(groupId, data.id);
        }
      } catch {
        // Revert on failure.
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, joined: wasJoined, memberCount: Math.max(0, g.memberCount + (wasJoined ? 1 : -1)) }
              : g,
          ),
        );
      }
    })();
  };

  return { groups, loadGroups, toggleJoinGroup };
}
