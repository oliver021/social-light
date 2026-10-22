import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Box, 
  Card, 
  Typography, 
  Avatar, 
  List, 
  ListItem, 
  Button, 
  Divider,
  IconButton,
  Chip
} from '@mui/material';
import { TrendingUp, UserPlus, Sparkles, ExternalLink, RefreshCw, Layers } from 'lucide-react';
import { EventsWidget } from './EventsWidget';

export const Widgets: React.FC = () => {
  // Real people to discover + follow now come from the backend (Profile discovery +
  // SocialGraph). Following someone fans their posts into the home feed.
  const { addNotification, openChatWithUser, people, followUser, unfollowUser } = useApp();

  const handleFollowClick = (userId: string, name: string, followed: boolean) => {
    if (followed) {
      unfollowUser(userId);
    } else {
      followUser(userId);
      addNotification('follow', name, "is now in your feed. Their posts will show on your home grid.");
    }
  };

  return (
    <Box className="flex flex-col gap-4 h-full" id="right-widgets-column">
      {/* RECOMMENDED CONNECTIONS */}
      <Card variant="outlined" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950">
        <Typography variant="subtitle2" className="font-display font-semibold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-500" />
          Nodes to Join
        </Typography>
        <List className="py-0 space-y-3">
          {people.length === 0 && (
            <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs block py-1">
              No other people on the grid yet. Invite someone to join!
            </Typography>
          )}
          {people.map((person) => (
            <ListItem key={person.userId} disablePadding className="flex items-center justify-between gap-2">
              <Box
                className="flex items-center gap-2 cursor-pointer hover:opacity-85"
                onClick={() => {
                  openChatWithUser({
                    id: person.userId,
                    name: person.name,
                    avatar: person.avatar,
                    handle: person.handle
                  });
                }}
              >
                <Avatar src={person.avatar} className="w-9 h-9" />
                <Box>
                  <Typography variant="body2" className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs hover:text-blue-500">
                    {person.name}
                  </Typography>
                  <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 block text-xs -mt-0.5">
                    {person.handle}
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                variant={person.followed ? "outlined" : "contained"}
                color={person.followed ? "inherit" : "primary"}
                onClick={() => handleFollowClick(person.userId, person.name, person.followed)}
                className={`normal-case text-xs font-display min-w-[70px] py-1 rounded-full ${
                  person.followed
                  ? 'border-zinc-200 text-zinc-600 dark:text-zinc-400'
                  : 'bg-violet-605 text-white hover:opacity-90'
                }`}
                style={{ height: '24px' }}
              >
                {person.followed ? 'Following' : 'Connect'}
              </Button>
            </ListItem>
          ))}
        </List>
      </Card>

      {/* UPCOMING EVENTS (generated Events module) */}
      <EventsWidget />
    </Box>
  );
};
