import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar, Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { Gamepad2, Search, ShoppingBag, Sparkles, Tag, User, Users2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TAB_ID } from '../layout/tabs';
import { EmptyState, T, UserAvatar, UserLine } from '../ui';
import { menuRowSx } from './menuSx';

export interface SearchBoxProps {
  /** Phones: the search row is shown only when opened from the navbar's search button. */
  mobileOpen: boolean;
  /** Called after a suggestion is chosen, so the phone search row closes with the navigation. */
  onCloseMobile: () => void;
}

const GROUP_LABEL_CLASS = 'px-2 py-1 flex items-center gap-1.5 text-muted font-mono text-xs uppercase font-bold tracking-wider';

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
      className={`${mobileOpen ? 'flex order-last' : 'hidden'} sm:flex sm:order-none relative items-center max-w-sm w-full min-w-0 sm:flex-1 sm:mx-4 bg-surface-2 px-3 min-h-11 rounded-full border border-line`}
      id="search-container"
    >
      <Search size={18} strokeWidth={1.75} aria-hidden="true" className="text-muted mr-2 shrink-0" />
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
        className="w-full bg-transparent text-xs outline-none text-fg placeholder:text-subtle"
      />

      <AnimatePresence>
        {isSearchFocused && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2.5 z-50 bg-surface text-fg border border-line rounded-card shadow-2 overflow-hidden max-h-96"
            id="search-autocomplete-dropdown"
          >
            <Box className="overflow-y-auto p-2 max-h-[350px] scrollbar-none">
              {!searchQuery.trim() ? (
                <Box className="p-2.5">
                  <Typography component="p" className={`${GROUP_LABEL_CLASS} mb-2`}>
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
                        type="button"
                        onClick={() => setSearchQuery(topic.value)}
                        className="flex items-center gap-1.5 min-h-11 px-3 bg-surface-2 border border-line rounded-full text-xs text-muted hover:bg-primary-soft hover:text-primary font-sans transition-all cursor-pointer"
                      >
                        <topic.icon size={14} strokeWidth={1.75} aria-hidden="true" className="text-primary" />
                        {topic.text}
                      </button>
                    ))}
                  </Box>
                </Box>
              ) : (
                <>
                  {!hasAnyMatches && (
                    <EmptyState compact title={`Nothing matches “${searchQuery}” yet.`} />
                  )}

                  {/* 0. MATCHED PEOPLE */}
                  {matchedPeople.length > 0 && (
                    <Box className="mb-3">
                      <Box className={GROUP_LABEL_CLASS}>
                        <User size={14} strokeWidth={1.75} aria-hidden="true" className="text-success" />
                        People
                      </Box>
                      <List disablePadding>
                        {matchedPeople.map((person) => (
                          <ListItemButton
                            key={person.userId}
                            onClick={() => handleSelectSuggestion('person', person)}
                            sx={{ ...menuRowSx, mb: 0.5 }}
                          >
                            <UserLine name={person.name} handle={person.handle} avatarSrc={person.avatar} size="sm" />
                          </ListItemButton>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* 1. MATCHED COMMUNITIES */}
                  {matchedGroups.length > 0 && (
                    <Box className="mb-3">
                      <Box className={GROUP_LABEL_CLASS}>
                        <Users2 size={14} strokeWidth={1.75} aria-hidden="true" className="text-primary" />
                        Communities
                      </Box>
                      <List disablePadding>
                        {matchedGroups.map((group) => (
                          <ListItemButton
                            key={group.id}
                            onClick={() => handleSelectSuggestion('group', group)}
                            sx={{ ...menuRowSx, mb: 0.5 }}
                          >
                            <Avatar src={group.coverUrl} alt="" variant="rounded" sx={{ width: 32, height: 32, mr: 1 }} />
                            <ListItemText
                              primary={group.name}
                              secondary={`${group.category} • ${group.memberCount.toLocaleString()} members`}
                              slotProps={{
                                primary: { className: 'text-xs font-semibold text-fg' },
                                secondary: { className: 'text-xs text-muted font-sans truncate block' },
                              }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* 2. MATCHED MARKET ITEMS */}
                  {matchedMarket.length > 0 && (
                    <Box className="mb-3">
                      <Box className={GROUP_LABEL_CLASS}>
                        <ShoppingBag size={14} strokeWidth={1.75} aria-hidden="true" className="text-warning" />
                        Marketplace
                      </Box>
                      <List disablePadding>
                        {matchedMarket.map((item) => (
                          <ListItemButton
                            key={item.id}
                            onClick={() => handleSelectSuggestion('market', item)}
                            sx={{ ...menuRowSx, mb: 0.5 }}
                          >
                            <Avatar src={item.imageUrl} alt="" variant="rounded" sx={{ width: 32, height: 32, mr: 1 }} />
                            <ListItemText
                              primary={item.title}
                              secondary={`$${item.price} • ${item.category}`}
                              slotProps={{
                                primary: { className: 'text-xs font-semibold text-fg font-sans' },
                                secondary: { className: 'text-xs text-muted font-mono truncate' },
                              }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* 3. MATCHED POSTS */}
                  {matchedPosts.length > 0 && (
                    <Box>
                      <Box className={GROUP_LABEL_CLASS}>
                        <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" className="text-primary" />
                        Posts
                      </Box>
                      <List disablePadding>
                        {matchedPosts.map((post) => (
                          <ListItemButton
                            key={post.id}
                            onClick={() => handleSelectSuggestion('post', post)}
                            sx={{ ...menuRowSx, mb: 0.5 }}
                          >
                            <UserAvatar name={post.author.name} src={post.author.avatar} size="sm" />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography className="text-xs font-semibold text-fg">{post.author.name}</Typography>
                              <Typography className="text-xs text-muted font-sans truncate block">{post.content}</Typography>
                            </Box>
                          </ListItemButton>
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
