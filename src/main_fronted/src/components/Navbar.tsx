import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge, 
  Avatar, 
  Menu, 
  MenuItem, 
  Box, 
  Tooltip, 
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Divider
} from '@mui/material';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Search,
  Sparkles,
  Zap,
  Menu as MenuIcon,
  ShoppingBag,
  Gamepad2,
  Clapperboard,
  Users2,
  Home,
  MessageSquare,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


interface NavbarProps {
  onToggleMobileDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileDrawer }) => {
  const { 
    currentUser, 
    notifications, 
    markNotificationsAsRead, 
    darkMode, 
    setDarkMode, 
    isAuthenticated,
    logout,
    activeTab,
    setActiveTab,
    chatThreads,
    openChatWithUser,
    posts,
    groups,
    marketItems,
    setSelectedGroupId,
    people,
  } = useApp();

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [anchorElMessenger, setAnchorElMessenger] = useState<null | HTMLElement>(null);

  // Search Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Phones: the search bar is hidden until the search icon is tapped (second row).
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const query = searchQuery.toLowerCase().trim();

  // 1. Matches for Groups
  const matchedGroups = query 
    ? groups.filter(g => 
        g.name.toLowerCase().includes(query) || 
        g.category.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query)
      ).slice(0, 3) 
    : [];

  // 2. Matches for Market Items
  const matchedMarket = query 
    ? marketItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      ).slice(0, 3) 
    : [];

  // 3. Matches for Posts
  const matchedPosts = query 
    ? posts.filter(post => 
        (post.title && post.title.toLowerCase().includes(query)) ||
        post.content.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query) ||
        post.author.handle.toLowerCase().includes(query)
      ).slice(0, 3) 
    : [];

  // 4. Matches for people (opens a conversation with them, the only action they support)
  const matchedPeople = query
    ? people.filter(p =>
        p.userId !== currentUser.id &&
        (p.name.toLowerCase().includes(query) || p.handle.toLowerCase().includes(query))
      ).slice(0, 3)
    : [];

  const hasAnyMatches = matchedPeople.length > 0 || matchedGroups.length > 0 || matchedMarket.length > 0 || matchedPosts.length > 0;

  const handleSelectSuggestion = (type: 'post' | 'group' | 'market' | 'person', item: any) => {
    setSearchQuery('');
    setIsSearchFocused(false);

    if (type === 'group') {
      setSelectedGroupId(item.id);
      setActiveTab('groups');
    } else if (type === 'market') {
      setActiveTab('marketplace');
    } else if (type === 'post') {
      setActiveTab('home');
    } else if (type === 'person') {
      openChatWithUser({ id: item.userId, name: item.name, avatar: item.avatar, handle: item.handle });
    }
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotifMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotif(event.currentTarget);
    markNotificationsAsRead();
  };

  const handleCloseNotifMenu = () => {
    setAnchorElNotif(null);
  };

  const handleOpenMessengerMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElMessenger(event.currentTarget);
  };

  const handleCloseMessengerMenu = () => {
    setAnchorElMessenger(null);
  };

  const handleLogoutClick = () => {
    handleCloseUserMenu();
    logout();
  };

  const menuItems = [
    { label: 'Home', tab: 'home' as const, icon: Home },
    { label: 'Communities', tab: 'groups' as const, icon: Users2 },
    { label: 'Marketplace', tab: 'marketplace' as const, icon: ShoppingBag },
    { label: 'Reels', tab: 'reels' as const, icon: Clapperboard },
    { label: 'My profile', tab: 'profile' as const, icon: User }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadChatsCount = chatThreads.filter(t => t.unread).length;

  return (
    <AppBar position="sticky" color="default" elevation={0} id="nexus-navbar" className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors duration-350">
      <Toolbar className="justify-between px-3 sm:px-4 flex-wrap sm:flex-nowrap gap-y-2">
        {/* LOGO */}
        <Box className="flex items-center gap-2 sm:gap-3 min-w-0">
          <IconButton
            color="inherit"
            aria-label="Open navigation menu"
            edge="start"
            onClick={onToggleMobileDrawer}
            className="md:hidden w-11 h-11 p-0"
          >
            <MenuIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </IconButton>

          <Box
            role="button"
            tabIndex={0}
            aria-label="socialLight home"
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => setActiveTab('home')}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('home'); }}
          >
            <Box className="p-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/10">
              <Zap className="w-5 h-5 fill-current animate-bounce" />
            </Box>
            <Typography variant="h6" className="hidden min-[480px]:block font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 tracking-tight leading-none text-xl whitespace-nowrap shrink-0">
              socialLight
            </Typography>
          </Box>
        </Box>

        {/* SEARCH BAR (HIDES ON MOBILE) WITH AUTOCOMPLETE */}
        <Box
          ref={searchContainerRef}
          className={`${mobileSearchOpen ? 'flex order-last' : 'hidden'} sm:flex sm:order-none relative items-center max-w-sm w-full min-w-0 sm:flex-1 sm:mx-4 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/80`}
          id="search-container"
        >
          <Search className="w-4 h-4 text-zinc-600 dark:text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            aria-label="Search people, posts and items"
            autoFocus={mobileSearchOpen}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsSearchFocused(false);
              } else if (e.key === 'Enter') {
                if (matchedPeople.length > 0) {
                  handleSelectSuggestion('person', matchedPeople[0]);
                } else if (matchedGroups.length > 0) {
                  handleSelectSuggestion('group', matchedGroups[0]);
                } else if (matchedMarket.length > 0) {
                  handleSelectSuggestion('market', matchedMarket[0]);
                } else if (matchedPosts.length > 0) {
                  handleSelectSuggestion('post', matchedPosts[0]);
                }
              }
            }}
            placeholder="Search people, posts and items…"
            className="w-full bg-transparent text-xs outline-none text-zinc-700 dark:text-zinc-300 placeholder-zinc-500 dark:placeholder-zinc-400"
          />

          <AnimatePresence>
            {isSearchFocused && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2.5 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-2xl overflow-hidden max-h-96"
                id="search-autocomplete-dropdown"
              >
                <Box className="overflow-y-auto p-2 max-h-[350px] scrollbar-none">
                  {!searchQuery.trim() ? (
                    <Box className="p-2.5">
                      <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 text-xs uppercase font-bold tracking-wider block mb-2">
                        Trending
                      </Typography>
                      <Box className="flex flex-wrap gap-1.5">
                        {[
                          { text: 'buildinpublic', icon: Tag, value: '#buildinpublic' },
                          { text: 'Valorant', icon: Gamepad2, value: 'valorant' },
                          { text: 'Keyboards', icon: ShoppingBag, value: 'keyboard' },
                          { text: 'AI & Web3', icon: Sparkles, value: 'ai' },
                        ].map((topic) => (
                          <button
                            key={topic.text}
                            onClick={() => setSearchQuery(topic.value)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 rounded-full text-xs text-zinc-600 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-950/25 hover:text-violet-600 dark:hover:text-violet-400 font-sans transition-all cursor-pointer"
                          >
                            <topic.icon className="w-3 h-3 text-violet-500" />
                            {topic.text}
                          </button>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <>
                      {!hasAnyMatches && (
                        <Box className="p-6 text-center">
                          <Typography variant="body2" className="text-zinc-600 dark:text-zinc-400 text-xs">
                            Nothing matches &ldquo;{searchQuery}&rdquo; yet.
                          </Typography>
                        </Box>
                      )}

                      {/* 0. MATCHED PEOPLE */}
                      {matchedPeople.length > 0 && (
                        <Box className="mb-3">
                          <Box className="px-2 py-1 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-mono text-xs uppercase font-bold tracking-wider">
                            <User className="w-3.5 h-3.5 text-emerald-500" />
                            People
                          </Box>
                          <List className="p-0">
                            {matchedPeople.map((person) => (
                              <ListItem
                                key={person.userId}
                                disablePadding
                                className="rounded-xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer p-2 transition-colors mb-0.5"
                                onClick={() => handleSelectSuggestion('person', person)}
                              >
                                <Avatar src={person.avatar} alt={person.name} className="w-8 h-8 mr-2.5" />
                                <ListItemText
                                  primary={person.name}
                                  secondary={person.handle}
                                  slotProps={{
                                    primary: { className: 'text-xs font-semibold text-zinc-800 dark:text-zinc-200' },
                                    secondary: { className: 'text-xs text-zinc-600 dark:text-zinc-400 font-mono truncate block' }
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      {/* 1. MATCHED COMMUNITIES */}
                      {matchedGroups.length > 0 && (
                        <Box className="mb-3">
                          <Box className="px-2 py-1 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-mono text-xs uppercase font-bold tracking-wider">
                            <Users2 className="w-3.5 h-3.5 text-sky-500" />
                            Communities
                          </Box>
                          <List className="p-0">
                            {matchedGroups.map((group) => (
                              <ListItem
                                key={group.id}
                                disablePadding
                                className="rounded-xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer p-2 transition-colors mb-0.5"
                                onClick={() => handleSelectSuggestion('group', group)}
                              >
                                <Avatar src={group.coverUrl} variant="rounded" className="w-8 h-8 mr-2.5" />
                                <ListItemText
                                  primary={group.name}
                                  secondary={`${group.category} • ${group.memberCount.toLocaleString()} members`}
                                  slotProps={{
                                    primary: { className: 'text-xs font-semibold text-zinc-800 dark:text-zinc-200' },
                                    secondary: { className: 'text-xs text-zinc-600 dark:text-zinc-400 font-sans truncate' }
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      {/* 2. MATCHED MARKET ITEMS */}
                      {matchedMarket.length > 0 && (
                        <Box className="mb-3">
                          <Box className="px-2 py-1 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-mono text-xs uppercase font-bold tracking-wider">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                            Marketplace
                          </Box>
                          <List className="p-0">
                            {matchedMarket.map((item) => (
                              <ListItem
                                key={item.id}
                                disablePadding
                                className="rounded-xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer p-2 transition-colors mb-0.5"
                                onClick={() => handleSelectSuggestion('market', item)}
                              >
                                <Avatar src={item.imageUrl} variant="rounded" className="w-8 h-8 mr-2.5" />
                                <ListItemText
                                  primary={item.title}
                                  secondary={`$${item.price} • ${item.category}`}
                                  slotProps={{
                                    primary: { className: 'text-xs font-semibold text-zinc-800 dark:text-zinc-200 font-sans' },
                                    secondary: { className: 'text-xs text-zinc-600 dark:text-zinc-400 font-mono truncate' }
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      {/* 3. MATCHED POSTS */}
                      {matchedPosts.length > 0 && (
                        <Box>
                          <Box className="px-2 py-1 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-mono text-xs uppercase font-bold tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                            Posts
                          </Box>
                          <List className="p-0">
                            {matchedPosts.map((post) => (
                              <ListItem
                                key={post.id}
                                disablePadding
                                className="rounded-xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer p-2 transition-colors mb-0.5"
                                onClick={() => handleSelectSuggestion('post', post)}
                              >
                                <Avatar src={post.author.avatar} className="w-8 h-8 mr-2.5" />
                                <ListItemText
                                  primary={post.author.name}
                                  secondary={post.content}
                                  slotProps={{
                                    primary: { className: 'text-xs font-semibold text-zinc-800 dark:text-zinc-200' },
                                    secondary: { className: 'text-xs text-zinc-600 dark:text-zinc-400 font-sans truncate block' }
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* CONTROLS */}
        <Box className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* MOBILE SEARCH TOGGLE (desktop shows the search bar inline) */}
          <IconButton
            onClick={() => setMobileSearchOpen((open) => !open)}
            color="inherit"
            aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
            aria-expanded={mobileSearchOpen}
            className="sm:hidden w-11 h-11 p-0 text-zinc-600 dark:text-zinc-400"
          >
            <Search className="w-5 h-5" />
          </IconButton>

          {/* DARK TOGGLE */}
          <IconButton
            onClick={() => setDarkMode(!darkMode)}
            color="inherit"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-600" />}
          </IconButton>

          {/* MESSENGER TOGGLE */}
          <IconButton
            onClick={handleOpenMessengerMenu}
            color="inherit"
            aria-label={`Open messenger${unreadChatsCount ? `, ${unreadChatsCount} unread` : ''}`}
            className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0"
          >
            <Badge badgeContent={unreadChatsCount} color="primary" overlap="circular" slotProps={{ badge: { className: 'font-mono text-xs h-4 min-w-4 px-1 bg-blue-600 text-white' } }}>
              <MessageSquare className="w-5 h-5" />
            </Badge>
          </IconButton>

          {/* MESSENGER DROPDOWN POPOVER */}
          <Popover
            anchorEl={anchorElMessenger}
            open={Boolean(anchorElMessenger)}
            onClose={handleCloseMessengerMenu}
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
                    handleCloseMessengerMenu();
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
                      handleCloseMessengerMenu();
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
                onClick={handleCloseMessengerMenu}
                className="text-blue-500 dark:text-blue-400 font-display text-xs normal-case"
              >
                Close
              </Button>
            </Box>
          </Popover>

          {/* NOTIFICATION ANCHOR */}
          <IconButton
            onClick={handleOpenNotifMenu}
            color="inherit"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0"
          >
            <Badge badgeContent={unreadCount} color="error" overlap="circular" slotProps={{ badge: { className: 'font-mono text-xs h-4 min-w-4 px-1' } }}>
              <Bell className="w-5 h-5" />
            </Badge>
          </IconButton>

          {/* NOTIFICATIONS DROPDOWN POPOVER */}
          <Popover
            anchorEl={anchorElNotif}
            open={Boolean(anchorElNotif)}
            onClose={handleCloseNotifMenu}
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
                <Bell className="w-4 h-4 text-violet-500" />
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
                    className={`px-2 py-1.5 rounded-xl my-1 gap-2 border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer ${!notif.read ? 'bg-violet-50/20 dark:bg-violet-950/10 border-l-violet-500 border-l-2' : ''}`}
                    onClick={() => {
                      if (notif.postId) {
                        setActiveTab('home');
                        // Expand or highlight matching post
                      }
                      handleCloseNotifMenu();
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
                onClick={handleCloseNotifMenu} 
                className="text-violet-600 dark:text-violet-400 font-display text-xs normal-case"
              >
                Close
              </Button>
            </Box>
          </Popover>

          {/* USER ACCOUNT SHORTCUT */}
          {isAuthenticated ? (
            <Box>
              <Tooltip title="Account">
                <IconButton onClick={handleOpenUserMenu} aria-label="Account menu" className="w-11 h-11 p-0 border-2 border-transparent hover:border-violet-500/50 rounded-full">
                  <Avatar 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-8 h-8"
                  />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorElUser}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    className: 'mt-2 border border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 p-1 shadow-2xl'
                  }
                }}
              >
                <Box className="px-3 py-2">
                  <Typography variant="body2" className="font-semibold text-zinc-850 dark:text-zinc-100">
                    {currentUser.name}
                  </Typography>
                  <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 block text-xs">
                    {currentUser.handle}
                  </Typography>
                </Box>
                <Divider className="my-1" />
                <MenuItem onClick={() => { handleCloseUserMenu(); setActiveTab('profile'); }} className="gap-2 text-xs rounded-lg text-zinc-700 dark:text-zinc-300">
                  <User className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" /> My profile
                </MenuItem>
                <MenuItem onClick={handleLogoutClick} className="gap-2 text-xs text-rose-600 rounded-lg dark:text-rose-400">
                  <LogOut className="w-3.5 h-3.5" /> Log out
                </MenuItem>
              </Menu>
            </Box>
          ) : null}
        </Box>
      </Toolbar>
    </AppBar>
  );
};
