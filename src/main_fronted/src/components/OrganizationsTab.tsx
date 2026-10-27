import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { OrganizationKeptError, canPostToOrganization, type Organization } from '../context/useOrganizations';
import { messageOf } from '../api/gateway';
import type { Post } from '../types';
import { MediaPicker } from './MediaPicker';
import { PostCard } from './PostCard';
import { PostComposer } from './post/PostComposer';
import {
  ConfirmDialog,
  EmptyState,
  InlineError,
  ListSkeleton,
  OverflowMenu,
  PageHeader,
  ResponsiveDialog,
  SectionHeader,
  StatusChip,
  Surface,
  T,
  UserAvatar,
  UserLine,
  mutedSx,
  sectionTitleSx,
  subtleSx,
} from './ui';
import { Alert, Box, Button, ButtonBase, IconButton, InputAdornment, Tab, Tabs, TextField, Typography } from '@mui/material';
import { ArrowLeft, Building2, Search, Trash2, UserMinus, X } from 'lucide-react';

const TOUCH_TARGET = { minHeight: 44, minWidth: 44 };
/** The pill button: a 44px target with the full radius token. */
const PILL_BUTTON = { ...TOUCH_TARGET, borderRadius: 'var(--ui-radius-full)', px: 2 };
const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;

const EMPTY_FORM = { name: '', description: '', logo: '' };

type OrganizationTab = 'posts' | 'members';

/**
 * Organizations (M8): browse, create, join, leave and delete, with each organization's
 * members. Every control is driven by the loaded rows: the owner sees Delete, a member sees
 * Leave, anyone else sees Join. Nothing is shown as success before the server accepts it.
 */
export const OrganizationsTab: React.FC = () => {
  const {
    organizations,
    organizationsLoading,
    organizationsError,
    loadOrganizations,
    createOrganization,
    joinOrganization,
    leaveOrganization,
    deleteOrganization,
    organizationMembers,
    loadOrganizationMembers,
    selectedOrganizationId,
    setSelectedOrganizationId,
    openProfile,
    personView,
    currentUser,
    organizationPosts,
    organizationPostsLoading,
    loadOrganizationPosts,
    removePostFromOrganization,
    removeOrganizationMember,
    showToast,
  } = useApp();
  // The first load is pending: show placeholders, not a false "no organizations".
  const listPending = Boolean(organizationsLoading) && organizations.length === 0;
  const [filter, setFilter] = useState('');
  // The organization whose join or leave request is in flight; its button is disabled meanwhile.
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // The organization page: which tab is open, and what the owner is about to remove (M11).
  const [tab, setTab] = useState<OrganizationTab>('posts');
  const [postToRemove, setPostToRemove] = useState<Post | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const active = organizations.find((o) => o.id === selectedOrganizationId) ?? null;
  const activeMemberCount = active?.memberCount;

  // Opening an organization reads its posts (its page opens on the Posts tab).
  useEffect(() => {
    setTab('posts');
    if (selectedOrganizationId) loadOrganizationPosts(selectedOrganizationId).catch(() => {});
  }, [selectedOrganizationId]);

  // Opening an organization reads its members; a join or leave refreshes them.
  useEffect(() => {
    if (selectedOrganizationId && active) loadOrganizationMembers(selectedOrganizationId).catch(() => {});
    // `active` is re-read on every render; the member count is what changes the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganizationId, activeMemberCount]);

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
    const name = form.name.trim();
    if (!name) {
      setFormError('Give the organization a name.');
      return;
    }
    if (name.length > NAME_MAX) {
      setFormError(`The name must be ${NAME_MAX} characters or fewer.`);
      return;
    }
    if (form.description.trim().length > DESCRIPTION_MAX) {
      setFormError(`The description must be ${DESCRIPTION_MAX} characters or fewer.`);
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await createOrganization({
        name,
        description: form.description,
        ...(form.logo ? { logo: form.logo } : {}),
      });
      setCreateOpen(false);
      showToast(`Organization "${name}" created. You are its owner.`, 'success');
    } catch (err) {
      if (err instanceof OrganizationKeptError) {
        // The organization exists; closing the dialog keeps the user from creating it twice.
        setCreateOpen(false);
        showToast(err.message, 'error');
      } else {
        setFormError(messageOf(err, 'The organization was not created'));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (org: Organization) => {
    setBusyId(org.id);
    const leaving = org.myMembershipId !== null;
    const changed = leaving ? await leaveOrganization(org.id) : await joinOrganization(org.id);
    setBusyId(null);
    if (changed) showToast(leaving ? `You left ${org.name}.` : `You joined ${org.name}.`, 'success');
  };

  // The membership control for one organization: Owner chip, Leave (Joined) or Join.
  const membershipControl = (org: Organization, compact: boolean) => {
    if (org.myMembershipId && org.isOwner) return <StatusChip label="Owner" tone="primary" />;
    const busy = busyId === org.id;
    if (org.myMembershipId) {
      return (
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          onClick={() => handleToggle(org)}
          aria-label={`Leave ${org.name}`}
          sx={{ ...PILL_BUTTON, fontSize: 'var(--ui-fs-xs)', ...(compact ? {} : { px: 2.5 }) }}
        >
          Joined
        </Button>
      );
    }
    return (
      <Button
        size="small"
        variant="contained"
        disabled={busy}
        onClick={() => handleToggle(org)}
        aria-label={`Join ${org.name}`}
        sx={{ ...PILL_BUTTON, fontSize: 'var(--ui-fs-xs)', ...(compact ? {} : { px: 2.5 }) }}
      >
        Join
      </Button>
    );
  };

  const query = filter.trim().toLowerCase();
  const filtered = organizations.filter((o) => o.name.toLowerCase().includes(query));

  const createButton = (
    <Button variant="contained" onClick={openCreate} sx={PILL_BUTTON}>
      Create organization
    </Button>
  );

  const createDialog = (
    <ResponsiveDialog
      open={createOpen}
      onClose={closeCreate}
      title="Create an organization"
      actions={
        <>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ ...TOUCH_TARGET, color: T.muted }}>
            Cancel
          </Button>
          <Button type="submit" form="create-organization-form" variant="contained" disabled={creating} sx={PILL_BUTTON}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="create-organization-form" onSubmit={handleCreate} noValidate>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            size="small"
            fullWidth
            required
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
            helperText={`${form.name.length}/${NAME_MAX}`}
          />
          <TextField
            size="small"
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX } }}
            helperText={`${form.description.length}/${DESCRIPTION_MAX}`}
          />
          <MediaPicker
            kind="image"
            label="Logo (optional)"
            value={form.logo || undefined}
            onChange={(url) => setForm({ ...form, logo: url ?? '' })}
          />
        </Box>
      </form>
    </ResponsiveDialog>
  );

  // ---------- Organization page ----------
  if (selectedOrganizationId) {
    const back = (
      <Button
        variant="text"
        onClick={() => setSelectedOrganizationId(null)}
        startIcon={<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />}
        sx={{ ...TOUCH_TARGET, alignSelf: 'flex-start', color: T.muted, fontWeight: 600, fontSize: 'var(--ui-fs-xs)' }}
      >
        All organizations
      </Button>
    );

    if (!active) {
      return (
        <Box id="organizations-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
          {back}
          {listPending ? (
            <ListSkeleton rows={3} />
          ) : (
            <Surface as="section">
              <EmptyState
                title="This organization is not available"
                body="It may have been deleted, or the list has not loaded yet."
                action={{ label: 'All organizations', onClick: () => setSelectedOrganizationId(null), ariaLabel: 'Back to all organizations' }}
              />
            </Surface>
          )}
        </Box>
      );
    }

    const owner = personView(active.ownerId);
    const members = organizationMembers[active.id];

    return (
      <Box id="organizations-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
        {back}

        <Surface as="section" padding="none" sx={{ overflow: 'hidden' }}>
          <Box aria-hidden="true" sx={{ height: 80, bgcolor: T.primarySoft }} />
          <Box
            sx={{
              px: 'var(--ui-card-pad)',
              pb: 'var(--ui-card-pad)',
              mt: -4,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { md: 'flex-start' },
              justifyContent: 'space-between',
              gap: 2,
              minWidth: 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0 }}>
              <Box sx={{ border: `4px solid ${T.surface}`, borderRadius: 'var(--ui-radius-lg)', lineHeight: 0, flexShrink: 0 }}>
                <UserAvatar name={active.name} src={active.logo ?? null} size="xl" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h1" sx={{ ...sectionTitleSx, fontSize: 'var(--ui-fs-xl)', overflowWrap: 'anywhere' }}>
                  {active.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {active.verified && <StatusChip label="Verified" tone="success" />}
                  <Typography sx={{ ...subtleSx, color: T.success, fontWeight: 600 }}>
                    {active.memberCount.toLocaleString()} {active.memberCount === 1 ? 'member' : 'members'}
                  </Typography>
                </Box>
                {active.description && (
                  <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-sm)', mt: 0.5, maxWidth: 560, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                    {active.description}
                  </Typography>
                )}
                <Box sx={{ mt: 1.5 }}>
                  <UserLine
                    name={owner.name}
                    handle={owner.handle}
                    avatarSrc={owner.avatar}
                    size="sm"
                    onOpen={() => openProfile(active.ownerId)}
                    meta={<Typography sx={subtleSx}>Owner</Typography>}
                  />
                </Box>
              </Box>
            </Box>
            <Box sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', md: 'center' }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {membershipControl(active, false)}
              {active.isOwner && (
                <OverflowMenu
                  label={`More actions for ${active.name}`}
                  items={[{ id: 'delete', label: 'Delete organization', icon: Trash2, danger: true, onSelect: () => setConfirmDeleteOpen(true) }]}
                />
              )}
            </Box>
          </Box>
        </Surface>

        <Tabs
          value={tab}
          onChange={(_, value: OrganizationTab) => setTab(value)}
          aria-label="Organization sections"
          sx={{ minHeight: 44, borderBottom: `1px solid ${T.border}` }}
        >
          <Tab value="posts" label="Posts" sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} />
          <Tab value="members" label="Members" sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {tab === 'posts' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
            {/* Only the owner and admins post for the organization, with the same composer as Home (M9). */}
            {canPostToOrganization(active) ? (
              <PostComposer
                key={active.id}
                target={{ kind: 'organization', id: active.id, name: active.name }}
                placeholder={`Share something from ${active.name}`}
                label={`Post as part of ${active.name}`}
                onPosted={() => { loadOrganizationPosts(active.id).catch(() => {}); }}
              />
            ) : (
              <Surface as="section">
                <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-sm)' }}>
                  Only the owner and admins can post for {active.name}.
                </Typography>
              </Surface>
            )}

            <SectionHeader title={`Posts from ${active.name}`} />

            {organizationPostsLoading && organizationPosts.length === 0 && <ListSkeleton rows={2} />}
            {!(organizationPostsLoading && organizationPosts.length === 0) && organizationPosts.length === 0 && (
              <EmptyState title={`No posts from ${active.name} yet`} body="Posts shared for this organization will appear in this list." />
            )}
            {organizationPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                // The owner can take someone else's post out of this organization. Their own posts
                // are removed with "Delete post" instead.
                extraMenuItems={active.isOwner && post.authorId !== currentUser.id
                  ? [{ id: 'remove-from-organization', label: 'Remove from organization', icon: X, danger: true, onSelect: () => setPostToRemove(post) }]
                  : undefined}
              />
            ))}
          </Box>
        )}

        {tab === 'members' && (
          <Surface as="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <SectionHeader title="Members" />
            {members === undefined && <ListSkeleton rows={3} />}
            {members !== undefined && members.length === 0 && (
              <EmptyState compact title="No members yet" body="People who join this organization will appear here." />
            )}
            {members !== undefined && members.length > 0 && (
              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {members.map((m) => (
                  <Box component="li" key={m.id}>
                    <UserLine
                      name={m.name}
                      handle={m.handle}
                      avatarSrc={m.avatar}
                      onOpen={() => openProfile(m.userId)}
                      meta={<StatusChip label={m.role === 'owner' ? 'Owner' : 'Member'} tone={m.role === 'owner' ? 'primary' : 'neutral'} />}
                      // Owner only, and never on the owner row.
                      trailing={active.isOwner && m.role !== 'owner' ? (
                        <IconButton
                          aria-label={`Remove ${m.name}`}
                          onClick={() => setMemberToRemove({ id: m.id, name: m.name })}
                          sx={{ ...TOUCH_TARGET, color: T.danger, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 } }}
                        >
                          <UserMinus aria-hidden="true" size={18} strokeWidth={1.75} />
                        </IconButton>
                      ) : undefined}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Surface>
        )}

        {active.isOwner && (
          <>
            <ConfirmDialog
              open={confirmDeleteOpen}
              title="Delete this organization?"
              body="It is removed for everyone. This cannot be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                await deleteOrganization(active.id);
                setSelectedOrganizationId(null);
                showToast('Organization deleted', 'success');
              }}
              onClose={() => setConfirmDeleteOpen(false)}
            />
            {/* Owner moderation (M11): take a post out of the organization, or remove a member. */}
            <ConfirmDialog
              open={postToRemove !== null}
              title={`Remove this post from ${active.name}?`}
              body={postToRemove ? `It stays on ${postToRemove.author.name}'s profile.` : undefined}
              confirmLabel="Remove"
              destructive
              onConfirm={async () => {
                if (!postToRemove) return;
                await removePostFromOrganization(active.id, postToRemove.id);
                showToast('Post removed from the organization', 'success');
              }}
              onClose={() => setPostToRemove(null)}
            />
            <ConfirmDialog
              open={memberToRemove !== null}
              title={memberToRemove ? `Remove ${memberToRemove.name} from this organization?` : 'Remove this member?'}
              body="They are no longer a member. They can join again."
              confirmLabel="Remove"
              destructive
              onConfirm={async () => {
                if (!memberToRemove) return;
                await removeOrganizationMember(active.id, memberToRemove.id);
                showToast(`${memberToRemove.name} was removed from the organization`, 'success');
              }}
              onClose={() => setMemberToRemove(null)}
            />
          </>
        )}
        {createDialog}
      </Box>
    );
  }

  // ---------- Organization list ----------
  return (
    <Box id="organizations-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      <PageHeader
        title="Organizations"
        description="Groups of people who work on the same thing, from companies to clubs."
        actions={createButton}
      />

      <Surface as="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionHeader title="Find organizations" />
        <TextField
          size="small"
          fullWidth
          placeholder="Search organizations"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: T.muted }} />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Search organizations' },
          }}
        />
        {organizationsError && (
          <InlineError message={organizationsError} onRetry={() => { loadOrganizations().catch(() => {}); }} />
        )}
      </Surface>

      {listPending && <ListSkeleton rows={3} />}

      {!listPending && !organizationsError && organizations.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          body="Create the first one and invite people to join it."
          action={{ label: 'Create organization', onClick: openCreate }}
        />
      )}

      {!listPending && organizations.length > 0 && filtered.length === 0 && (
        <EmptyState icon={Building2} title="No organizations match your search" body="Try another name." />
      )}

      {filtered.length > 0 && (
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            p: 0,
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 'var(--ui-gap)',
          }}
        >
          {filtered.map((org) => (
            <Box component="li" key={org.id} sx={{ minWidth: 0 }}>
              <Surface as="article" sx={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                <ButtonBase
                  onClick={() => setSelectedOrganizationId(org.id)}
                  aria-label={`Open ${org.name}`}
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: 1.5,
                    minWidth: 0,
                    textAlign: 'left',
                    borderRadius: 'var(--ui-radius-sm)',
                    '&:hover': { bgcolor: T.surface2 },
                    '&:active': { bgcolor: T.surface3 },
                    '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
                  }}
                >
                  <UserAvatar name={org.name} src={org.logo ?? null} size="md" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="span" sx={{ ...sectionTitleSx, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {org.name}
                    </Typography>
                    <Typography component="span" sx={{ ...subtleSx, display: 'block', fontFamily: 'var(--font-mono)' }}>
                      {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
                    </Typography>
                  </Box>
                </ButtonBase>

                {org.verified && (
                  <Box>
                    <StatusChip label="Verified" tone="success" />
                  </Box>
                )}
                {org.description && (
                  <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {org.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>{membershipControl(org, true)}</Box>
              </Surface>
            </Box>
          ))}
        </Box>
      )}

      {createDialog}
    </Box>
  );
};
