import { useEffect, useState } from 'react';

export type ActiveTab = 'home' | 'groups' | 'marketplace' | 'reels' | 'profile';

/** Local UI state: theme + the active tab + the selected group. No backend. */
export function useUiPreferences() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('nexus_dark_mode');
    return saved ? saved === 'true' : true; // Default dark is gorgeous
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  return { darkMode, setDarkMode, activeTab, setActiveTab, selectedGroupId, setSelectedGroupId };
}
