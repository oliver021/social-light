import { useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { UserProfile } from '../types';
import { profileApi, socialGraphApi } from '../api/gateway';

/** A discoverable person (a real backend profile) + this user's follow state for them. */
export interface Person {
  userId: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followed: boolean;
  followId?: string; // the FollowDto id, kept so an unfollow can DELETE it
}

interface Deps {
  myUserId: MutableRefObject<string>;
  setCurrentUser: Dispatch<SetStateAction<UserProfile>>;
  /** Refresh the home feed after a follow/unfollow so the author's posts fan in/out. */
  loadFeed: () => Promise<void>;
  notify: (recipientId: string | undefined, type: string, entityType: string, entityId: string) => void;
}

/**
 * Social graph (M3/M4): the people-to-discover list (from Profile's discovery
 * endpoint), this user's follow edges (from the SocialGraph module), and the real
 * follower/following counts folded back onto the current user's profile.
 */
export function useSocial({ myUserId, setCurrentUser, loadFeed, notify }: Deps) {
  const [people, setPeople] = useState<Person[]>([]);

  // The social graph has no user directory, so people to follow come from Profile's
  // discovery list; cross-reference my follows to mark who I already follow (and
  // remember each FollowDto id for unfollow).
  const loadPeople = async () => {
    const [{ data: profiles }, { data: follows }] = await Promise.all([
      profileApi.GET('/api/profiles'),
      socialGraphApi.GET('/api/follows'),
    ]);
    if (!profiles) return;
    const myId = myUserId.current;
    const allFollows = follows ?? [];
    const myFollows = allFollows.filter((f) => f.followerId === myId);
    const followByTarget = new Map(myFollows.map((f) => [f.followingId, f.id]));

    // Back the profile's social counts with real graph data (M4): how many I follow
    // and how many follow me. Replaces the last mock numbers on the Profile tab.
    const followerCount = allFollows.filter((f) => f.followingId === myId).length;
    setCurrentUser((prev) => ({ ...prev, followingCount: myFollows.length, followersCount: followerCount }));
    setPeople(
      profiles.map((p) => ({
        userId: p.userId,
        name: p.displayName || 'Unknown User',
        handle: p.handle ? (p.handle.startsWith('@') ? p.handle : `@${p.handle}`) : `@${p.userId.slice(0, 8)}`,
        avatar: p.avatarUrl ?? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(p.userId)}`,
        bio: p.bio ?? '',
        followed: followByTarget.has(p.userId),
        followId: followByTarget.get(p.userId),
      })),
    );
  };

  // Create the edge (followerId from my id; the v0 social-graph module doesn't bind
  // it from the JWT yet), flip optimistic state, then refresh the feed.
  const followUser = (userId: string) => {
    setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: true } : p)));
    (async () => {
      try {
        const { data } = await socialGraphApi.POST('/api/follows', {
          body: {
            followerId: myUserId.current,
            followingId: userId,
            status: 'active',
            createdAt: new Date().toISOString(),
          },
        });
        if (data) setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followId: data.id } : p)));
        notify(userId, 'follow', 'User', myUserId.current); // tell them I followed
        await loadFeed();
        loadPeople().catch(() => {}); // refresh real following/follower counts
      } catch {
        setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: false } : p)));
      }
    })();
  };

  const unfollowUser = (userId: string) => {
    const followId = people.find((p) => p.userId === userId)?.followId;
    setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: false, followId: undefined } : p)));
    (async () => {
      try {
        if (followId) await socialGraphApi.DELETE('/api/follows/{id}', { params: { path: { id: followId } } });
        await loadFeed();
        loadPeople().catch(() => {}); // refresh real following/follower counts
      } catch {
        setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: true, followId } : p)));
      }
    })();
  };

  return { people, loadPeople, followUser, unfollowUser };
}
