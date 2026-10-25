import { useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { UserProfile } from '../types';
import { profileApi, socialGraphApi, describeApiError, messageOf, mediaUrl } from '../api/gateway';
import type { components as SocialGraphComponents } from '@sdk/social-graph';
import { withHandle, defaultAvatar } from '../api/mappers';
import { type ToastSeverity } from './useToast';

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
  showToast: (message: string, severity?: ToastSeverity) => void;
}

type FollowDto = SocialGraphComponents['schemas']['FollowDto'];

/** Follower and following counts for one person, from the follow list. */
export interface FollowCounts {
  followers: number;
  following: number;
}

/**
 * Social graph (M3/M4): the people-to-discover list (from Profile's discovery
 * endpoint), this user's follow edges (from the SocialGraph module), and the real
 * follower/following counts folded back onto the current user's profile.
 */
export function useSocial({ myUserId, setCurrentUser, loadFeed, notify, showToast }: Deps) {
  const [people, setPeople] = useState<Person[]>([]);
  // True until the first people load settles, so the widget can show a skeleton.
  const [peopleLoading, setPeopleLoading] = useState(true);
  // Every follow edge the signed-in user can read (mine in and out), from the SocialGraph module.
  const [follows, setFollows] = useState<FollowDto[]>([]);

  // The social graph has no user directory, so people to follow come from Profile's
  // discovery list; cross-reference my follows to mark who I already follow (and
  // remember each FollowDto id for unfollow).
  const loadPeople = async () => {
    try {
      const [{ data: profiles }, { data: followList }] = await Promise.all([
        profileApi.GET('/api/profiles'),
        socialGraphApi.GET('/api/follows'),
      ]);
      if (!profiles) return;
      const myId = myUserId.current;
      const allFollows = followList ?? [];
      setFollows(allFollows);
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
          handle: withHandle(p.handle),
          avatar: mediaUrl(p.avatarUrl) ?? defaultAvatar(p.userId),
          bio: p.bio ?? '',
          followed: followByTarget.has(p.userId),
          followId: followByTarget.get(p.userId),
        })),
      );
    } finally {
      setPeopleLoading(false);
    }
  };

  // Create the edge (followerId from my id; the v0 social-graph module doesn't bind
  // it from the JWT yet), flip optimistic state, then refresh the feed. A failed call
  // reverts the button and says why.
  const followUser = (userId: string) => {
    setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: true } : p)));
    (async () => {
      try {
        const { data, error, response } = await socialGraphApi.POST('/api/follows', {
          body: {
            followerId: myUserId.current,
            followingId: userId,
            status: 'active',
            createdAt: new Date().toISOString(),
          },
        });
        if (!response.ok || !data) throw new Error(describeApiError(error, response, 'Could not follow this person'));
        setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followId: data.id } : p)));
        setFollows((prev) => [...prev.filter((f) => f.id !== data.id), data]);
        notify(userId, 'follow', 'User', myUserId.current); // tell them I followed
        await loadFeed();
        loadPeople().catch(() => {}); // refresh real following/follower counts
      } catch (err) {
        setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: false } : p)));
        showToast(messageOf(err, 'Could not follow this person'));
      }
    })();
  };

  const unfollowUser = (userId: string) => {
    const followId = people.find((p) => p.userId === userId)?.followId;
    setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: false, followId: undefined } : p)));
    (async () => {
      try {
        if (followId) {
          const { error, response } = await socialGraphApi.DELETE('/api/follows/{id}', { params: { path: { id: followId } } });
          if (!response.ok) throw new Error(describeApiError(error, response, 'Could not unfollow this person'));
          setFollows((prev) => prev.filter((f) => f.id !== followId));
        }
        await loadFeed();
        loadPeople().catch(() => {}); // refresh real following/follower counts
      } catch (err) {
        setPeople((prev) => prev.map((p) => (p.userId === userId ? { ...p, followed: true, followId } : p)));
        showToast(messageOf(err, 'Could not unfollow this person'));
      }
    })();
  };

  /** Follower and following counts for any person, from the follow list I loaded. */
  const countsFor = (userId: string): FollowCounts => ({
    followers: follows.filter((f) => f.followingId === userId).length,
    following: follows.filter((f) => f.followerId === userId).length,
  });

  /** Whether the signed-in user follows this person (the optimistic people list wins when present). */
  const isFollowing = (userId: string): boolean => {
    const listed = people.find((p) => p.userId === userId);
    if (listed) return listed.followed;
    return follows.some((f) => f.followerId === myUserId.current && f.followingId === userId);
  };

  // Forget the previous account's follow edges (used when the signed-in user changes).
  const reset = () => {
    setPeople([]);
    setFollows([]);
  };

  return { people, peopleLoading, loadPeople, followUser, unfollowUser, countsFor, isFollowing, reset };
}
