import React from 'react';
import { useApp } from '../context/AppContext';
import { Avatar, Box, Card, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Chip } from '@mui/material';
import { cardSx, mutedSx, touchTargetSx } from './ui/tokens';
import { TABS, TAB_ID } from './layout/tabs';

export const Sidebar: React.FC = () => {
  const { currentUser, activeTab, setActiveTab, notifications } = useApp();


  const unreadAlerts = notifications.filter(n => !n.read).length;

  return (
    <Box id="desktop-sidebar-and-widgets" className="flex flex-col gap-4">
      {/* PROFILE SUMMARY */}
      <Card variant="outlined" id="sidebar-user-quickcard" component="section" aria-label="Your profile" sx={{ ...cardSx, position: 'relative', overflow: 'hidden', pt: 2 }}>
        <Box className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-primary-soft via-accent-soft to-surface-2" />
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, textAlign: 'center', minWidth: 0 }}>
          <Box
            component="button"
            type="button"
            aria-label="Open my profile"
            onClick={() => setActiveTab(TAB_ID.profile)}
            sx={{ background: 'none', border: 0, p: 0, mb: 1, borderRadius: '50%', cursor: 'pointer', ...touchTargetSx, minWidth: 0, minHeight: 0 }}
          >
            <Avatar src={currentUser.avatar} alt={currentUser.name} sx={{ width: 64, height: 64, border: '4px solid var(--ui-surface)', boxShadow: 1 }} />
          </Box>
          <Typography
            component="button"
            type="button"
            onClick={() => setActiveTab(TAB_ID.profile)}
            sx={{ background: 'none', border: 0, p: 0, m: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ui-text)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { color: 'var(--ui-primary)' } }}
          >
            {currentUser.name}
          </Typography>
          <Typography sx={{ ...mutedSx, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.handle}
          </Typography>

          <Typography sx={{ ...mutedSx, fontSize: '0.75rem', px: 1, mt: 1, mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>
            {currentUser.bio || 'No bio yet.'}
          </Typography>

          <Divider sx={{ width: '100%', mb: 1.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--ui-text)' }}>
                {currentUser.followersCount}
              </Typography>
              <Typography sx={{ ...mutedSx, fontSize: '0.75rem' }}>Followers</Typography>
            </Box>
            <Box sx={{ width: '1px', height: 24, bgcolor: 'var(--ui-border)' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--ui-text)' }}>
                {currentUser.followingCount}
              </Typography>
              <Typography sx={{ ...mutedSx, fontSize: '0.75rem' }}>Following</Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* MAIN NAVIGATION */}
      <Card variant="outlined" id="sidebar-nav-menu" component="nav" aria-label="Main" sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
        <Typography component="h2" sx={{ ...mutedSx, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', px: 2, pt: 2, pb: 1 }}>
          Menu
        </Typography>
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
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--ui-border)' : 'transparent',
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    color: isSelected ? 'var(--ui-primary)' : 'var(--ui-muted)',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                    <IconComponent aria-hidden="true" className="w-5 h-5" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: isSelected ? 600 : 500, fontFamily: 'var(--font-display)' } } }}
                  />
                  {item.id === TAB_ID.home && unreadAlerts > 0 && (
                    <Chip
                      label={unreadAlerts}
                      size="small"
                      aria-hidden="true"
                      sx={{ bgcolor: 'var(--ui-danger)', color: 'var(--ui-on-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', height: 20 }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Card>
    </Box>
  );
};
