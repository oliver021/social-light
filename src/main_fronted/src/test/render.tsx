import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { AppContext, type AppContextType } from '../context/AppContext';

/** A full, signed-in app context. Every function is a vi.fn() unless overridden. */
export function makeAppContext(overrides: Partial<AppContextType> = {}): AppContextType {
  const asyncFn = () => vi.fn(async () => {});
  const base: AppContextType = {
    currentUser: {
      id: 'me-0000-0000-0000-000000000001',
      username: 'testuser',
      name: 'Test User',
      handle: '@testuser',
      avatar: '',
      bio: '',
      coverPhoto: '',
      followersCount: 0,
      followingCount: 0,
      interests: [],
    },
    posts: [],
    groups: [],
    marketItems: [],
    marketCategories: [],
    notifications: [],
    activeTab: 'home',
    setActiveTab: vi.fn(),
    viewedProfileId: null,
    openProfile: vi.fn(),
    closeProfile: vi.fn(),
    timeline: null,
    loadTimeline: asyncFn(),
    selectedGroupId: null,
    setSelectedGroupId: vi.fn(),
    darkMode: false,
    setDarkMode: vi.fn(),
    isAuthenticated: true,
    authReady: true,
    login: asyncFn(),
    register: asyncFn(),
    logout: vi.fn(),
    addPost: vi.fn(),
    reactToPost: vi.fn(),
    sharePost: asyncFn(),
    votePoll: vi.fn(),
    addComment: asyncFn(),
    toggleCommentLike: asyncFn(),
    toggleJoinGroup: vi.fn(async () => true),
    createGroup: asyncFn(),
    deleteGroup: asyncFn(),
    myRoleByGroup: new Map(),
    deletePost: asyncFn(),
    deleteComment: asyncFn(),
    dismissNotification: asyncFn(),
    clearNotifications: asyncFn(),
    buyMarketItem: vi.fn(),
    createMarketItem: vi.fn(),
    updateProfile: asyncFn(),
    showToast: vi.fn(),
    people: [],
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    countsFor: vi.fn(() => ({ followers: 0, following: 0 })),
    isFollowing: vi.fn(() => false),
    relationTo: vi.fn(() => 'none' as const),
    friendCount: 0,
    incomingRequests: [],
    personView: vi.fn((userId: string) => ({ name: 'Member', avatar: '', handle: '' })),
    sendFriendRequest: vi.fn(async () => true),
    acceptFriend: vi.fn(async () => true),
    declineFriend: vi.fn(async () => true),
    cancelFriendRequest: vi.fn(async () => true),
    unfriend: vi.fn(async () => true),
    blockUser: vi.fn(async () => true),
    unblockUser: vi.fn(async () => true),
    isBlocked: vi.fn(() => false),
    blockedUsers: [],
    hidePost: vi.fn(async () => true),
    hiddenPosts: [],
    snoozeUser: vi.fn(async () => true),
    muteUser: vi.fn(async () => true),
    isMuted: vi.fn(() => false),
    mutedUsers: [],
    removePreference: vi.fn(async () => true),
    markNotificationsAsRead: vi.fn(),
    addNotification: vi.fn(),
    activeChats: [],
    chatMessages: {},
    chatThreads: [],
    openChatWithUser: vi.fn(),
    closeChat: vi.fn(),
    minimizeChat: vi.fn(),
    sendMessage: asyncFn(),
    stories: [],
    addStory: vi.fn(),
    viewStory: vi.fn(),
    deleteStory: asyncFn(),
    reels: [],
    addReel: asyncFn(),
    viewReel: vi.fn(),
    deleteReel: asyncFn(),
    events: [],
    createEvent: vi.fn(),
    rsvpEvent: vi.fn(),
    deleteEvent: asyncFn(),
  };
  return { ...base, ...overrides };
}

export interface RenderWithProvidersResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  ctx: AppContextType;
}

/** Render with a light MUI theme and a stub app context. */
export function renderWithProviders(
  ui: ReactElement,
  options: { context?: Partial<AppContextType> } = {},
): RenderWithProvidersResult {
  const ctx = makeAppContext(options.context);
  const theme = createTheme();
  const result = render(
    <ThemeProvider theme={theme}>
      <AppContext.Provider value={ctx}>{ui}</AppContext.Provider>
    </ThemeProvider>,
  );
  return { ...result, user: userEvent.setup(), ctx };
}
