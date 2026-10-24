import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Edit3, Plus, X } from 'lucide-react';
import {
  EmptyState,
  PageHeader,
  ResponsiveDialog,
  SectionHeader,
  Surface,
  T,
  UserAvatar,
  mutedSx,
  sectionTitleSx,
  subtleSx,
} from './ui';
import { MediaPicker } from './MediaPicker';
import { mediaUrl, unMediaUrl, messageOf } from '../api/gateway';

const TOUCH_TARGET = { minHeight: 44, minWidth: 44 };
/** The pill button: a 44px target with the full radius token. */
const PILL_BUTTON = { ...TOUCH_TARGET, borderRadius: 'var(--ui-radius-full)', px: 2 };

/** A handle is 3 to 30 letters, digits, dots or underscores (the API stores up to 50). */
const HANDLE_PATTERN = /^[A-Za-z0-9_.]{3,30}$/;

interface FieldErrors {
  name?: string;
  handle?: string;
}

const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ ...sectionTitleSx, fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{value}</Typography>
    <Typography sx={{ ...subtleSx, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', mt: 0.25 }}>{label}</Typography>
  </Box>
);

export const ProfileTab: React.FC = () => {
  const { currentUser, updateProfile, showToast } = useApp();

  // Local edit states. editedAvatar holds the backend url (root-relative after an upload).
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedHandle, setEditedHandle] = useState('');
  const [editedAvatar, setEditedAvatar] = useState('');

  // Interest tag input
  const [newTag, setNewTag] = useState('');

  // Start every edit from the saved profile, not from whatever was typed last time.
  const openEditor = () => {
    setEditedName(currentUser.name);
    setEditedBio(currentUser.bio);
    setEditedHandle(currentUser.username);
    setEditedAvatar(unMediaUrl(currentUser.avatar) ?? '');
    setFieldErrors({});
    setSaveError(null);
    setEditOpen(true);
  };

  const closeEditor = () => {
    if (!saving) setEditOpen(false);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editedName.trim();
    const handle = editedHandle.trim().replace(/^@/, '');
    const errors: FieldErrors = {};
    if (!name) errors.name = 'Enter a display name.';
    if (handle && !HANDLE_PATTERN.test(handle)) {
      errors.handle = '3 to 30 letters, numbers, dots or underscores. Leave empty for no handle.';
    }
    setFieldErrors(errors);
    if (errors.name || errors.handle) return;

    setSaving(true);
    setSaveError(null);
    try {
      // The handle is sent exactly as typed (without '@'); an empty one clears it.
      await updateProfile({
        name,
        bio: editedBio.trim(),
        username: handle,
        avatar: mediaUrl(editedAvatar) ?? undefined,
      });
      setEditOpen(false);
      showToast('Profile saved.', 'success');
    } catch (err) {
      // Stay in the dialog and show why, so nothing is reported as saved when it was not.
      setSaveError(messageOf(err, 'Your profile was not saved'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (e?: React.FormEvent) => {
    e?.preventDefault();
    const tag = newTag.trim();
    if (!tag || currentUser.interests.includes(tag)) return;
    updateProfile({ interests: [...currentUser.interests, tag] }).catch((err) => {
      showToast(messageOf(err, 'The interest was not saved'), 'error');
    });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    updateProfile({ interests: currentUser.interests.filter(i => i !== tag) }).catch((err) => {
      showToast(messageOf(err, 'The interest was not removed'), 'error');
    });
  };

  return (
    <Box id="profile-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      <PageHeader title="Profile" />

      {/* COVER AND HERO */}
      <Surface as="section" padding="none" sx={{ overflow: 'hidden', pb: 'var(--ui-card-pad)' }}>
        <Box sx={{ height: 176, width: '100%', overflow: 'hidden', bgcolor: T.primarySoft }}>
          {currentUser.coverPhoto && (
            <Box
              component="img"
              src={currentUser.coverPhoto}
              alt={`Cover photo of ${currentUser.name}`}
              referrerPolicy="no-referrer"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </Box>

        <Box
          sx={{
            px: 'var(--ui-card-pad)',
            mt: -6,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'flex-end' },
            justifyContent: 'space-between',
            gap: 2,
            minWidth: 0,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'flex-end' }, gap: 1.5, minWidth: 0 }}>
            <Box sx={{ border: `4px solid ${T.surface}`, borderRadius: 'var(--ui-radius-full)', display: 'inline-flex', lineHeight: 0, alignSelf: 'flex-start' }}>
              <UserAvatar name={currentUser.name} src={currentUser.avatar} size="xl" />
            </Box>
            <Box sx={{ minWidth: 0, pb: { md: 0.5 } }}>
              <Typography component="h2" sx={{ ...sectionTitleSx, fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 700, overflowWrap: 'anywhere' }}>
                {currentUser.name}
              </Typography>
              <Typography sx={{ ...subtleSx, fontFamily: 'var(--font-mono)' }}>{currentUser.handle}</Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            onClick={openEditor}
            startIcon={<Edit3 size={16} strokeWidth={1.75} aria-hidden="true" />}
            sx={{ ...PILL_BUTTON, alignSelf: { xs: 'flex-start', md: 'flex-end' }, color: T.text, borderColor: T.borderStrong, fontSize: 'var(--ui-fs-xs)' }}
          >
            Edit profile
          </Button>
        </Box>
      </Surface>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
          gap: 'var(--ui-gap)',
          alignItems: 'start',
        }}
      >
        {/* ABOUT */}
        <Surface as="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionHeader title="About" />
          <Typography sx={{ ...mutedSx, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
            {currentUser.bio || 'No bio yet.'}
          </Typography>
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', textAlign: 'center', py: 1 }}>
            <Stat value={currentUser.followersCount} label="Followers" />
            <Divider orientation="vertical" flexItem />
            <Stat value={currentUser.followingCount} label="Following" />
          </Box>
        </Surface>

        {/* INTERESTS */}
        <Box id="profile-interests-card" sx={{ minWidth: 0 }}>
          <Surface as="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
            <SectionHeader title="Interests" />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', minHeight: 44 }}>
              {currentUser.interests.length === 0 ? (
                <EmptyState compact title="No interests yet" body="Add a few topics to show what you care about." />
              ) : (
                currentUser.interests.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    deleteIcon={<X size={14} strokeWidth={1.75} role="button" aria-label={`Remove interest ${tag}`} />}
                    size="small"
                    sx={{ bgcolor: T.surface2, color: T.text, fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)' }}
                  />
                ))
              )}
            </Box>

            <Divider />

            {/* ADD AN INTEREST */}
            <Box component="form" onSubmit={handleAddTag} noValidate sx={{ display: 'flex', gap: 1, minWidth: 0 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Add an interest"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                variant="outlined"
                sx={{ minWidth: 0 }}
                slotProps={{ htmlInput: { 'aria-label': 'New interest' } }}
              />
              <IconButton
                type="submit"
                aria-label="Add interest"
                sx={{
                  ...TOUCH_TARGET,
                  flexShrink: 0,
                  borderRadius: 'var(--ui-radius-sm)',
                  bgcolor: T.primary,
                  color: T.onPrimary,
                  '&:hover': { bgcolor: T.primaryHover },
                }}
              >
                <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            </Box>
          </Surface>
        </Box>
      </Box>

      {/* EDIT PROFILE */}
      <ResponsiveDialog
        open={editOpen}
        onClose={closeEditor}
        title="Edit profile"
        actions={
          <>
            <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ ...TOUCH_TARGET, color: T.muted }}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-profile-form"
              variant="contained"
              disabled={saving}
              sx={PILL_BUTTON}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </>
        }
      >
        <form id="edit-profile-form" onSubmit={handleProfileUpdate} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              size="small"
              fullWidth
              label="Display name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
            />
            <TextField
              size="small"
              fullWidth
              label="Handle"
              value={editedHandle}
              onChange={(e) => setEditedHandle(e.target.value)}
              error={!!fieldErrors.handle}
              helperText={fieldErrors.handle ?? 'Optional. Letters, numbers, dots or underscores.'}
            />
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label="Bio"
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
            />
            <MediaPicker
              kind="image"
              label="Avatar"
              value={editedAvatar || undefined}
              onChange={(url) => setEditedAvatar(url ?? '')}
            />
          </Box>
        </form>
      </ResponsiveDialog>
    </Box>
  );
};
