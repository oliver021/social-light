import { Building2, Home, Users2, ShoppingBag, Clapperboard, User, type LucideIcon } from 'lucide-react';
import type { ActiveTab } from '../../context/useUiPreferences';

/** The ids of the top-level tabs. The only place a tab id is spelled out. */
export const TAB_ID = {
  home: 'home',
  groups: 'groups',
  organizations: 'organizations',
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
  /** Whether the phone bottom navigation shows it. The bottom bar keeps 5 items; the rest live in the sidebar and drawer. */
  inBottomNav: boolean;
}

/**
 * One source for every navigation surface (sidebar, drawer, bottom nav, navbar). The labels
 * are the sidebar wording; where the bottom nav used a shorter word it is kept as shortLabel.
 */
export const TABS: TabDef[] = [
  { id: TAB_ID.home, label: 'Home', shortLabel: 'Home', icon: Home, layout: 'feed', inBottomNav: true },
  { id: TAB_ID.groups, label: 'Communities', shortLabel: 'Groups', icon: Users2, layout: 'feed', inBottomNav: true },
  { id: TAB_ID.organizations, label: 'Organizations', shortLabel: 'Orgs', icon: Building2, layout: 'feed', inBottomNav: false },
  { id: TAB_ID.marketplace, label: 'Marketplace', shortLabel: 'Market', icon: ShoppingBag, layout: 'wide', inBottomNav: true },
  { id: TAB_ID.reels, label: 'Reels', shortLabel: 'Reels', icon: Clapperboard, layout: 'wide', inBottomNav: true },
  { id: TAB_ID.profile, label: 'My profile', shortLabel: 'Profile', icon: User, layout: 'feed', inBottomNav: true },
];

export function tabDef(id: ActiveTab): TabDef {
  const found = TABS.find((tab) => tab.id === id);
  if (!found) throw new Error(`Unknown tab: ${id}`);
  return found;
}
