import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Box, 
  Card, 
  Typography, 
  Avatar, 
  Button, 
  TextField, 
  Divider, 
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { 
  User, 
  Edit3, 
  CheckCircle, 
  Tag, 
  Plus, 
  Settings, 
  Eye, 
  BookOpen,
  Cpu
} from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl, unMediaUrl, messageOf } from '../api/gateway';

/** A handle is 3 to 30 letters, digits, dots or underscores (the API stores up to 50). */
const HANDLE_PATTERN = /^[A-Za-z0-9_.]{3,30}$/;

interface FieldErrors {
  name?: string;
  handle?: string;
}

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

  // Interest Tag input
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

  const handleAddTag = () => {
    if (newTag.trim() && !currentUser.interests.includes(newTag.trim())) {
      updateProfile({
        interests: [...currentUser.interests, newTag.trim()]
      }).catch(() => {});
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateProfile({
      interests: currentUser.interests.filter(i => i !== tag)
    }).catch(() => {});
  };

  return (
    <Box id="profile-tab-page" className="space-y-4">
      {/* COVER PHOTO AND HERO BANNER */}
      <Card variant="outlined" className="border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden relative pb-4">
        {/* Banner Cover image */}
        <Box className="h-44 w-full overflow-hidden relative">
          <img 
            src={currentUser.coverPhoto} 
            alt="User profile mesh background cover" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </Box>

        {/* Profile Avatar & Actions offset */}
        <Box className="px-6 flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12 relative z-10">
          <Box className="flex flex-col md:flex-row md:items-end gap-3 text-left min-w-0">
            <Avatar
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-24 h-24 shrink-0 border-4 border-white dark:border-zinc-950 shadow-lg"
            />
            <Box className="md:pb-1 min-w-0">
              <Typography variant="h6" className="font-display font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 leading-none text-base break-words">
                {currentUser.name}
                <CheckCircle className="w-4 h-4 text-primary fill-current" />
              </Typography>
              <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 block text-xs mt-0.5">
                {currentUser.handle}
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={openEditor}
            className="normal-case text-xs font-semibold font-display border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl flex items-center gap-1.5 py-1.5 px-3 min-h-[44px] md:min-h-8 self-start md:self-end"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit profile
          </Button>
        </Box>
      </Card>

      <Grid container spacing={2}>
        {/* LEFT COLUMN DETAILS AND BIO SUMMARY */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 flex flex-col gap-3">
            <Box className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary dark:text-primary" />
              <Typography variant="subtitle2" className="font-display font-semibold text-zinc-800 dark:text-zinc-200">
                About
              </Typography>
            </Box>

            <Typography variant="body2" className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed pr-2">
              {currentUser.bio}
            </Typography>

            <Divider />

            <Box className="flex items-center justify-around text-center py-2">
              <Box>
                <Typography variant="subtitle2" className="font-bold font-mono text-zinc-800 dark:text-zinc-100">
                  {currentUser.followersCount}
                </Typography>
                <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs uppercase font-bold tracking-wider block mt-0.5">Followers</Typography>
              </Box>
              <Box className="w-[1px] h-8 bg-zinc-200 dark:bg-zinc-800" />
              <Box>
                <Typography variant="subtitle2" className="font-bold font-mono text-zinc-800 dark:text-zinc-100">
                  {currentUser.followingCount}
                </Typography>
                <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs uppercase font-bold tracking-wider block mt-0.5">Following</Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* RIGHT COLUMN DYNAMIC INTERESTS CONFIGY */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" id="profile-interests-card" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 flex flex-col gap-3">
            <Box className="flex items-center justify-between">
              <Box className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                <Typography variant="subtitle2" className="font-display font-semibold text-zinc-800 dark:text-zinc-200">
                  Interests
                </Typography>
              </Box>
            </Box>

            {/* INTERESTS CHIP HOLDER */}
            <Box className="flex flex-wrap gap-1.5 min-h-[44px] align-items-center">
              {currentUser.interests.map((tag) => (
                <Chip 
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                  className="bg-zinc-100 dark:bg-zinc-90 text-xs font-mono hover:bg-zinc-200 dark:hover:bg-zinc-800"
                />
              ))}
            </Box>

            <Divider />

            {/* ADD QUICK NEW INTEREST */}
            <Box className="flex gap-2">
              <TextField
                size="small"
                fullWidth
                placeholder="Add an interest"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                variant="outlined"
                className="bg-zinc-50/50 dark:bg-zinc-900 text-xs min-w-0"
                slotProps={{
                  input: {
                    className: 'text-xs pr-1 py-1'
                  },
                  htmlInput: { 'aria-label': 'New interest' }
                }}
              />
              <IconButton
                size="small"
                aria-label="Add interest"
                onClick={handleAddTag}
                className="bg-emerald-600 text-white hover:bg-emerald-700 w-11 h-11 shrink-0"
                style={{ borderRadius: '8px' }}
              >
                <Plus className="w-4 h-4 text-white" />
              </IconButton>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* DISPATCH EDIT PROFILE POP DIALOG */}
      <Dialog 
        open={editOpen} 
        onClose={() => { if (!saving) setEditOpen(false); }}
        slotProps={{
          paper: {
            className: 'w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2'
          }
        }}
      >
        <DialogTitle className="font-display font-bold text-sm text-zinc-800 dark:text-zinc-200 pb-2">
          Edit profile
        </DialogTitle>
        <form onSubmit={handleProfileUpdate} noValidate>
          <DialogContent className="space-y-3.5 pt-2">
            {saveError && <Alert severity="error" className="text-xs">{saveError}</Alert>}
            <TextField
              size="small"
              fullWidth
              label="Display Name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
              slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
            />
            <TextField
              size="small"
              fullWidth
              label="Unique Handle"
              value={editedHandle}
              onChange={(e) => setEditedHandle(e.target.value)}
              error={!!fieldErrors.handle}
              helperText={fieldErrors.handle}
              slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
            />
            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              label="Profile Bio Summary"
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
              slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
            />
            
            <MediaPicker
              kind="image"
              label="Avatar"
              value={editedAvatar || undefined}
              onChange={(url) => setEditedAvatar(url ?? '')}
            />
          </DialogContent>
          <DialogActions className="pr-4 pb-4">
            <Button size="small" onClick={() => setEditOpen(false)} disabled={saving} className="text-xs text-zinc-600 dark:text-zinc-400 normal-case">Cancel</Button>
            <Button 
              size="small" 
              type="submit"
              variant="contained" 
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs normal-case px-4.5"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
