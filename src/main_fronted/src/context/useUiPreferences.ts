import { useCallback, useEffect, useRef, useState } from 'react';

export type ActiveTab = 'home' | 'groups' | 'organizations' | 'marketplace' | 'reels' | 'profile';

/**
 * Local UI state: theme, the active tab, the selected group and the profile being viewed.
 * No backend. `viewedProfileId` is null for "my profile"; it is not persisted, so a reload
 * lands on my profile.
 */
export function useUiPreferences() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('nexus_dark_mode');
    return saved ? saved === 'true' : true; // Default dark is gorgeous
  });
  const [activeTab, setActiveTabState] = useState<ActiveTab>('home');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  // The tab to return to when a profile opened from elsewhere is closed.
  const [profileReturnTab, setProfileReturnTab] = useState<ActiveTab>('home');
  // The tab currently on screen, readable from a callback without re-creating it.
  const activeTabRef = useRef<ActiveTab>('home');
  activeTabRef.current = activeTab;

  // Selecting the Profile tab from any navigation always shows my own profile.
  const setActiveTab = useCallback((tab: ActiveTab) => {
    if (tab === 'profile') setViewedProfileId(null);
    setActiveTabState(tab);
  }, []);

  /** Open a person's profile. My own id opens my profile (null). */
  const openProfile = useCallback(
    (userId: string, myUserId: string) => {
      // Opening a profile from another profile keeps the original return tab.
      if (activeTabRef.current !== 'profile') setProfileReturnTab(activeTabRef.current);
      setViewedProfileId(userId === myUserId ? null : userId);
      setActiveTabState('profile');
      scrollToTop();
    },
    [],
  );

  /** Close a profile opened from elsewhere and go back to the tab it was opened from. */
  const closeProfile = useCallback(() => {
    setViewedProfileId(null);
    setActiveTabState(profileReturnTab);
    scrollToTop();
  }, [profileReturnTab]);

  /** Forget the viewed profile (used on logout and when the signed-in user changes). */
  const resetProfileView = useCallback(() => {
    setViewedProfileId(null);
    setProfileReturnTab('home');
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_dark_mode', String(darkMode));
    } catch {
      // storage unavailable (private window): the toggle still works for this session
    }
    // Tailwind's dark: variant is keyed on the .dark class (see index.css), so the
    // in-app toggle controls it instead of the OS color scheme.
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  return {
    darkMode,
    setDarkMode,
    activeTab,
    setActiveTab,
    selectedGroupId,
    setSelectedGroupId,
    selectedOrganizationId,
    setSelectedOrganizationId,
    viewedProfileId,
    profileReturnTab,
    openProfile,
    closeProfile,
    resetProfileView,
  };
}

function scrollToTop() {
  try {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo({ top: 0 });
  } catch {
    // jsdom or a restricted environment: scrolling is cosmetic
  }
}
