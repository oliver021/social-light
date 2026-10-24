import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { messageOf } from '../../api/gateway';
import { AsyncButton } from './AsyncButton';
import { InlineError } from './InlineError';
import { mutedSx } from './tokens';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Runs the action. Resolve to close the dialog; reject to keep it open with the message. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * Asks before an irreversible step. Cancel is focused by default when destructive. While the
 * action runs the dialog cannot be dismissed. A failure stays in the dialog as an alert.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  destructive = false,
  onConfirm,
  onClose,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setError(null);
    setPending(true);
    try {
      await onConfirm();
      setPending(false);
      onClose();
    } catch (err) {
      setError(messageOf(err, 'Something went wrong. Try again.'));
      setPending(false);
    }
  };

  const handleClose = () => {
    if (pending) return;
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 700 }}>
        {title}
      </DialogTitle>
      {body && (
        <DialogContent>
          <Typography sx={mutedSx}>{body}</Typography>
        </DialogContent>
      )}
      {error && (
        <DialogContent sx={{ pt: 0 }}>
          <InlineError message={error} />
        </DialogContent>
      )}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={pending} autoFocus={destructive} sx={{ minHeight: 44 }}>
          Cancel
        </Button>
        <AsyncButton
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          onClick={handleConfirm}
          autoFocus={!destructive}
          sx={{ minHeight: 44 }}
        >
          {confirmLabel}
        </AsyncButton>
      </DialogActions>
    </Dialog>
  );
};
