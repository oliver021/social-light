import React from 'react';
import { Box, ButtonBase, List, ListItemButton, Typography } from '@mui/material';
import { BellOff } from 'lucide-react';
import type { ChatThread } from '../../types';
import { T, UserAvatar, mutedSx } from '../ui';
import { menuRowSx } from '../navbar/menuSx';

export interface ThreadListProps {
  threads: ChatThread[];
  onOpen: (thread: ChatThread) => void;
}

/** The conversation list: a strip of recent contacts, then one row per chat with its unread state. */
export const ThreadList: React.FC<ThreadListProps> = ({ threads, onOpen }) => (
  <>
    {/* Recent contacts: a horizontal strip of avatars, each opens its chat. */}
    {threads.length > 0 && (
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', p: 1, borderBottom: `1px solid ${T.border}` }}>
        {threads.map((thread) => (
          <ButtonBase
            key={thread.chatId}
            onClick={() => onOpen(thread)}
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

    <List dense disablePadding>
      {threads.map((thread) => (
        <ListItemButton
          key={thread.chatId}
          onClick={() => onOpen(thread)}
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
                {thread.kind === 'group' && thread.memberCount ? ` (${thread.memberCount})` : ''}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                {thread.muted && (
                  <Box role="img" aria-label="Muted" sx={{ display: 'flex', color: T.subtle }}>
                    <BellOff size={12} strokeWidth={1.75} aria-hidden="true" />
                  </Box>
                )}
                {thread.unread && (
                  <Box role="img" aria-label={`${thread.unreadCount} unread`} sx={{ minWidth: 8, height: 8, px: thread.unreadCount > 9 ? 0.5 : 0, borderRadius: 'var(--ui-radius-full)', bgcolor: T.primary }} />
                )}
              </Box>
            </Box>
          </Box>
        </ListItemButton>
      ))}
    </List>
  </>
);
