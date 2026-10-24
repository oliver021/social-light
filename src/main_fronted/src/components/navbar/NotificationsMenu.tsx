import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, Box, Button, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemText, Popover, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import { TAB_ID } from '../layout/tabs';

/** The bell in the navbar and its notifications popover. Opening it marks them read. */
export const NotificationsMenu: React.FC = () => {
  const { notifications, markNotificationsAsRead, setActiveTab } = useApp();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

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
        color="inherit"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0"
      >
        <Badge badgeContent={unreadCount} color="error" overlap="circular" slotProps={{ badge: { className: 'font-mono text-xs h-4 min-w-4 px-1' } }}>
          <Bell className="w-5 h-5" />
        </Badge>
      </IconButton>

      <Popover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            className: 'mt-2 w-80 max-h-96 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 p-2 shadow-2xl overflow-y-auto'
          }
        }}
      >
        <Box className="p-2 flex items-center justify-between">
          <Typography variant="subtitle2" className="font-display font-semibold flex items-center gap-1 text-zinc-800 dark:text-zinc-200">
            <Bell className="w-4 h-4 text-primary" />
            Notifications
          </Typography>
          <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Typography>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box className="p-6 text-center">
            <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 block">
              No notifications yet.
            </Typography>
          </Box>
        ) : (
          <List className="py-0">
            {notifications.map((notif) => (
              <ListItem 
                key={notif.id} 
                className={`px-2 py-1.5 rounded-xl my-1 gap-2 border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer ${!notif.read ? 'bg-primary-soft/20 border-l-primary border-l-2' : ''}`}
                onClick={() => {
                  if (notif.postId) {
                    setActiveTab(TAB_ID.home);
                    // Expand or highlight matching post
                  }
                  handleClose();
                }}
              >
                <ListItemAvatar className="min-w-0">
                  <Avatar src={notif.actor.avatar} className="w-8 h-8" />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="caption" className="text-zinc-800 dark:text-zinc-300 text-xs">
                      <span className="font-semibold text-zinc-900">{notif.actor.name}</span> {notif.text}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-mono block">
                      {notif.createdAt}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        <Divider />
        <Box className="p-1 flex justify-center">
          <Button 
            size="small" 
            onClick={handleClose} 
            className="text-primary dark:text-primary font-display text-xs normal-case"
          >
            Close
          </Button>
        </Box>
      </Popover>
    </>
  );
};
