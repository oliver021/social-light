import { Home, Users2, ShoppingBag, Clapperboard, User, type LucideIcon } from 'lucide-react';
import type { ActiveTab } from '../../context/useUiPreferences';

/** The ids of the top-level tabs. The only place a tab id is spelled out. */
export const TAB_ID = {
  home: 'home',
  groups: 'groups',
  marketplace: 'marketplace',
  reels: 'reels',
  profile: 'profile',
} as const satisfies Record<string, ActiveTab>;

export interface TabDef {
  id: ActiveTab;
  /** Full label: sidebar, drawer and navbar. */
  label: string;
  /** Short label: the bottom navigation on phones. */
  shortLabel: string;
  icon: LucideIcon;
  /** 'feed' = centred column with rails; 'wide' = main spans the centre and right columns. */
  layout: 'feed' | 'wide';
}

/**
 * One source for every navigation surface (sidebar, drawer, bottom nav, navbar). The labels
 * are the sidebar wording; where the bottom nav used a shorter word it is kept as shortLabel.
 */
export const TABS: TabDef[] = [
  { id: TAB_ID.home, label: 'Home', shortLabel: 'Home', icon: Home, layout: 'feed' },
  { id: TAB_ID.groups, label: 'Communities', shortLabel: 'Groups', icon: Users2, layout: 'feed' },
  { id: TAB_ID.marketplace, label: 'Marketplace', shortLabel: 'Market', icon: ShoppingBag, layout: 'wide' },
  { id: TAB_ID.reels, label: 'Reels', shortLabel: 'Reels', icon: Clapperboard, layout: 'wide' },
  { id: TAB_ID.profile, label: 'My profile', shortLabel: 'Profile', icon: User, layout: 'feed' },
];

export function tabDef(id: ActiveTab): TabDef {
  const found = TABS.find((tab) => tab.id === id);
  if (!found) throw new Error(`Unknown tab: ${id}`);
  return found;
}
