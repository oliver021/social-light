import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Group } from '../types';
import { PostCard } from './PostCard';
import { 
  Box, 
  Card, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Avatar, 
  Divider, 
  IconButton,
  Chip
} from '@mui/material';
import { Users, Search, CheckCircle, Plus, Sparkles, SlidersHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const GroupsTab: React.FC = () => {
  const { groups, toggleJoinGroup, posts, selectedGroupId, setSelectedGroupId, addNotification } = useApp();
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Technology', 'Artificial Intelligence', 'Gaming', 'Design Systems'];

  const handleToggleJoin = (group: Group) => {
    toggleJoinGroup(group.id);
    const actionText = group.joined ? "left" : "joined";
    addNotification('group', group.name, `You ${actionText} the community and subscribed to its localized feed.`);
  };

  const filteredGroups = groups.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(filter.toLowerCase()) || 
                        g.description.toLowerCase().includes(filter.toLowerCase());
    const matchCategory = activeCategory === 'All' || g.category === activeCategory;
    return matchSearch && matchCategory;
  });

  // Get localized posts for group feed
  const getGroupPosts = (groupId: string): any[] => {
    if (groupId === 'group-1') {
      return posts.filter(p => p.id === 'post-1' || p.id === 'post-5'); // React 19 + accessibility details
    }
    if (groupId === 'group-3') {
      return posts.filter(p => p.id === 'post-4' || p.id === 'post-3'); // project neon grids + webGPU links
    }
    return []; // no posts are linked to this community yet
  };

  const activeGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <Box id="communities-tab-page" className="space-y-4">
      {selectedGroupId && activeGroup ? (
        // LOCALIZED COMMUNITY INNER FEED VIEW
        <Box className="space-y-4 animate-fade-in">
          <Button 
            size="small" 
            variant="text" 
            onClick={() => setSelectedGroupId(null)}
            className="flex items-center gap-1 min-h-[44px] normal-case text-zinc-600 dark:text-zinc-400 p-0 text-xs font-semibold mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Communities List
          </Button>

          {/* COMMUNITY BANNER */}
          <Card variant="outlined" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden relative">
            <Box className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 dark:from-emerald-950/30 dark:to-zinc-950" />
            <Box className="relative mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Box className="flex items-start gap-3 min-w-0">
                <Avatar 
                  src={activeGroup.coverUrl} 
                  variant="rounded" 
                  className="w-16 h-16 border-2 border-white dark:border-zinc-950 shadow-md"
                />
                <Box>
                  <Typography variant="h6" className="font-display font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {activeGroup.name}
                  </Typography>
                  <Typography variant="caption" className="font-mono text-emerald-600 dark:text-emerald-450 font-semibold uppercase tracking-wider block text-xs mt-0.5">
                    {activeGroup.category} • {activeGroup.memberCount.toLocaleString()} Members
                  </Typography>
                  <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 block mt-1 leading-relaxed text-xs max-w-xl">
                    {activeGroup.description}
                  </Typography>
                </Box>
              </Box>

              <Button
                size="small"
                variant={activeGroup.joined ? "outlined" : "contained"}
                onClick={() => handleToggleJoin(activeGroup)}
                className={`normal-case font-display text-xs min-w-[95px] pr-3 pl-3 rounded-xl py-1.5 shrink-0 self-start md:self-center ${
                  activeGroup.joined
                  ? 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800'
                  : 'bg-emerald-600 hover:opacity-90 text-white'
                }`}
              >
                {activeGroup.joined ? 'Subscribed' : 'Join Community'}
              </Button>
            </Box>
          </Card>

          {/* GROUP SEGMENTED POSTS */}
          <Typography variant="subtitle2" className="font-display font-bold text-zinc-800 dark:text-zinc-200 text-xs px-1">
            Feed segments in {activeGroup.name}:
          </Typography>

          <Box className="space-y-4">
            {getGroupPosts(activeGroup.id).length > 0 ? (
              getGroupPosts(activeGroup.id).map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <Typography variant="body2" className="text-zinc-600 dark:text-zinc-400 text-xs text-center py-6">
                No posts in this community yet
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        // COMMUNITIES DISCOVERY GRID VIEW
        <Box className="space-y-4">
          <Card variant="outlined" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 flex flex-col gap-3">
            <Typography variant="subtitle2" className="font-display font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              Discover Knowledge Communities
            </Typography>

            <Box className="flex gap-2">
              <TextField
                size="small"
                fullWidth
                placeholder="Search community nodes..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                variant="outlined"
                className="bg-zinc-50/50 dark:bg-zinc-900 text-xs"
                slotProps={{
                  input: {
                    className: 'text-xs',
                    startAdornment: <Search className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 mr-2 shrink-0" />
                  },
                  htmlInput: { 'aria-label': 'Search communities' }
                }}
              />
            </Box>

            {/* HORIZONTAL CATEGORIES SPLIT CHIPS */}
            <Box className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 mr-1.5 shrink-0" />
              {categories.map((cat) => (
                <Chip 
                  key={cat}
                  label={cat}
                  onClick={() => setActiveCategory(cat)}
                  size="small"
                  className={`text-xs font-medium transition ${
                    activeCategory === cat 
                    ? 'bg-emerald-500 text-white font-semibold' 
                    : 'bg-zinc-100 dark:bg-zinc-90 w-10 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                />
              ))}
            </Box>
          </Card>

          {/* GROUPS CATALOG GRID */}
          <Grid container spacing={2}>
            {filteredGroups.map((group) => (
              <Grid size={{ xs: 12, sm: 6 }} key={group.id}>
                <Card 
                  variant="outlined" 
                  className="h-full border-zinc-200 dark:border-zinc-850 hover:border-emerald-350 dark:hover:border-emerald-850 transition-all rounded-2xl bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  {/* Miniature decorative stripe */}
                  <Box className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-505 to-teal-505" />

                  <Box
                    className="flex items-start gap-3 cursor-pointer min-w-0"
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <Avatar
                      src={group.coverUrl}
                      variant="rounded"
                      className="w-12 h-12 shrink-0"
                    />
                    <Box className="min-w-0">
                      <Typography variant="body2" className="font-display font-semibold text-zinc-900 dark:text-zinc-100 hover:text-emerald-505 line-clamp-1 break-words text-xs">
                        {group.name}
                      </Typography>
                      <Typography variant="caption" className="font-mono text-xs text-zinc-600 dark:text-zinc-400 -mt-0.5 block">
                        {group.category} • {group.memberCount} nodes
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                    {group.description}
                  </Typography>

                  <Divider className="my-0.5" />

                  <Box className="flex items-center justify-between">
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={() => setSelectedGroupId(group.id)}
                      className="text-xs capitalize font-semibold font-display text-emerald-600 dark:text-emerald-400 p-0 flex items-center gap-0.5"
                    >
                      Enter Feed
                      <ArrowRight className="w-3" />
                    </Button>

                    <Button
                      size="small"
                      variant={group.joined ? "text" : "contained"}
                      onClick={() => handleToggleJoin(group)}
                      className={`normal-case text-xs py-1 border border-transparent rounded-lg ${
                        group.joined
                        ? 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 py-1 border border-zinc-200 dark:border-zinc-800'
                        : 'bg-emerald-600 hover:opacity-95 text-white pr-2.5 pl-2.5 shadow-md shadow-emerald-500/10'
                      }`}
                      style={{ height: '24px' }}
                    >
                      {group.joined ? 'Subscribed' : 'Join'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};
