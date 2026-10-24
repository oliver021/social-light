import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge, Box, Button, ButtonBase, Divider, IconButton, List, ListItemButton, Popover, Typography } from '@mui/material';
import { MessageSquare } from 'lucide-react';
import { EmptyState, ListSkeleton, SectionHeader, T, UserAvatar, mutedSx } from '../ui';
import { badgeSx, menuRowSx, navIconButtonSx, popoverPaperSx } from './menuSx';

/** The messenger icon in the navbar and its conversations popover. */
export const MessengerMenu: React.FC = () => {
  const { chatThreads, chatThreadsLoading, openChatWithUser } = useApp();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const unreadChatsCount = chatThreads.filter((t) => t.unread).length;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openThread = (thread: (typeof chatThreads)[number]) => {
    openChatWithUser({
      id: thread.userId,
      name: thread.name,
      avatar: thread.avatar,
      handle: thread.handle,
    });
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-label={`Open messenger${unreadChatsCount ? `, ${unreadChatsCount} unread` : ''}`}
        sx={navIconButtonSx}
      >
        <Badge badgeContent={unreadChatsCount} color="primary" overlap="circular" sx={badgeSx('primary')}>
          <MessageSquare size={20} strokeWidth={1.75} aria-hidden="true" />
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
            title="Messenger"
            subtitle={`${chatThreads.length} ${chatThreads.length === 1 ? 'conversation' : 'conversations'}`}
          />
        </Box>
        <Divider />

        {/* Recent contacts: a horizontal strip of avatars, each opens its chat. */}
        {chatThreads.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', p: 1, borderBottom: `1px solid ${T.border}` }}>
            {chatThreads.map((thread) => (
              <ButtonBase
                key={thread.userId}
                onClick={() => openThread(thread)}
                aria-label={`Chat with ${thread.name}`}
                sx={{
                  flexDirection: 'column',
                  gap: 0.5,
                  minWidth: 56,
                  minHeight: 44,
                  p: 0.5,
                  borderRadius: 'var(--ui-radius-sm)',
                  flexShrink: 0,
                  '&:hover': { bgcolor: T.surface2 },
                  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
                }}
              >
                <UserAvatar name={thread.name} src={thread.avatar} size="md" />
                <Typography
                  component="span"
                  sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)', fontWeight: 500, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {thread.name.split(' ')[0]}
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        )}

        {chatThreads.length === 0 && chatThreadsLoading ? (
          <Box sx={{ p: 1 }}>
            <ListSkeleton rows={3} />
          </Box>
        ) : chatThreads.length === 0 ? (
          <Box sx={{ p: 1 }}>
            <EmptyState compact title="No conversations yet" body="Message someone from People you may know." />
          </Box>
        ) : (
          <List dense disablePadding>
            {chatThreads.map((thread) => (
              <ListItemButton
                key={thread.userId}
                onClick={() => openThread(thread)}
                sx={{
                  ...menuRowSx,
                  alignItems: 'flex-start',
                  my: 0.5,
                  ...(thread.unread ? { bgcolor: T.primarySoft, borderLeft: `2px solid ${T.primary}` } : {}),
                }}
              >
                <UserAvatar name={thread.name} src={thread.avatar} size="sm" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontSize: 'var(--ui-fs-xs)', fontWeight: thread.unread ? 700 : 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {thread.name}
                    </Typography>
                    <Typography sx={{ fontSize: 'var(--ui-fs-xs)', color: T.subtle, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {thread.lastMessageTime}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 'var(--ui-fs-xs)',
                        fontWeight: thread.unread ? 600 : 400,
                        color: thread.unread ? T.text : T.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {thread.lastMessage}
                    </Typography>
                    {thread.unread && (
                      <Box role="img" aria-label="Unread" sx={{ width: 8, height: 8, borderRadius: 'var(--ui-radius-full)', bgcolor: T.primary, flexShrink: 0 }} />
                    )}
                  </Box>
                </Box>
              </ListItemButton>
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
