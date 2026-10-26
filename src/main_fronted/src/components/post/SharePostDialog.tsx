import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, TextField, Typography } from '@mui/material';
import type { Post } from '../../types';
import { AsyncButton } from '../ui/AsyncButton';
import { InlineError } from '../ui/InlineError';
import { ResponsiveDialog } from '../ui/ResponsiveDialog';
import { T } from '../ui/tokens';

/** Longest message a share can carry. */
export const SHARE_MESSAGE_LIMIT = 500;

export interface SharePostDialogProps {
  post: Post;
  open: boolean;
  onClose: () => void;
}

/**
 * Share a post, optionally with a message. Sharing with an empty message is the plain share.
 * The dialog closes only after the server accepts the share; on failure it stays open with
 * the reason, so the message is not lost.
 */
export const SharePostDialog: React.FC<SharePostDialogProps> = ({ post, open, onClose }) => {
  const { sharePost } = useApp();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Cancelling discards the typed message; the dialog is remounted for each share.
  const handleClose = () => {
    setMessage('');
    setError(null);
    onClose();
  };

  const share = async () => {
    setError(null);
    try {
      await sharePost(post.id, message);
      setMessage('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The post was not shared');
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title="Share post"
      actions={
        <AsyncButton variant="contained" onClick={share} sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44, px: 2.5, borderRadius: 'var(--ui-radius-full)' }}>
          Share
        </AsyncButton>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
        <TextField
          multiline
          minRows={3}
          fullWidth
          placeholder="Say something about this…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'Message to share', maxLength: SHARE_MESSAGE_LIMIT },
          }}
        />
        <Typography
          aria-live="polite"
          sx={{ alignSelf: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: message.length >= SHARE_MESSAGE_LIMIT ? T.danger : T.muted }}
        >
          {message.length}/{SHARE_MESSAGE_LIMIT}
        </Typography>
        {error && <InlineError message={error} />}
      </Box>
    </ResponsiveDialog>
  );
};
