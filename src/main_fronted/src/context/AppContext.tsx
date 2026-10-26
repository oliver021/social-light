import React, { createContext, useContext, useMemo } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { UserProfile, Post, Group, MarketItem, NotificationItem, Reactions, ChatMessage, ChatBoxState, ChatThread } from '../types';
import { INITIAL_USER } from '../data';
import { messageOf } from '../api/gateway';
import { type ActiveTab, useUiPreferences } from './useUiPreferences';
import { useSessionState } from './session';
import { useToast, type ToastSeverity } from './useToast';
import { useNotifications } from './useNotifications';
import { useFeed, type ProfileTimeline } from './useFeed';
import { useSocial, type Person, type FollowCounts } from './useSocial';
import { useGroups, type NewGroup } from './useGroups';
import { useOrganizations, type NewOrganization, type Organization, type OrganizationMember } from './useOrganizations';
import { useMarketplace, type CatalogOption, type MarketDetail, type MarketQuery } from './useMarketplace';
import { useProfile } from './useProfile';
import { useChat, type ChatMeta } from './useChat';
import { type MessageReactionType, type MuteChoice } from './chatRules';
import { useStories, groupStoriesByAuthor, type Story, type StoryGroup, type StoryReply } from './useStories';
import { useReels, type Reel } from './useReels';
import { useEvents, isEventFull, type EventItem, type RsvpStatus, type Attendee } from './useEvents';
import { type GroupMember } from './useGroups';
import { useAuth } from './useAuth';
import {
  useRelationships,
  visiblePosts,
  withoutBlocked,
  type BlockedEntry,
  type HiddenPostEntry,
  type IncomingRequest,
  type MutedEntry,
  type PersonView,
  type Relation,
} from './useRelationships';
import { clearUserScopedStorage } from './usePersistentState';

// Re-exported for any consumer that wants these view shapes.
export type { Person, Story, StoryGroup, StoryReply, Reel, EventItem, RsvpStatus, Attendee, GroupMember, IncomingRequest, BlockedEntry, HiddenPostEntry, MutedEntry, PersonView, Relation };
export { groupStoriesByAuthor, isEventFull };

/**
 * The app's single seam: components only ever call `useApp()`. The implementation
 * behind it is split into per-domain hooks (auth/session, feed+engagement, social,
 * groups, notifications, marketplace, chat, …) so each backend module maps to one
 * focused file; this Provider is just the composition root that wires them together
 * with explicit dependencies and assembles the context value. The shape below is the
 * public contract — keep it stable.
 */
export interface AppContextType {
  currentUser: UserProfile;
  posts: Post[];
  groups: Group[];
  marketItems: MarketItem[];
  marketCategories: string[];
  /** True until the first catalog load settles. Optional: absent means settled. */
  marketplaceLoading?: boolean;
  /** Catalog types and brands for the chips and the brand select. */
  marketTypes: CatalogOption[];
  marketBrands: CatalogOption[];
  /** Current search / filter state; changing it reloads page 0 from the server. */
  marketQuery: MarketQuery;
  setMarketQuery: (partial: Partial<MarketQuery>) => void;
  marketTotal: number;
  /** "{total} products", or "Showing n of the loaded items" when a filter runs on the loaded page. */
  marketCountLabel: string;
  /** Set when a filter runs on the results (brand on a text search). */
  marketNote: string | null;
  marketHasMore: boolean;
  marketLoadingMore: boolean;
  loadMoreMarket: () => Promise<void>;
  /** Readable message for the last failed catalog request, or null. */
  marketError: string | null;
  retryMarketplace: () => Promise<void>;
  /** First 5 products whose name starts with the text (navbar search). Rejects on failure. */
  searchMarketItems: (text: string) => Promise<MarketItem[]>;
  /** The product whose detail dialog is open, or null. */
  marketSelectedId: string | null;
  openMarketItem: (id: string) => void;
  closeMarketItem: () => void;
  marketDetail: MarketDetail | null;
  marketDetailLoading: boolean;
  marketDetailError: string | null;
  notifications: NotificationItem[];
  activeTab: ActiveTab;
  /** Selecting a tab shows my own profile on the Profile tab. */
  setActiveTab: (tab: ActiveTab) => void;
  /** The profile being viewed on the Profile tab; null means my own profile. */
  viewedProfileId: string | null;
  /** Opens a person's profile (my own id opens my profile). Not persisted. */
  openProfile: (userId: string) => void;
  /** Closes a profile opened from elsewhere and returns to the tab it came from. */
  closeProfile: () => void;
  /** The posts of one user (for a profile). Null until one is loaded. */
  timeline: ProfileTimeline | null;
  /** Loads one user's posts from Feed.API (GET /api/feed/user/{userId}). */
  loadTimeline: (userId: string) => Promise<void>;
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isAuthenticated: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  addPost: (content: string, type: 'text' | 'link' | 'image' | 'video' | 'poll', extraData?: any) => void;
  reactToPost: (postId: string, reactionType: keyof Reactions) => void;
  /** Shares a post, optionally with a message. Resolves after the server accepts it; rejects with a readable message. */
  sharePost: (postId: string, commentary?: string) => Promise<void>;
  votePoll: (postId: string, optionId: string) => void;
  /** Rejects with a readable message when the comment is not saved. A reply passes the id of the comment it answers. */
  addComment: (postId: string, content: string, parentCommentId?: string | null) => Promise<void>;
  /** Likes or unlikes a comment. Rolls back and shows a toast on failure. */
  toggleCommentLike: (postId: string, commentId: string) => Promise<void>;
  /** Deletes my post. Rejects with a readable message when the server does not delete it. */
  deletePost: (postId: string) => Promise<void>;
  /** Deletes my comment on a post. Rejects with a readable message. */
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  /** Resolves true when the membership changed on the server. */
  toggleJoinGroup: (groupId: string) => Promise<boolean>;
  /** Creates a community and makes the creator a member. Rejects with a readable message. */
  createGroup: (input: NewGroup) => Promise<void>;
  /** Opens a community's page on the Communities tab. */
  openGroup: (groupId: string) => void;
  /** The posts of the community being viewed (newest first). Empty for any other community. */
  groupPosts: Post[];
  /** True while the open community's posts are being read. */
  groupPostsLoading?: boolean;
  /** Reads a community's posts through its post-feed rows. */
  loadGroupPosts: (groupId: string) => Promise<void>;
  /** Posts inside a community; only members can. Rejects with a readable message; the composer keeps the text. */
  createGroupPost: (groupId: string, content: string, type?: 'text' | 'link' | 'image' | 'video' | 'poll', extra?: any) => Promise<void>;
  /** Members per community id, filled by loadMembers. */
  groupMembers: Record<string, GroupMember[]>;
  /** Reads a community's members with their roles. */
  loadMembers: (groupId: string) => Promise<void>;
  /** Deletes a community I own. Rejects with a readable message. */
  deleteGroup: (groupId: string) => Promise<void>;
  /** My role per community id ('owner' for a community I created). Absent means not a member. */
  myRoleByGroup: ReadonlyMap<string, string>;
  /** True until the first groups load settles. Optional: absent means settled. */
  groupsLoading?: boolean;
  buyMarketItem: (itemId: string) => void;
  createMarketItem: (title: string, description: string, price: number, category: string, location: string, imageUrl: string) => void;
  /** Rejects with a readable message when the server does not accept the change. */
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  /** Show a transient message (errors, confirmed saves). */
  showToast: (message: string, severity?: ToastSeverity) => void;
  // Social graph (M3): real people to discover + follow, backed by Profile + SocialGraph.
  people: Person[];
  /** True until the first people load settles. Optional: absent means settled. */
  peopleLoading?: boolean;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  /** Follower and following counts for any person, from the follow list. */
  countsFor: (userId: string) => FollowCounts;
  /** Whether the signed-in user follows this person. */
  isFollowing: (userId: string) => boolean;

  // Social graph (M4): friends, blocks and preferences. Each operation resolves true after the
  // server accepts it; on failure it shows the server's reason and resolves false.
  /** How I stand with this person: none, requested (I sent), incoming (they sent), or friends. */
  relationTo: (userId: string) => Relation;
  /** My friend count (other people's friend lists are not readable, so none is shown for them). */
  friendCount: number;
  /** Pending requests sent to me. People I blocked are left out. */
  incomingRequests: IncomingRequest[];
  /** Name, avatar and handle of a person, from their cached profile, with placeholders until loaded. */
  personView: (userId: string) => PersonView;
  sendFriendRequest: (userId: string) => Promise<boolean>;
  acceptFriend: (userId: string) => Promise<boolean>;
  declineFriend: (userId: string) => Promise<boolean>;
  cancelFriendRequest: (userId: string) => Promise<boolean>;
  unfriend: (userId: string) => Promise<boolean>;
  /** Blocks a person. In my views their posts, comments, stories, reels, chats and people rows disappear. */
  blockUser: (userId: string, reason?: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  isBlocked: (userId: string) => boolean;
  blockedUsers: BlockedEntry[];
  /** Hides one post from my home feed, with an Undo action. */
  hidePost: (postId: string) => Promise<boolean>;
  /** Posts I hid (home feed only), each with the preference id that Show again removes. */
  hiddenPosts: HiddenPostEntry[];
  /** Hides a person's posts and stories from my home feed and stories bar for 30 days. */
  snoozeUser: (userId: string) => Promise<boolean>;
  /** Hides a person's posts and stories from my home feed and stories bar until I unmute them. */
  muteUser: (userId: string) => Promise<boolean>;
  isMuted: (userId: string) => boolean;
  mutedUsers: MutedEntry[];
  /** Removes a hide, snooze or mute (Undo, Unmute, Privacy settings). */
  removePreference: (preferenceId: string) => Promise<boolean>;
  markNotificationsAsRead: () => void;
  /** Dismisses one notification (no confirm). Reports a failure with a toast. */
  dismissNotification: (id: string) => Promise<void>;
  /** Dismisses every listed notification. Failed ones stay listed, with a toast. */
  clearNotifications: () => Promise<void>;
  /** True until the first notifications load settles. Optional: absent means settled. */
  notificationsLoading?: boolean;
  addNotification: (type: NotificationItem['type'], actorName: string, text: string, postId?: string) => void;

  // Messenger system states & methods
  activeChats: ChatBoxState[];
  chatMessages: Record<string, ChatMessage[]>;
  chatThreads: ChatThread[];
  /** True until the conversation list settles. Optional: absent means settled. */
  chatThreadsLoading?: boolean;
  /** Chat-level read state: receipts, reactions, pins and mutes (refreshed, not pushed). */
  chatMeta: ChatMeta;
  /** Display names of the people in my chats, by user id (group senders). */
  memberNames: Record<string, string>;
  isChatMuted: (chatId: string) => boolean;
  openChatWithUser: (user: { id: string; name: string; avatar: string; handle: string }) => void;
  /** Opens a conversation I already belong to, by chat id (groups and listed DMs). */
  openChat: (chatId: string) => void;
  /** Closes a window by chat id, or by a DM peer's user id. */
  closeChat: (key: string) => void;
  minimizeChat: (chatId: string) => void;
  /** Rejects with a readable message when the message could not be sent (text is kept by the caller). */
  sendMessage: (chatId: string, text: string) => Promise<void>;
  /** Uploads an image and sends it. Rejects with a readable message. */
  sendImage: (chatId: string, file: File, onProgress?: (percent: number) => void) => Promise<void>;
  reactToMessage: (messageId: string, reactionType: MessageReactionType) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  unpinMessage: (chatId: string) => Promise<void>;
  muteChat: (chatId: string, choice: MuteChoice) => Promise<void>;
  unmuteChat: (chatId: string) => Promise<void>;
  /** Creates a group with me as owner. Members that could not be added are returned; the group is kept. */
  createGroupChat: (title: string, memberIds: string[]) => Promise<{ chatId: string; failedUserIds: string[] }>;
  /** Chat-level block for a DM, written after the person-level block succeeded. */
  blockInChat: (chatId: string, blockedId: string) => Promise<void>;
  /** Re-reads read state and marks open, visible windows as read. */
  markOpenChatsRead: () => void;

  // Generated modules (Stories / Reels / Events): real CRUD over the gateway.
  stories: Story[];
  /** Shares a story. Rejects with a readable message so the dialog can stay open. */
  addStory: (mediaUrl: string, caption: string, mediaType?: 'image' | 'video') => Promise<void>;
  viewStory: (storyId: string) => void;
  /** Deletes my story. Rejects with a readable message. */
  deleteStory: (storyId: string) => Promise<void>;
  /** Replies to a story. Rejects with "Your reply was not sent" (plus the reason). */
  replyToStory: (storyId: string, body: string) => Promise<void>;
  /** The replies to one story. Rejects with a readable message when they cannot be read. */
  loadReplies: (storyId: string) => Promise<StoryReply[]>;
  reels: Reel[];
  /** True until the first reels load settles. Optional: absent means settled. */
  reelsLoading?: boolean;
  addReel: (videoUrl: string, caption: string, duration: number) => Promise<void>;
  viewReel: (reelId: string) => void;
  /** Deletes my reel. Rejects with a readable message. */
  deleteReel: (reelId: string) => Promise<void>;
  events: EventItem[];
  /** True until the first events load settles. Optional: absent means settled. */
  eventsLoading?: boolean;
  /** Creates an event. Rejects with a readable message so the dialog can stay open. */
  createEvent: (title: string, description: string, location: string, startDate: string, endDate: string, capacity: number | null) => Promise<void>;
  /** Sets my answer (going, interested, not going), or clears it with null. Rolls back and toasts on failure. */
  setRsvp: (eventId: string, status: RsvpStatus | null) => Promise<void>;
  /** Cancels my event. Rejects with a readable message. */
  deleteEvent: (eventId: string) => Promise<void>;

  // Organizations (M8): browse, create, join, leave, delete and members, backed by Organizations.
  /** Every organization, with my membership and the member count. */
  organizations: Organization[];
  /** True until the first organizations load settles. Optional: absent means settled. */
  organizationsLoading?: boolean;
  /** Readable reason the last organizations load failed, or null. */
  organizationsError: string | null;
  loadOrganizations: () => Promise<void>;
  /** Creates an organization and makes me its owner. Rejects with a readable message so the dialog can stay open. */
  createOrganization: (input: NewOrganization) => Promise<void>;
  /** Joins as a member. Resolves true only after the server accepts it; otherwise shows the reason and resolves false. */
  joinOrganization: (organizationId: string) => Promise<boolean>;
  /** Leaves as a member (the owner cannot leave). Resolves true when the server removed my membership. */
  leaveOrganization: (organizationId: string) => Promise<boolean>;
  /** Deletes an organization I own. Rejects with a readable message. */
  deleteOrganization: (organizationId: string) => Promise<void>;
  /** Members per organization id, filled by loadOrganizationMembers. */
  organizationMembers: Record<string, OrganizationMember[]>;
  loadOrganizationMembers: (organizationId: string) => Promise<void>;
  /** The organizations a person is a member of. */
  organizationsOf: (userId: string) => Organization[];
  /** The organization whose page is open on the Organizations tab, or null for the list. */
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (id: string | null) => void;
  /** Opens an organization's page on the Organizations tab. */
  openOrganization: (organizationId: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hooks are composed top-down in dependency order: a hook is declared after every
  // hook whose output it consumes (notifications.notify → feed; feed.loadFeed → social;
  // every loader → auth's login/bootstrap orchestration).
  const ui = useUiPreferences();
  const session = useSessionState();
  const { toast, showToast, showActionToast, closeToast } = useToast();

  const notifications = useNotifications({ myUserId: session.myUserId, showToast });
  const feed = useFeed({
    myUserId: session.myUserId,
    currentUser: session.currentUser,
    notify: notifications.notify,
    showToast,
  });
  const social = useSocial({
    myUserId: session.myUserId,
    setCurrentUser: session.setCurrentUser,
    loadFeed: feed.loadFeed,
    notify: notifications.notify,
    showToast,
  });
  const groups = useGroups({
    myUserId: session.myUserId,
    showToast,
    feed: { createPostRaw: feed.createPostRaw, setGroupFeed: feed.setGroupFeed, deletePost: feed.deletePost },
  });

  const organizations = useOrganizations({ myUserId: session.myUserId, showToast });

  const chat = useChat({
    myUserId: session.myUserId,
    currentUserId: session.currentUser.id,
    isAuthenticated: session.isAuthenticated,
    showToast,
  });
  const marketplace = useMarketplace({ currentUser: session.currentUser, addNotification: notifications.addNotification });
  const profile = useProfile({ currentUser: session.currentUser, setCurrentUser: session.setCurrentUser });
  const storiesState = useStories({ myUserId: session.myUserId, notify: notifications.notify });
  const reelsState = useReels({ myUserId: session.myUserId });
  const eventsState = useEvents({ myUserId: session.myUserId, showToast });
  const relations = useRelationships({
    myUserId: session.myUserId,
    notify: notifications.notify,
    showToast,
    showActionToast,
    unfollowUser: social.unfollowUser,
    closeChat: chat.closeChat,
  });

  // What I see: the blocked, hidden and muted sets from the graph, applied to the lists below.
  const blockedSet = relations.blockedIds;
  const hiddenSet = relations.hiddenPostIds;
  const mutedSet = relations.mutedIds;
  const feedPosts = useMemo(
    () => visiblePosts(feed.posts, { blocked: blockedSet, hidden: hiddenSet, muted: mutedSet }, 'feed'),
    [feed.posts, blockedSet, hiddenSet, mutedSet],
  );
  const timelineView = useMemo(
    () => (feed.timeline ? { ...feed.timeline, posts: visiblePosts(feed.timeline.posts, { blocked: blockedSet }, 'profile') } : null),
    [feed.timeline, blockedSet],
  );
  const visiblePeople = useMemo(() => withoutBlocked(social.people, (p) => p.userId, blockedSet), [social.people, blockedSet]);
  // The community being viewed: its posts, filtered like the home feed.
  const openGroupPosts = feed.groupFeed && feed.groupFeed.groupId === ui.selectedGroupId ? feed.groupFeed.posts : [];
  const visibleGroupPosts = useMemo(
    () => visiblePosts(openGroupPosts, { blocked: blockedSet, hidden: hiddenSet, muted: mutedSet }, 'feed'),
    [openGroupPosts, blockedSet, hiddenSet, mutedSet],
  );
  const visibleStories = storiesState.stories.filter((s) => !blockedSet.has(s.authorId) && !mutedSet.has(s.authorId));
  const visibleReels = withoutBlocked(reelsState.reels, (r) => r.creatorId, blockedSet);
  const visibleThreads = withoutBlocked(chat.chatThreads, (t) => t.userId, blockedSet);
  const visibleChats = withoutBlocked(chat.activeChats, (c) => c.userId, blockedSet);

  // Everything cached for one account is dropped here: on logout, on a failed session
  // probe, and whenever the signed-in user is not the owner of the local cache.
  const resetUserData = (ownerId: string | null) => {
    clearUserScopedStorage();
    feed.reset();
    social.reset();
    groups.reset();
    organizations.reset();
    ui.setSelectedOrganizationId(null);
    eventsState.reset();
    storiesState.reset();
    notifications.reset();
    chat.reset();
    marketplace.reset();
    relations.reset();
    ui.resetProfileView();
    session.myUserId.current = ownerId ?? '';
    session.setCurrentUser(() => ({ ...INITIAL_USER, id: ownerId ?? INITIAL_USER.id }));
  };

  const auth = useAuth(session, {
    loadFeed: feed.loadFeed,
    loadPeople: social.loadPeople,
    loadRelationships: relations.loadRelationships,
    loadGroups: groups.loadGroups,
    loadOrganizations: organizations.loadOrganizations,
    loadNotifications: notifications.loadNotifications,
    loadStories: storiesState.loadStories,
    loadReels: reelsState.loadReels,
    loadEvents: eventsState.loadEvents,
    loadMarketplace: marketplace.loadMarketplace,
    teardownChat: chat.teardown,
    resetUserData,
  });

  const value: AppContextType = {
    currentUser: session.currentUser,
    posts: feedPosts,
    groups: groups.groups,
    groupsLoading: groups.loading,
    openGroup: (groupId: string) => {
      ui.setActiveTab('groups');
      ui.setSelectedGroupId(groupId);
    },
    groupPosts: visibleGroupPosts,
    groupPostsLoading: groups.groupPostsLoading,
    loadGroupPosts: groups.loadGroupPosts,
    createGroupPost: groups.createGroupPost,
    groupMembers: groups.membersByGroup,
    loadMembers: groups.loadMembers,
    marketItems: marketplace.marketItems,
    marketCategories: marketplace.marketCategories,
    marketplaceLoading: marketplace.loading,
    marketTypes: marketplace.marketTypes,
    marketBrands: marketplace.marketBrands,
    marketQuery: marketplace.marketQuery,
    setMarketQuery: marketplace.setMarketQuery,
    marketTotal: marketplace.marketTotal,
    marketCountLabel: marketplace.marketCountLabel,
    marketNote: marketplace.marketNote,
    marketHasMore: marketplace.marketHasMore,
    marketLoadingMore: marketplace.marketLoadingMore,
    loadMoreMarket: marketplace.loadMoreMarket,
    marketError: marketplace.marketError,
    retryMarketplace: marketplace.retryMarketplace,
    searchMarketItems: marketplace.searchMarketItems,
    marketSelectedId: marketplace.marketSelectedId,
    openMarketItem: marketplace.openMarketItem,
    closeMarketItem: marketplace.closeMarketItem,
    marketDetail: marketplace.marketDetail,
    marketDetailLoading: marketplace.marketDetailLoading,
    marketDetailError: marketplace.marketDetailError,
    notifications: notifications.notifications,
    notificationsLoading: notifications.loading,
    activeTab: ui.activeTab,
    setActiveTab: ui.setActiveTab,
    viewedProfileId: ui.viewedProfileId,
    openProfile: (userId: string) => ui.openProfile(userId, session.currentUser.id),
    closeProfile: ui.closeProfile,
    timeline: timelineView,
    loadTimeline: feed.loadTimeline,
    selectedGroupId: ui.selectedGroupId,
    setSelectedGroupId: ui.setSelectedGroupId,
    darkMode: ui.darkMode,
    setDarkMode: ui.setDarkMode,
    isAuthenticated: session.isAuthenticated,
    authReady: session.authReady,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    addPost: feed.addPost,
    reactToPost: feed.reactToPost,
    sharePost: feed.sharePost,
    votePoll: feed.votePoll,
    addComment: feed.addComment,
    toggleCommentLike: feed.toggleCommentLike,
    deletePost: feed.deletePost,
    deleteComment: feed.deleteComment,
    toggleJoinGroup: groups.toggleJoinGroup,
    createGroup: groups.createGroup,
    deleteGroup: groups.deleteGroup,
    myRoleByGroup: groups.myRoleByGroup,
    showToast,
    buyMarketItem: marketplace.buyMarketItem,
    createMarketItem: marketplace.createMarketItem,
    updateProfile: profile.updateProfile,
    people: visiblePeople,
    peopleLoading: social.peopleLoading,
    followUser: social.followUser,
    unfollowUser: social.unfollowUser,
    countsFor: social.countsFor,
    isFollowing: social.isFollowing,
    relationTo: relations.relationTo,
    friendCount: relations.friendCount,
    incomingRequests: relations.incomingRequests.filter((r) => !blockedSet.has(r.userId)),
    personView: relations.viewOf,
    sendFriendRequest: relations.sendFriendRequest,
    acceptFriend: relations.acceptFriend,
    declineFriend: relations.declineFriend,
    cancelFriendRequest: relations.cancelFriendRequest,
    unfriend: relations.unfriend,
    blockUser: relations.blockUser,
    unblockUser: async (userId: string) => {
      const ok = await relations.unblockUser(userId);
      // Unblocking also clears the chat-level block rows written when the person was blocked.
      if (ok) await chat.unblockInChats(userId).catch((err) => showToast(messageOf(err, 'The chat block was not removed')));
      return ok;
    },
    isBlocked: relations.isBlocked,
    blockedUsers: relations.blockedUsers,
    hidePost: relations.hidePost,
    hiddenPosts: relations.hiddenPosts,
    snoozeUser: relations.snoozeUser,
    muteUser: relations.muteUser,
    isMuted: relations.isMuted,
    mutedUsers: relations.mutedEntries,
    removePreference: relations.removePreference,
    markNotificationsAsRead: notifications.markNotificationsAsRead,
    dismissNotification: notifications.dismissNotification,
    clearNotifications: notifications.clearNotifications,
    addNotification: notifications.addNotification,
    activeChats: visibleChats,
    chatMessages: chat.chatMessages,
    chatThreads: visibleThreads,
    chatThreadsLoading: chat.threadsLoading,
    openChatWithUser: (user) => {
      // A blocked person never gets a chat window (the block also closed any open one).
      if (relations.isBlocked(user.id)) {
        showToast('You blocked this person. Unblock to send messages.');
        return;
      }
      chat.openChatWithUser(user);
    },
    chatMeta: chat.chatMeta,
    memberNames: chat.memberNames,
    isChatMuted: chat.isChatMuted,
    openChat: chat.openChat,
    closeChat: chat.closeChat,
    minimizeChat: chat.minimizeChat,
    sendMessage: chat.sendMessage,
    sendImage: chat.sendImage,
    reactToMessage: chat.reactToMessage,
    pinMessage: chat.pinMessage,
    unpinMessage: chat.unpinMessage,
    muteChat: chat.muteChat,
    unmuteChat: chat.unmuteChat,
    createGroupChat: chat.createGroupChat,
    blockInChat: chat.blockInChat,
    markOpenChatsRead: chat.markOpenChatsRead,
    stories: visibleStories,
    addStory: storiesState.addStory,
    viewStory: storiesState.viewStory,
    deleteStory: storiesState.deleteStory,
    replyToStory: storiesState.replyToStory,
    loadReplies: storiesState.loadReplies,
    reels: visibleReels,
    reelsLoading: reelsState.loading,
    addReel: reelsState.addReel,
    viewReel: reelsState.viewReel,
    deleteReel: reelsState.deleteReel,
    events: eventsState.events,
    eventsLoading: eventsState.loading,
    createEvent: eventsState.createEvent,
    setRsvp: eventsState.setRsvp,
    deleteEvent: eventsState.deleteEvent,
    organizations: organizations.organizations,
    organizationsLoading: organizations.loading,
    organizationsError: organizations.loadError,
    loadOrganizations: organizations.loadOrganizations,
    createOrganization: organizations.createOrganization,
    joinOrganization: organizations.joinOrganization,
    leaveOrganization: organizations.leaveOrganization,
    deleteOrganization: organizations.deleteOrganization,
    organizationMembers: organizations.organizationMembers,
    loadOrganizationMembers: organizations.loadOrganizationMembers,
    organizationsOf: organizations.organizationsOf,
    selectedOrganizationId: ui.selectedOrganizationId,
    setSelectedOrganizationId: ui.setSelectedOrganizationId,
    openOrganization: (organizationId: string) => {
      ui.setActiveTab('organizations');
      ui.setSelectedOrganizationId(organizationId);
    },
  };

  const toastAction = toast?.action;
  return (
    <AppContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={toast?.autoHideMs ?? (toast?.severity === 'error' ? 8000 : 4000)}
        onClose={(_, reason) => { if (reason !== 'clickaway') closeToast(); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 80, md: 24 } }}
      >
        <Alert
          onClose={closeToast}
          severity={toast?.severity ?? 'info'}
          variant="filled"
          className="w-full max-w-md"
          action={toastAction ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => { toastAction.onClick(); closeToast(); }}
              sx={{ minHeight: 44, minWidth: 44, fontWeight: 700 }}
            >
              {toastAction.label}
            </Button>
          ) : undefined}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};
