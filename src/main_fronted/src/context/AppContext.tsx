import React, { createContext, useContext } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { UserProfile, Post, Group, MarketItem, NotificationItem, Reactions, ChatMessage, ChatBoxState, ChatThread } from '../types';
import { INITIAL_USER } from '../data';
import { type ActiveTab, useUiPreferences } from './useUiPreferences';
import { useSessionState } from './session';
import { useToast, type ToastSeverity } from './useToast';
import { useNotifications } from './useNotifications';
import { useFeed } from './useFeed';
import { useSocial, type Person } from './useSocial';
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
interface AppContextType {
  currentUser: UserProfile;
  posts: Post[];
  groups: Group[];
  marketItems: MarketItem[];
  marketCategories: string[];
  notifications: NotificationItem[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
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
  sharePost: (postId: string) => void;
  votePoll: (postId: string, optionId: string) => void;
  /** Rejects with a readable message when the comment is not saved. */
  addComment: (postId: string, content: string) => Promise<void>;
  /** Resolves true when the membership changed on the server. */
  toggleJoinGroup: (groupId: string) => Promise<boolean>;
  /** Creates a community and makes the creator a member. Rejects with a readable message. */
  createGroup: (input: NewGroup) => Promise<void>;
  buyMarketItem: (itemId: string) => void;
  createMarketItem: (title: string, description: string, price: number, category: string, location: string, imageUrl: string) => void;
  /** Rejects with a readable message when the server does not accept the change. */
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  /** Show a transient message (errors, confirmed saves). */
  showToast: (message: string, severity?: ToastSeverity) => void;
  // Social graph (M3): real people to discover + follow, backed by Profile + SocialGraph.
  people: Person[];
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  markNotificationsAsRead: () => void;
  addNotification: (type: NotificationItem['type'], actorName: string, text: string, postId?: string) => void;

  // Messenger system states & methods
  activeChats: ChatBoxState[];
  chatMessages: Record<string, ChatMessage[]>;
  chatThreads: ChatThread[];
  openChatWithUser: (user: { id: string; name: string; avatar: string; handle: string }) => void;
  closeChat: (userId: string) => void;
  minimizeChat: (userId: string) => void;
  /** Rejects with a readable message when the message could not be sent (text is kept by the caller). */
  sendMessage: (userId: string, text: string) => Promise<void>;

  // Generated modules (Stories / Reels / Events): real CRUD over the gateway.
  stories: Story[];
  addStory: (mediaUrl: string, caption: string) => void;
  viewStory: (storyId: string) => void;
  reels: Reel[];
  addReel: (videoUrl: string, caption: string, duration: number) => Promise<void>;
  viewReel: (reelId: string) => void;
  events: EventItem[];
  createEvent: (title: string, description: string, location: string, startDate: string, endDate: string, capacity: number | null) => void;
  rsvpEvent: (eventId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hooks are composed top-down in dependency order: a hook is declared after every
  // hook whose output it consumes (notifications.notify → feed; feed.loadFeed → social;
  // every loader → auth's login/bootstrap orchestration).
  const ui = useUiPreferences();
  const session = useSessionState();
  const { toast, showToast, closeToast } = useToast();

  const notifications = useNotifications({ myUserId: session.myUserId });
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
    marketItems: marketplace.marketItems,
    marketCategories: marketplace.marketCategories,
    notifications: notifications.notifications,
    activeTab: ui.activeTab,
    setActiveTab: ui.setActiveTab,
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
    toggleJoinGroup: groups.toggleJoinGroup,
    createGroup: groups.createGroup,
    showToast,
    buyMarketItem: marketplace.buyMarketItem,
    createMarketItem: marketplace.createMarketItem,
    updateProfile: profile.updateProfile,
    people: social.people,
    followUser: social.followUser,
    unfollowUser: social.unfollowUser,
    markNotificationsAsRead: notifications.markNotificationsAsRead,
    addNotification: notifications.addNotification,
    activeChats: chat.activeChats,
    chatMessages: chat.chatMessages,
    chatThreads: chat.chatThreads,
    openChatWithUser: chat.openChatWithUser,
    closeChat: chat.closeChat,
    minimizeChat: chat.minimizeChat,
    sendMessage: chat.sendMessage,
    stories: storiesState.stories,
    addStory: storiesState.addStory,
    viewStory: storiesState.viewStory,
    reels: reelsState.reels,
    addReel: reelsState.addReel,
    viewReel: reelsState.viewReel,
    events: eventsState.events,
    createEvent: eventsState.createEvent,
    rsvpEvent: eventsState.rsvpEvent,
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
