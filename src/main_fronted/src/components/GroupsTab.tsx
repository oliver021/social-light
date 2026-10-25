import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Group } from '../types';
import { PostCard } from './PostCard';
import { messageOf } from '../api/gateway';
import {
  CardGridSkeleton,
  ConfirmDialog,
  EmptyState,
  OverflowMenu,
  PageHeader,
  ResponsiveDialog,
  SectionHeader,
  Surface,
  T,
  mutedSx,
  sectionTitleSx,
  subtleSx,
} from './ui';
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, Search, SlidersHorizontal, Trash2, Users } from 'lucide-react';

const TOUCH_TARGET = { minHeight: 44, minWidth: 44 };
/** The pill button: a 44px target with the full radius token. */
const PILL_BUTTON = { ...TOUCH_TARGET, borderRadius: 'var(--ui-radius-full)', px: 2 };

const EMPTY_FORM = { name: '', description: '', privacy: 'public' as 'public' | 'private' };

const CATEGORIES = ['All', 'Technology', 'Artificial Intelligence', 'Gaming', 'Design Systems'];

export const GroupsTab: React.FC = () => {
  const { groups, groupsLoading, toggleJoinGroup, createGroup, deleteGroup, myRoleByGroup, posts, selectedGroupId, setSelectedGroupId, addNotification, showToast } = useApp();
  // The first groups load is pending: show placeholder cards, not a false "no communities".
  const listPending = Boolean(groupsLoading) && groups.length === 0;
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Create-community dialog state.
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleToggleJoin = async (group: Group) => {
    const changed = await toggleJoinGroup(group.id);
    if (!changed) return; // the hook has already reported why
    const actionText = group.joined ? 'left' : 'joined';
    addNotification('group', group.name, `You ${actionText} the community.`);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (!creating) setCreateOpen(false);
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

  // Posts shown in a community's feed. Only the demo communities have linked posts yet.
  const getGroupPosts = (groupId: string) => {
    if (groupId === 'group-1') {
      return posts.filter(p => p.id === 'post-1' || p.id === 'post-5'); // React 19 + accessibility details
    }
    if (groupId === 'group-3') {
      return posts.filter(p => p.id === 'post-4' || p.id === 'post-3'); // project neon grids + webGPU links
    }
    return []; // no posts are linked to this community yet
  };

  const activeGroup = groups.find(g => g.id === selectedGroupId);

  // One join control per community. Its state is shown by the variant and the label.
  const joinButton = (group: Group) => (
    <Button
      size="small"
      variant={group.joined ? 'outlined' : 'contained'}
      onClick={() => handleToggleJoin(group)}
      aria-label={`${group.joined ? 'Leave' : 'Join'} ${group.name}`}
      sx={{ ...PILL_BUTTON, fontSize: 'var(--ui-fs-xs)' }}
    >
      {group.joined ? 'Joined' : 'Join'}
    </Button>
  );

  return (
    <Box id="communities-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      {selectedGroupId && activeGroup ? (
        // COMMUNITY INNER VIEW
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
          <Button
            variant="text"
            onClick={() => setSelectedGroupId(null)}
            startIcon={<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />}
            sx={{ ...TOUCH_TARGET, alignSelf: 'flex-start', color: T.muted, fontWeight: 600, fontSize: 'var(--ui-fs-xs)' }}
          >
            All communities
          </Button>

          {/* COMMUNITY BANNER */}
          <Surface as="section" padding="none" sx={{ overflow: 'hidden' }}>
            <Box aria-hidden="true" sx={{ height: 80, bgcolor: T.successSoft }} />
            <Box
              sx={{
                px: 'var(--ui-card-pad)',
                pb: 'var(--ui-card-pad)',
                mt: -4,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { md: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                minWidth: 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0 }}>
                <Avatar
                  src={activeGroup.coverUrl}
                  alt={activeGroup.name}
                  variant="rounded"
                  sx={{ width: 64, height: 64, flexShrink: 0, border: `2px solid ${T.surface}`, borderRadius: 'var(--ui-radius-lg)' }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h1" sx={{ ...sectionTitleSx, fontSize: 'var(--ui-fs-xl)', overflowWrap: 'anywhere' }}>
                    {activeGroup.name}
                  </Typography>
                  <Typography sx={{ ...subtleSx, color: T.success, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mt: 0.5 }}>
                    {activeGroup.category} · {activeGroup.memberCount.toLocaleString()} {activeGroup.memberCount === 1 ? 'member' : 'members'}
                  </Typography>
                  <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-sm)', mt: 0.5, maxWidth: 560 }}>
                    {activeGroup.description}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', md: 'center' }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {joinButton(activeGroup)}
                {/* Owner rule: only the creator (owner membership) sees delete. Groups created before owners were recorded show none. */}
                <OverflowMenu
                  label="More actions for this community"
                  items={[{ id: 'delete', label: 'Delete community', icon: Trash2, danger: true, hidden: myRoleByGroup.get(activeGroup.id) !== 'owner', onSelect: () => setConfirmDeleteOpen(true) }]}
                />
              </Box>
            </Box>
          </Surface>

          <SectionHeader title={`Posts in ${activeGroup.name}`} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
            {getGroupPosts(activeGroup.id).length > 0 ? (
              getGroupPosts(activeGroup.id).map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <EmptyState title="No posts in this community yet" body="Posts shared here will appear in this list." />
            )}
          </Box>

          {myRoleByGroup.get(activeGroup.id) === 'owner' && (
            <ConfirmDialog
              open={confirmDeleteOpen}
              title="Delete this community?"
              body="It is removed for everyone. This cannot be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                await deleteGroup(activeGroup.id);
                setSelectedGroupId(null);
                showToast('Community deleted', 'success');
              }}
              onClose={() => setConfirmDeleteOpen(false)}
            />
          )}
        </Box>
      ) : (
        // COMMUNITIES DISCOVERY VIEW
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
          <PageHeader
            title="Communities"
            description="Find groups around what you care about, or start one."
            actions={
              <Button variant="contained" onClick={openCreate} sx={PILL_BUTTON}>
                Create community
              </Button>
            }
          />

          <Surface as="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <SectionHeader title="Find communities" />

            <TextField
              size="small"
              fullWidth
              placeholder="Search communities"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              variant="outlined"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: T.muted }} />
                    </InputAdornment>
                  ),
                },
                htmlInput: { 'aria-label': 'Search communities' },
              }}
            />

            {/* CATEGORY FILTER CHIPS */}
            <Box role="group" aria-label="Categories" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
              <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: T.muted }} />
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <Chip
                    key={cat}
                    label={cat}
                    onClick={() => setActiveCategory(cat)}
                    size="small"
                    aria-pressed={active}
                    sx={{
                      height: 32,
                      maxWidth: '100%',
                      borderRadius: 'var(--ui-radius-full)',
                      border: `1px solid ${active ? T.primary : 'transparent'}`,
                      bgcolor: active ? T.primarySoft : T.surface2,
                      color: active ? T.primary : T.muted,
                      fontWeight: active ? 600 : 500,
                      '&:hover': { bgcolor: active ? T.primarySoft : T.surface3 },
                      '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                    }}
                  />
                );
              })}
            </Box>
          </Surface>

          <ResponsiveDialog
            open={createOpen}
            onClose={closeCreate}
            title="Create a community"
            actions={
              <>
                <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ ...TOUCH_TARGET, color: T.muted }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="create-community-form"
                  variant="contained"
                  disabled={creating}
                  sx={PILL_BUTTON}
                >
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </>
            }
          >
            <form id="create-community-form" onSubmit={handleCreate} noValidate>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {formError && <Alert severity="error">{formError}</Alert>}
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <TextField
                  size="small"
                  fullWidth
                  select
                  label="Who can see it"
                  value={form.privacy}
                  onChange={(e) => setForm({ ...form, privacy: e.target.value as 'public' | 'private' })}
                >
                  <MenuItem value="public">Public: anyone can find and join</MenuItem>
                  <MenuItem value="private">Private: only people you add</MenuItem>
                </TextField>
              </Box>
            </form>
          </ResponsiveDialog>

          {/* COMMUNITIES CATALOG */}
          {listPending && <CardGridSkeleton count={4} />}
          {!listPending && filteredGroups.length === 0 && (
            <EmptyState
              icon={Users}
              title={groups.length === 0 ? 'No communities yet' : 'No communities match your search'}
              body={groups.length === 0 ? 'Create the first one and invite people to it.' : 'Try another word or category.'}
              action={groups.length === 0 ? { label: 'Create community', onClick: openCreate } : undefined}
            />
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 'var(--ui-gap)',
            }}
          >
            {filteredGroups.map((group) => (
              <Surface
                key={group.id}
                as="article"
                sx={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5 }}
              >
                {/* Decorative stripe */}
                <Box aria-hidden="true" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: T.success }} />

                <ButtonBase
                  onClick={() => setSelectedGroupId(group.id)}
                  aria-label={`Open ${group.name}`}
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    minWidth: 0,
                    textAlign: 'left',
                    borderRadius: 'var(--ui-radius-sm)',
                    '&:hover': { bgcolor: T.surface2 },
                    '&:active': { bgcolor: T.surface3 },
                    '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
                  }}
                >
                  <Avatar src={group.coverUrl} alt={group.name} variant="rounded" sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: 'var(--ui-radius-lg)' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="span" sx={{ ...sectionTitleSx, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.name}
                    </Typography>
                    <Typography component="span" sx={{ ...subtleSx, display: 'block', fontFamily: 'var(--font-mono)' }}>
                      {group.category} · {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                    </Typography>
                  </Box>
                </ButtonBase>

                <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>
                  {group.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>{joinButton(group)}</Box>
              </Surface>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
