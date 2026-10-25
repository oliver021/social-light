import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge, Box, Button, Divider, IconButton, List, ListItemButton, Popover, Typography } from '@mui/material';
import { Bell, X } from 'lucide-react';
import { TAB_ID } from '../layout/tabs';
import { EmptyState, ListSkeleton, SectionHeader, T, UserAvatar, touchTargetSx } from '../ui';
import { badgeSx, menuRowSx, navIconButtonSx, popoverPaperSx } from './menuSx';

/** The bell in the navbar and its notifications popover. Opening it marks them read. */
export const NotificationsMenu: React.FC = () => {
  const { notifications, notificationsLoading, markNotificationsAsRead, dismissNotification, clearNotifications, setActiveTab } = useApp();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    markNotificationsAsRead();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        sx={navIconButtonSx}
      >
        <Badge badgeContent={unreadCount} color="error" overlap="circular" sx={badgeSx('danger')}>
          <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        </Badge>
      </IconButton>

      <Popover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: popoverPaperSx } }}
      >
        <Box sx={{ p: 1 }}>
          <SectionHeader
            title="Notifications"
            subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            action={
              notifications.length > 0 ? (
                <Button
                  onClick={() => { void clearNotifications(); }}
                  sx={{ minHeight: 44, color: T.primary, fontFamily: 'var(--font-display)', textTransform: 'none', fontWeight: 600 }}
                >
                  Clear all
                </Button>
              ) : undefined
            }
          />
        </Box>
        <Divider />
        {notifications.length === 0 && notificationsLoading ? (
          <Box sx={{ p: 1 }}>
            <ListSkeleton rows={3} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 1 }}>
            <EmptyState compact title="No notifications yet" />
          </Box>
        ) : (
          <List dense disablePadding>
            {notifications.map((notif) => (
              <Box component="li" key={notif.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, listStyle: 'none', pr: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    if (notif.postId) {
                      setActiveTab(TAB_ID.home);
                      // Expand or highlight matching post
                    }
                    handleClose();
                  }}
                  sx={{
                    ...menuRowSx,
                    flex: 1,
                    minWidth: 0,
                    alignItems: 'flex-start',
                    my: 0.5,
                    ...(notif.read ? {} : { bgcolor: T.primarySoft, borderLeft: `2px solid ${T.primary}` }),
                  }}
                >
                  <UserAvatar name={notif.actor.name} src={notif.actor.avatar} size="sm" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text, overflowWrap: 'anywhere' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {notif.actor.name}
                      </Box>{' '}
                      {notif.text}
                    </Typography>
                    <Typography sx={{ fontSize: 'var(--ui-fs-xs)', color: T.subtle, fontFamily: 'var(--font-mono)' }}>
                      {notif.createdAt}
                    </Typography>
                  </Box>
                </ListItemButton>
                {/* No confirm step: dismissing a notification is low stakes. */}
                <IconButton
                  aria-label={`Dismiss notification from ${notif.actor.name}`}
                  onClick={() => { void dismissNotification(notif.id); }}
                  sx={{ ...touchTargetSx, flexShrink: 0, color: T.muted }}
                >
                  <X aria-hidden="true" size={18} strokeWidth={1.75} />
                </IconButton>
              </Box>
            ))}
          </List>
        )}
        <Divider />
        <Box sx={{ p: 0.5, display: 'flex', justifyContent: 'center' }}>
          <Button
            size="medium"
            onClick={handleClose}
            sx={{ minHeight: 44, color: T.primary, fontFamily: 'var(--font-display)', textTransform: 'none', fontWeight: 600 }}
          >
            Close
          </Button>
        </Box>
      </Popover>
    </>
  );
};
