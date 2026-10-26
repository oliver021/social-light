import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge, Box, Button, Divider, IconButton, Popover } from '@mui/material';
import { MessageSquare } from 'lucide-react';
import { EmptyState, ListSkeleton, SectionHeader, T } from '../ui';
import { ThreadList } from '../messenger/ThreadList';
import { NewGroupDialog } from '../messenger/NewGroupDialog';
import type { ChatThread } from '../../types';
import { badgeSx, navIconButtonSx, popoverPaperSx } from './menuSx';

/** The messenger icon in the navbar and its conversations popover. */
export const MessengerMenu: React.FC = () => {
  const { chatThreads, chatThreadsLoading, openChatWithUser, openChat } = useApp();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  // The badge counts unread messages across my chats (muted chats count as read).
  const unreadMessages = chatThreads.reduce((sum, t) => sum + t.unreadCount, 0);

  const handleClose = () => {
    setAnchorEl(null);
  };

  // A group opens by its chat id; a DM opens (or finds) its chat with the peer.
  const openThread = (thread: ChatThread) => {
    if (thread.kind === 'group') openChat(thread.chatId);
    else openChatWithUser({ id: thread.userId, name: thread.name, avatar: thread.avatar, handle: thread.handle });
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={(event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
        aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}
        sx={navIconButtonSx}
      >
        <Badge badgeContent={unreadMessages} color="primary" overlap="circular" sx={badgeSx('primary')}>
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

        {chatThreads.length === 0 && chatThreadsLoading ? (
          <Box sx={{ p: 1 }}>
            <ListSkeleton rows={3} />
          </Box>
        ) : chatThreads.length === 0 ? (
          <Box sx={{ p: 1 }}>
            <EmptyState compact title="No conversations yet" body="Message someone from People you may know." />
          </Box>
        ) : (
          <ThreadList threads={chatThreads} onOpen={openThread} />
        )}

        <Divider />
        <Box sx={{ p: 0.5, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Button
            size="medium"
            onClick={() => setGroupOpen(true)}
            sx={{ minHeight: 44, color: T.primary, fontFamily: 'var(--font-display)', textTransform: 'none', fontWeight: 600 }}
          >
            New group
          </Button>
          <Button
            size="medium"
            onClick={handleClose}
            sx={{ minHeight: 44, color: T.primary, fontFamily: 'var(--font-display)', textTransform: 'none', fontWeight: 600 }}
          >
            Close
          </Button>
        </Box>
      </Popover>

      <NewGroupDialog open={groupOpen} onClose={() => setGroupOpen(false)} />
    </>
  );
};
