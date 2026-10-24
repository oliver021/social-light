import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar, Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { Gamepad2, Search, ShoppingBag, Sparkles, Tag, User, Users2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TAB_ID } from '../layout/tabs';

export interface SearchBoxProps {
  /** Phones: the search row is shown only when opened from the navbar's search button. */
  mobileOpen: boolean;
  /** Called after a suggestion is chosen, so the phone search row closes with the navigation. */
  onCloseMobile: () => void;
}

/** The navbar search: matches people, communities, market items and posts, with a suggestion popover. */
export const SearchBox: React.FC<SearchBoxProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    currentUser,
    posts,
    groups,
    marketItems,
    setSelectedGroupId,
    setActiveTab,
    people,
    openChatWithUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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
    onCloseMobile();

    if (type === 'group') {
      setSelectedGroupId(item.id);
      setActiveTab(TAB_ID.groups);
    } else if (type === 'market') {
      setActiveTab(TAB_ID.marketplace);
    } else if (type === 'post') {
      setActiveTab(TAB_ID.home);
    } else if (type === 'person') {
      openChatWithUser({ id: item.userId, name: item.name, avatar: item.avatar, handle: item.handle });
    }
  };

  return (
    <Box
      ref={searchContainerRef}
      className={`${mobileOpen ? 'flex order-last' : 'hidden'} sm:flex sm:order-none relative items-center max-w-sm w-full min-w-0 sm:flex-1 sm:mx-4 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/80`}
      id="search-container"
    >
      <Search className="w-4 h-4 text-zinc-600 dark:text-zinc-400 mr-2 shrink-0" />
      <input
        type="text"
        aria-label="Search people, posts and items"
        autoFocus={mobileOpen}
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
                        className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 rounded-full text-xs text-zinc-600 dark:text-zinc-300 hover:bg-primary-soft hover:text-primary font-sans transition-all cursor-pointer"
                      >
                        <topic.icon className="w-3 h-3 text-primary" />
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
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
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
  );
};
