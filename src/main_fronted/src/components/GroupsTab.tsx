import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Group } from '../types';
import { PostCard } from './PostCard';
import { messageOf } from '../api/gateway';
import { EmptyState } from './ui/EmptyState';
import { cardSx, sectionTitleSx } from './ui/tokens';
import { 
  Alert,
  Box, 
  Card, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Avatar, 
  Divider, 
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem
} from '@mui/material';
import { Users, Search, SlidersHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const EMPTY_FORM = { name: '', description: '', privacy: 'public' as 'public' | 'private' };

export const GroupsTab: React.FC = () => {
  const { groups, toggleJoinGroup, createGroup, posts, selectedGroupId, setSelectedGroupId, addNotification, showToast } = useApp();
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Create-community dialog state.
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = ['All', 'Technology', 'Artificial Intelligence', 'Gaming', 'Design Systems'];

  const handleToggleJoin = async (group: Group) => {
    const changed = await toggleJoinGroup(group.id);
    if (!changed) return; // the hook has already reported why
    const actionText = group.joined ? "left" : "joined";
    addNotification('group', group.name, `You ${actionText} the community.`);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Give the community a name.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await createGroup(form);
      setCreateOpen(false);
      showToast(`Community "${form.name.trim()}" created. You are a member.`, 'success');
    } catch (err) {
      setFormError(messageOf(err, 'The community was not created'));
    } finally {
      setCreating(false);
    }
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
            All communities
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
            Posts in {activeGroup.name}
          </Typography>

          <Box className="space-y-4">
            {getGroupPosts(activeGroup.id).length > 0 ? (
              getGroupPosts(activeGroup.id).map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <EmptyState title="No posts in this community yet" body="Posts shared here will appear in this list." />
            )}
          </Box>
        </Box>
      ) : (
        // COMMUNITIES DISCOVERY GRID VIEW
        <Box className="space-y-4">
          <Card variant="outlined" sx={{ ...cardSx, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography component="h2" sx={{ ...sectionTitleSx, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              Find communities
            </Typography>

            <Box className="flex gap-2">
              <TextField
                size="small"
                fullWidth
                placeholder="Search communities..."
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
              <Button
                size="small"
                variant="contained"
                onClick={openCreate}
                className="normal-case text-xs font-display bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 min-h-[44px] shrink-0"
              >
                Create community
              </Button>
            </Box>

            {/* HORIZONTAL CATEGORIES SPLIT CHIPS */}
            <Box className="flex items-center gap-1.5 flex-wrap pt-0.5 min-w-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 mr-1 shrink-0" aria-hidden="true" />
              {categories.map((cat) => (
                <Chip 
                  key={cat}
                  label={cat}
                  onClick={() => setActiveCategory(cat)}
                  size="small"
                  aria-pressed={activeCategory === cat}
                  sx={{ maxWidth: '100%', height: 32, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                  className={`text-xs font-medium transition ${
                    activeCategory === cat 
                    ? 'bg-emerald-500 text-white font-semibold' 
                    : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                />
              ))}
            </Box>
          </Card>

          <Dialog
            open={createOpen}
            onClose={() => { if (!creating) setCreateOpen(false); }}
            slotProps={{
              paper: { className: 'w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2' }
            }}
          >
            <DialogTitle className="font-display font-bold text-sm text-zinc-800 dark:text-zinc-200 pb-2">
              Create a community
            </DialogTitle>
            <form onSubmit={handleCreate} noValidate>
              <DialogContent className="space-y-3.5 pt-2">
                {formError && <Alert severity="error" className="text-xs">{formError}</Alert>}
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
                />
                <TextField
                  size="small"
                  fullWidth
                  select
                  label="Who can see it"
                  value={form.privacy}
                  onChange={(e) => setForm({ ...form, privacy: e.target.value as 'public' | 'private' })}
                  slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
                >
                  <MenuItem value="public">Public: anyone can find and join</MenuItem>
                  <MenuItem value="private">Private: only people you add</MenuItem>
                </TextField>
              </DialogContent>
              <DialogActions className="pr-4 pb-4">
                <Button size="small" onClick={() => setCreateOpen(false)} disabled={creating} className="text-xs text-zinc-600 dark:text-zinc-400 normal-case">Cancel</Button>
                <Button
                  size="small"
                  type="submit"
                  variant="contained"
                  disabled={creating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs normal-case px-4"
                >
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* GROUPS CATALOG GRID */}
          {filteredGroups.length === 0 && (
            <EmptyState
              icon={Users}
              title={groups.length === 0 ? 'No communities yet' : 'No communities match your search'}
              body={groups.length === 0 ? 'Create the first one and invite people to it.' : 'Try another word or category.'}
              action={groups.length === 0 ? { label: 'Create community', onClick: openCreate } : undefined}
            />
          )}
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
                        {group.category} • {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
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
                      Open
                      <ArrowRight className="w-3" aria-hidden="true" />
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
                      style={{ minHeight: 44, minWidth: 44 }}
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
