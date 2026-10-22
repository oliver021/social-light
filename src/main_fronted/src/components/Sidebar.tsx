import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Box, 
  Card, 
  Typography, 
  Avatar, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Chip
} from '@mui/material';
import { 
  Home, 
  Users2, 
  ShoppingBag,
  Clapperboard,
  User,
  Sparkles,
  TrendingUp,
  Zap,
  Heart
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    currentUser, 
    activeTab, 
    setActiveTab, 
    isAuthenticated, 
    login,
    notifications
  } = useApp();

  const menuItems = [
    { label: 'Feed Home', tab: 'home' as const, icon: Home, color: 'text-violet-500' },
    { label: 'Communities', tab: 'groups' as const, icon: Users2, color: 'text-emerald-500' },
    { label: 'Marketplace', tab: 'marketplace' as const, icon: ShoppingBag, color: 'text-amber-500' },
    { label: 'Reels', tab: 'reels' as const, icon: Clapperboard, color: 'text-rose-500' },
    { label: 'My profile', tab: 'profile' as const, icon: User, color: 'text-fuchsia-500' }
  ];

  const unreadAlerts = notifications.filter(n => !n.read).length;

  return (
    <Box id="desktop-sidebar-and-widgets" className="flex flex-col gap-4 h-full">
      {/* QUICK CARD PROFILE */}
      <Card variant="outlined" id="sidebar-user-quickcard" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden relative">
        <Box className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-rose-600/10 dark:from-violet-950/40 dark:via-fuchsia-950/40 dark:to-zinc-950" />
        <Box className="relative flex flex-col items-center mt-3 text-center">
          <Avatar 
            src={currentUser.avatar} 
            alt={currentUser.name}
            className="w-16 h-16 border-4 border-white dark:border-zinc-950 shadow-md mb-2 cursor-pointer"
            onClick={() => setActiveTab('profile')}
          />
          <Typography 
            variant="subtitle1" 
            className="font-display font-bold text-zinc-900 dark:text-zinc-100 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer text-sm"
            onClick={() => setActiveTab('profile')}
          >
            {currentUser.name}
          </Typography>
          <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 block mb-2 text-xs">
            {currentUser.handle}
          </Typography>
          
          <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs px-2 line-clamp-2 min-h-[32px] mb-3 leading-relaxed">
            {currentUser.bio}
          </Typography>

          <Divider className="w-full mb-3" />

          <Box className="flex items-center justify-around w-full">
            <Box className="text-center">
              <Typography variant="body2" className="font-bold font-mono text-zinc-800 dark:text-zinc-200 text-xs">
                {currentUser.followersCount}
              </Typography>
              <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs">Followers</Typography>
            </Box>
            <Box className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-800" />
            <Box className="text-center">
              <Typography variant="body2" className="font-bold font-mono text-zinc-800 dark:text-zinc-200 text-xs">
                {currentUser.followingCount}
              </Typography>
              <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs">Following</Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* MULTI TAB NAVIGATION */}
      <Card variant="outlined" id="sidebar-nav-menu" className="border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden">
        <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 font-bold tracking-wider px-4 pt-4 pb-2 block uppercase text-xs">
          Social Channels
        </Typography>
        <List className="py-0 px-2 pb-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.tab;
            return (
              <ListItem key={item.tab} disablePadding className="my-0.5">
                <ListItemButton
                  onClick={() => setActiveTab(item.tab)}
                  className={`rounded-xl px-3 py-2 flex items-center transition-all ${
                    isSelected 
                    ? 'bg-violet-50/50 dark:bg-violet-955/20 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-950' 
                    : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <ListItemIcon className={`min-w-0 mr-3 ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-600 dark:text-zinc-400'}`} style={{ color: '' }}>
                    <IconComponent className="w-5 h-5" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body2" className={`font-display text-xs ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                        {item.label}
                      </Typography>
                    }
                  />
                  {item.tab === 'home' && unreadAlerts > 0 && (
                    <Chip 
                      label={unreadAlerts} 
                      size="small" 
                      color="error"
                      className="bg-rose-500 text-white font-mono text-xs h-4 scale-90"
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
