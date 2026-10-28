import React from 'react';
import { useApp } from '../context/AppContext';
import { unMediaUrl } from '../api/gateway';
import { Box, Chip, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { SectionHeader } from './ui/SectionHeader';
import { Surface } from './ui/Surface';
import { UserAvatar } from './ui/UserAvatar';
import { T, mutedSx, touchTargetSx } from './ui/tokens';
import { TABS, TAB_ID } from './layout/tabs';

export interface SidebarProps {
  /** Called after a destination is chosen, so the phone drawer can close. */
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { currentUser, activeTab, setActiveTab: selectTab, notifications } = useApp();
  const setActiveTab = (tab: Parameters<typeof selectTab>[0]) => {
    selectTab(tab);
    onNavigate?.();
  };

  const unreadAlerts = notifications.filter((n) => !n.read).length;

  return (
    <Box id="desktop-sidebar-and-widgets" className="flex flex-col gap-4">
      {/* PROFILE SUMMARY */}
      <Surface as="section" aria-label="Your profile" sx={{ position: 'relative', overflow: 'hidden', pt: 2 }}>
        <Box className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-primary-soft via-accent-soft to-surface-2" />
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, textAlign: 'center', minWidth: 0 }}>
          <Box sx={{ mb: 1, border: `4px solid ${T.surface}`, borderRadius: 'var(--ui-radius-full)' }}>
            <UserAvatar name={currentUser.name} src={unMediaUrl(currentUser.avatar)} size="lg" onClick={() => setActiveTab(TAB_ID.profile)} />
          </Box>
          <Typography
            component="button"
            type="button"
            onClick={() => setActiveTab(TAB_ID.profile)}
            sx={{
              background: 'none', border: 0, p: 0, m: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'var(--ui-fs-base)', color: T.text, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              '&:hover': { color: T.primary },
            }}
          >
            {currentUser.name}
          </Typography>
          <Typography sx={{ ...mutedSx, fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.handle}
          </Typography>

          <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)', px: 1, mt: 1, mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>
            {currentUser.bio || 'No bio yet.'}
          </Typography>

          <Divider sx={{ width: '100%', mb: 1.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-sm)', color: T.text }}>
                {currentUser.followersCount}
              </Typography>
              <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>Followers</Typography>
            </Box>
            <Box sx={{ width: '1px', height: 24, bgcolor: T.border }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-sm)', color: T.text }}>
                {currentUser.followingCount}
              </Typography>
              <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>Following</Typography>
            </Box>
          </Box>
        </Box>
      </Surface>

      {/* MAIN NAVIGATION */}
      <Surface padding="none" sx={{ overflow: 'hidden' }}>
        <Box component="nav" id="sidebar-nav-menu" aria-label="Main" sx={{ pt: 2 }}>
          <Box sx={{ px: 2, pb: 1 }}>
            <SectionHeader title="Menu" as="h2" />
          </Box>
          <List className="py-0 px-2 pb-2">
            {TABS.map((item) => {
              const IconComponent = item.icon;
              const isSelected = activeTab === item.id;
              const badge = item.id === TAB_ID.home && unreadAlerts > 0 ? `, ${unreadAlerts} unread notifications` : '';
              return (
                <ListItem key={item.id} disablePadding sx={{ my: 0.25 }}>
                  <ListItemButton
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isSelected ? 'page' : undefined}
                    aria-label={`${item.label}${badge}`}
                    sx={{
                      ...touchTargetSx,
                      minHeight: 44,
                      borderRadius: 'var(--ui-radius-sm)',
                      px: 1.5,
                      py: 1,
                      bgcolor: isSelected ? T.primarySoft : 'transparent',
                      color: isSelected ? T.primary : T.muted,
                      '&:hover': { bgcolor: isSelected ? T.primarySoft : T.surface2 },
                      '&:active': { bgcolor: T.surface3 },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                      <IconComponent aria-hidden="true" strokeWidth={1.75} className="w-5 h-5" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { sx: { fontSize: 'var(--ui-fs-sm)', fontWeight: isSelected ? 600 : 500, fontFamily: 'var(--font-display)' } } }}
                    />
                    {item.id === TAB_ID.home && unreadAlerts > 0 && (
                      <Chip
                        label={unreadAlerts}
                        size="small"
                        aria-hidden="true"
                        sx={{ bgcolor: T.danger, color: T.onPrimary, fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', height: 20 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Surface>
    </Box>
  );
};
