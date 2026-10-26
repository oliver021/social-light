import React, { createContext, useContext } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { UserProfile, Post, Group, MarketItem, NotificationItem, Reactions, ChatMessage, ChatBoxState, ChatThread } from '../types';
import { INITIAL_USER } from '../data';
import { type ActiveTab, useUiPreferences } from './useUiPreferences';
import { useSessionState } from './session';
import { useToast, type ToastSeverity } from './useToast';
import { useNotifications } from './useNotifications';
import { useFeed, type ProfileTimeline } from './useFeed';
import { useSocial, type Person, type FollowCounts } from './useSocial';
import { useGroups, type NewGroup } from './useGroups';
import { useMarketplace } from './useMarketplace';
import { useProfile } from './useProfile';
import { useChat } from './useChat';
import { useStories, type Story } from './useStories';
import { useReels, type Reel } from './useReels';
import { useEvents, type EventItem } from './useEvents';
import { useAuth } from './useAuth';
import { clearUserScopedStorage } from './usePersistentState';

// Re-exported for any consumer that wants these view shapes.
export type { Person, Story, Reel, EventItem };

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
  openChatWithUser: (user: { id: string; name: string; avatar: string; handle: string }) => void;
  closeChat: (userId: string) => void;
  minimizeChat: (userId: string) => void;
  /** Rejects with a readable message when the message could not be sent (text is kept by the caller). */
  sendMessage: (userId: string, text: string) => Promise<void>;

  // Generated modules (Stories / Reels / Events): real CRUD over the gateway.
  stories: Story[];
  addStory: (mediaUrl: string, caption: string) => void;
  viewStory: (storyId: string) => void;
  /** Deletes my story. Rejects with a readable message. */
  deleteStory: (storyId: string) => Promise<void>;
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
  createEvent: (title: string, description: string, location: string, startDate: string, endDate: string, capacity: number | null) => void;
  rsvpEvent: (eventId: string) => void;
  /** Cancels my event. Rejects with a readable message. */
  deleteEvent: (eventId: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hooks are composed top-down in dependency order: a hook is declared after every
  // hook whose output it consumes (notifications.notify → feed; feed.loadFeed → social;
  // every loader → auth's login/bootstrap orchestration).
  const ui = useUiPreferences();
  const session = useSessionState();
  const { toast, showToast, closeToast } = useToast();

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
  const groups = useGroups({ myUserId: session.myUserId, showToast });
  const chat = useChat({
    myUserId: session.myUserId,
    currentUserId: session.currentUser.id,
    isAuthenticated: session.isAuthenticated,
    showToast,
  });
  const marketplace = useMarketplace({ currentUser: session.currentUser, addNotification: notifications.addNotification });
  const profile = useProfile({ currentUser: session.currentUser, setCurrentUser: session.setCurrentUser });
  const storiesState = useStories({ myUserId: session.myUserId });
  const reelsState = useReels({ myUserId: session.myUserId });
  const eventsState = useEvents({ myUserId: session.myUserId });

  // Everything cached for one account is dropped here: on logout, on a failed session
  // probe, and whenever the signed-in user is not the owner of the local cache.
  const resetUserData = (ownerId: string | null) => {
    clearUserScopedStorage();
    feed.reset();
    social.reset();
    groups.reset();
    notifications.reset();
    chat.reset();
    marketplace.reset();
    ui.resetProfileView();
    session.myUserId.current = ownerId ?? '';
    session.setCurrentUser(() => ({ ...INITIAL_USER, id: ownerId ?? INITIAL_USER.id }));
  };

  const auth = useAuth(session, {
    loadFeed: feed.loadFeed,
    loadPeople: social.loadPeople,
    loadGroups: groups.loadGroups,
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
    posts: feed.posts,
    groups: groups.groups,
    groupsLoading: groups.loading,
    marketItems: marketplace.marketItems,
    marketCategories: marketplace.marketCategories,
    marketplaceLoading: marketplace.loading,
    notifications: notifications.notifications,
    notificationsLoading: notifications.loading,
    activeTab: ui.activeTab,
    setActiveTab: ui.setActiveTab,
    viewedProfileId: ui.viewedProfileId,
    openProfile: (userId: string) => ui.openProfile(userId, session.currentUser.id),
    closeProfile: ui.closeProfile,
    timeline: feed.timeline,
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
    people: social.people,
    peopleLoading: social.peopleLoading,
    followUser: social.followUser,
    unfollowUser: social.unfollowUser,
    countsFor: social.countsFor,
    isFollowing: social.isFollowing,
    markNotificationsAsRead: notifications.markNotificationsAsRead,
    dismissNotification: notifications.dismissNotification,
    clearNotifications: notifications.clearNotifications,
    addNotification: notifications.addNotification,
    activeChats: chat.activeChats,
    chatMessages: chat.chatMessages,
    chatThreads: chat.chatThreads,
    chatThreadsLoading: chat.threadsLoading,
    openChatWithUser: chat.openChatWithUser,
    closeChat: chat.closeChat,
    minimizeChat: chat.minimizeChat,
    sendMessage: chat.sendMessage,
    stories: storiesState.stories,
    addStory: storiesState.addStory,
    viewStory: storiesState.viewStory,
    deleteStory: storiesState.deleteStory,
    reels: reelsState.reels,
    reelsLoading: reelsState.loading,
    addReel: reelsState.addReel,
    viewReel: reelsState.viewReel,
    deleteReel: reelsState.deleteReel,
    events: eventsState.events,
    eventsLoading: eventsState.loading,
    createEvent: eventsState.createEvent,
    rsvpEvent: eventsState.rsvpEvent,
    deleteEvent: eventsState.deleteEvent,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 4000}
        onClose={(_, reason) => { if (reason !== 'clickaway') closeToast(); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 80, md: 24 } }}
      >
        <Alert onClose={closeToast} severity={toast?.severity ?? 'info'} variant="filled" className="w-full max-w-md">
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
