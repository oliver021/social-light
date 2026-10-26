import React, { useEffect, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import { useApp } from '../../context/AppContext';
import { messageOf } from '../../api/gateway';
import { EmptyState, ResponsiveDialog, T, UserLine } from '../ui';

const TITLE_MAX = 60;
const MIN_MEMBERS = 2;

export interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creates a group from the people I follow: a title (required, up to 60 characters) and two or
 * more members. The group is created first, then members are added; a member who cannot be
 * added is named in a toast, and the group is kept.
 */
export const NewGroupDialog: React.FC<NewGroupDialogProps> = ({ open, onClose }) => {
  const { people, isFollowing, createGroupChat, openChat, showToast } = useApp();
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Each opening starts from an empty form.
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setPicked([]);
    setError('');
  }, [open]);

  const followed = people.filter((p) => isFollowing(p.userId));
  const trimmed = title.trim();
  const canCreate = trimmed.length > 0 && trimmed.length <= TITLE_MAX && picked.length >= MIN_MEMBERS && !busy;

  const toggle = (userId: string) => {
    setPicked((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    setError('');
    try {
      const { chatId, failedUserIds } = await createGroupChat(trimmed, picked);
      if (failedUserIds.length > 0) {
        const names = failedUserIds.map((id) => people.find((p) => p.userId === id)?.name ?? 'a member');
        showToast(`Could not add ${names.join(', ')}. The group was kept.`);
      }
      openChat(chatId);
      onClose();
    } catch (err) {
      setError(messageOf(err, 'The group was not created'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title="New group"
      actions={
        <>
          <Button onClick={onClose} sx={{ minHeight: 44, textTransform: 'none', color: T.muted }}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={!canCreate} sx={{ minHeight: 44, textTransform: 'none' }}>
            {busy ? 'Creating...' : 'Create group'}
          </Button>
        </>
      }
    >
      <Box component="form" onSubmit={(e) => { e.preventDefault(); create(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Group name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          helperText={`Up to ${TITLE_MAX} characters.`}
          slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
        />

        <Box>
          <Typography component="h3" sx={{ fontWeight: 600, fontSize: 'var(--ui-fs-sm)', mb: 1 }}>
            Members (at least {MIN_MEMBERS})
          </Typography>
          {followed.length === 0 ? (
            <EmptyState compact title="Follow people to add them to a group." />
          ) : (
            followed.map((p) => (
              <FormControlLabel
                key={p.userId}
                sx={{ display: 'flex', minHeight: 44, mx: 0, alignItems: 'center' }}
                control={<Checkbox checked={picked.includes(p.userId)} onChange={() => toggle(p.userId)} />}
                label={<UserLine name={p.name} handle={p.handle} avatarSrc={p.avatar} size="sm" />}
              />
            ))
          )}
        </Box>

        {error && <Typography role="alert" sx={{ color: T.danger, fontSize: 'var(--ui-fs-sm)' }}>{error}</Typography>}
      </Box>
    </ResponsiveDialog>
  );
};
