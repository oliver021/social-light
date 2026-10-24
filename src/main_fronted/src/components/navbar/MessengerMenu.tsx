import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, Box, Button, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemText, Popover, Typography } from '@mui/material';
import { MessageSquare } from 'lucide-react';

/** The messenger icon in the navbar and its conversations popover. */
export const MessengerMenu: React.FC = () => {
  const { chatThreads, openChatWithUser } = useApp();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const unreadChatsCount = chatThreads.filter(t => t.unread).length;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        color="inherit"
        aria-label={`Open messenger${unreadChatsCount ? `, ${unreadChatsCount} unread` : ''}`}
        className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0"
      >
        <Badge badgeContent={unreadChatsCount} color="primary" overlap="circular" slotProps={{ badge: { className: 'font-mono text-xs h-4 min-w-4 px-1 bg-blue-600 text-white' } }}>
          <MessageSquare className="w-5 h-5" />
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
        <Box className="p-2.5 flex items-center justify-between">
          <Typography variant="subtitle2" className="font-display font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Messenger
          </Typography>
          <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 text-xs">
            {chatThreads.length} {chatThreads.length === 1 ? 'conversation' : 'conversations'}
          </Typography>
        </Box>
        <Divider />
        
        {/* Horizontal contacts bubble list */}
        <Box className="p-2 flex gap-3 overflow-x-auto border-b border-zinc-100 dark:border-zinc-850 select-none pb-2 scrolling-touch scrollbar-none">
          {chatThreads.map((thread) => (
            <Box 
              key={thread.userId} 
              className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-85 shrink-0"
              onClick={() => {
                openChatWithUser({
                  id: thread.userId,
                  name: thread.name,
                  avatar: thread.avatar,
                  handle: thread.handle
                });
                handleClose();
              }}
            >
              <Badge invisible 
                variant="dot" 
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                slotProps={{
                  badge: {
                    className: 'bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950'
                  }
                }}
              >
                <Avatar src={thread.avatar} className="w-9 h-9 border border-zinc-100 dark:border-zinc-850" />
              </Badge>
              <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate w-12 text-center block">
                {thread.name.split(' ')[0]}
              </Typography>
            </Box>
          ))}
        </Box>

        {chatThreads.length === 0 ? (
          <Box className="p-6 text-center">
            <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 block font-sans text-xs">
              No conversations yet. Message someone from People you may know.
            </Typography>
          </Box>
        ) : (
          <List className="py-0">
            {chatThreads.map((thread) => (
              <ListItem 
                key={thread.userId} 
                className={`px-2 py-2 rounded-xl my-1 gap-2 border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer ${thread.unread ? 'bg-blue-50/25 dark:bg-blue-950/15 border-l-blue-500 border-l-2' : ''}`}
                onClick={() => {
                  openChatWithUser({
                    id: thread.userId,
                    name: thread.name,
                    avatar: thread.avatar,
                    handle: thread.handle
                  });
                  handleClose();
                }}
              >
                <ListItemAvatar className="min-w-0">
                  <Badge invisible 
                    variant="dot" 
                    overlap="circular" 
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    slotProps={{
                      badge: {
                        className: 'bg-green-500 w-2 h-2 rounded-full border border-white dark:border-zinc-950'
                      }
                    }}
                  >
                    <Avatar src={thread.avatar} className="w-8 h-8" />
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box className="flex items-center justify-between">
                      <Typography variant="caption" className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                        {thread.name}
                      </Typography>
                      <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                        {thread.lastMessageTime}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box className="flex items-center justify-between gap-1 mt-0.5">
                      <Typography variant="caption" className={`text-xs truncate max-w-[160px] block ${thread.unread ? 'font-semibold text-zinc-950 dark:text-zinc-100' : 'text-zinc-600'}`}>
                        {thread.lastMessage}
                      </Typography>
                      {thread.unread && (
                        <Box className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        
        <Divider />
        <Box className="p-1 px-2 flex justify-center">
          <Button 
            size="small" 
            onClick={handleClose}
            className="text-blue-500 dark:text-blue-400 font-display text-xs normal-case"
          >
            Close
          </Button>
        </Box>
      </Popover>
    </>
  );
};
