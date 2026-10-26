import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Group } from '../types';
import { PostCard } from './PostCard';
import { MediaPicker } from './MediaPicker';
import { messageOf } from '../api/gateway';
import {
  CardGridSkeleton,
  ConfirmDialog,
  EmptyState,
  ListSkeleton,
  OverflowMenu,
  PageHeader,
  ResponsiveDialog,
  SectionHeader,
  StatusChip,
  Surface,
  T,
  UserLine,
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, Search, SlidersHorizontal, Trash2, Users } from 'lucide-react';

const TOUCH_TARGET = { minHeight: 44, minWidth: 44 };
/** The pill button: a 44px target with the full radius token. */
const PILL_BUTTON = { ...TOUCH_TARGET, borderRadius: 'var(--ui-radius-full)', px: 2 };

const EMPTY_FORM = {
  name: '',
  description: '',
  privacy: 'public' as 'public' | 'private',
  coverImage: '',
  avatar: '',
};

const CATEGORIES = ['All', 'Technology', 'Artificial Intelligence', 'Gaming', 'Design Systems'];

type CommunityTab = 'posts' | 'members';

export const GroupsTab: React.FC = () => {
  const {
    groups,
    groupsLoading,
    toggleJoinGroup,
    createGroup,
    deleteGroup,
    myRoleByGroup,
    groupPosts,
    groupPostsLoading,
    loadGroupPosts,
    createGroupPost,
    groupMembers,
    loadMembers,
    selectedGroupId,
    setSelectedGroupId,
    openProfile,
    addNotification,
    showToast,
  } = useApp();
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

  // The community page: which tab is open, and the composer while a post is being sent.
  const [tab, setTab] = useState<CommunityTab>('posts');
  const [composerText, setComposerText] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Opening a community reads its posts; the Members tab reads its members when it is opened.
  useEffect(() => {
    setTab('posts');
    setComposerText('');
    setComposerError(null);
    if (selectedGroupId) loadGroupPosts(selectedGroupId).catch(() => {});
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && tab === 'members') loadMembers(selectedGroupId).catch(() => {});
  }, [selectedGroupId, tab]);

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
    // Only the fields that are set are sent; the cover and the avatar are optional.
    const input = {
      name: form.name,
      description: form.description,
      privacy: form.privacy,
      ...(form.coverImage ? { coverImage: form.coverImage } : {}),
      ...(form.avatar ? { avatar: form.avatar } : {}),
    };
    try {
      await createGroup(input);
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

  const activeGroup = groups.find(g => g.id === selectedGroupId);

  const handleGroupPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    const text = composerText.trim();
    if (!text) return;
    setPosting(true);
    setComposerError(null);
    try {
      await createGroupPost(activeGroup.id, text, 'text');
      setComposerText('');
    } catch (err) {
      setComposerError(messageOf(err, 'Your post was not added to the community'));
    } finally {
      setPosting(false);
    }
  };

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

          {/* COMMUNITY BANNER: cover (when there is one), name, privacy, member count, join and more. */}
          <Surface as="section" padding="none" sx={{ overflow: 'hidden' }}>
            {activeGroup.coverImage ? (
              <Box component="img" src={activeGroup.coverImage} alt={`Cover image of ${activeGroup.name}`} sx={{ display: 'block', width: '100%', height: 120, objectFit: 'cover' }} />
            ) : (
              <Box aria-hidden="true" sx={{ height: 80, bgcolor: T.successSoft }} />
            )}
            <Box
              sx={{
                px: 'var(--ui-card-pad)',
                pb: 'var(--ui-card-pad)',
                mt: activeGroup.coverImage ? -3 : -4,
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
                  alt=""
                  variant="rounded"
                  sx={{ width: 64, height: 64, flexShrink: 0, border: `2px solid ${T.surface}`, borderRadius: 'var(--ui-radius-lg)' }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h1" sx={{ ...sectionTitleSx, fontSize: 'var(--ui-fs-xl)', overflowWrap: 'anywhere' }}>
                    {activeGroup.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    <StatusChip label={activeGroup.privacy === 'private' ? 'Private' : 'Public'} tone="neutral" />
                    <Typography sx={{ ...subtleSx, color: T.success, fontWeight: 600 }}>
                      {activeGroup.memberCount.toLocaleString()} {activeGroup.memberCount === 1 ? 'member' : 'members'}
                    </Typography>
                  </Box>
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

          <Tabs
            value={tab}
            onChange={(_, value: CommunityTab) => setTab(value)}
            aria-label="Community sections"
            sx={{ minHeight: 44, borderBottom: `1px solid ${T.border}` }}
          >
            <Tab value="posts" label="Posts" sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} />
            <Tab value="members" label="Members" sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} />
          </Tabs>

          {tab === 'posts' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
              {/* Only members see the composer. */}
              {activeGroup.joined && (
                <Surface as="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box component="form" onSubmit={handleGroupPost} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      placeholder="Share something with this community"
                      value={composerText}
                      disabled={posting}
                      onChange={(e) => setComposerText(e.target.value)}
                      slotProps={{ htmlInput: { 'aria-label': 'Post in this community' } }}
                    />
                    {composerError && <Alert severity="error">{composerError}</Alert>}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button type="submit" variant="contained" disabled={posting || !composerText.trim()} sx={PILL_BUTTON}>
                        {posting ? 'Posting…' : 'Post'}
                      </Button>
                    </Box>
                  </Box>
                </Surface>
              )}

              <SectionHeader title={`Posts in ${activeGroup.name}`} />

              {groupPostsLoading && groupPosts.length === 0 && <ListSkeleton rows={2} />}
              {!(groupPostsLoading && groupPosts.length === 0) && groupPosts.length === 0 && (
                <EmptyState title="No posts in this community yet" body="Posts shared here will appear in this list." />
              )}
              {groupPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </Box>
          )}

          {tab === 'members' && (() => {
            const members = groupMembers[activeGroup.id];
            if (members === undefined) return <ListSkeleton rows={3} />;
            if (members.length === 0) return <EmptyState title="No members yet" body="People who join this community will appear here." />;
            return (
              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {members.map((m) => (
                  <Box component="li" key={m.id}>
                    <UserLine
                      name={m.name}
                      handle={m.handle}
                      avatarSrc={m.avatar}
                      onOpen={() => openProfile(m.userId)}
                      meta={<StatusChip label={m.role === 'owner' ? 'Owner' : 'Member'} tone={m.role === 'owner' ? 'primary' : 'neutral'} />}
                    />
                  </Box>
                ))}
              </Box>
            );
          })()}

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
                  helperText="Posts in this community can be seen by anyone signed in."
                >
                  <MenuItem value="public">Public: shown in the list to everyone</MenuItem>
                  <MenuItem value="private">Private: shown as private (joining is still open)</MenuItem>
                </TextField>
                <MediaPicker
                  kind="image"
                  label="Cover image (optional)"
                  value={form.coverImage || undefined}
                  onChange={(url) => setForm({ ...form, coverImage: url ?? '' })}
                />
                <MediaPicker
                  kind="image"
                  label="Avatar (optional)"
                  value={form.avatar || undefined}
                  onChange={(url) => setForm({ ...form, avatar: url ?? '' })}
                />
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
