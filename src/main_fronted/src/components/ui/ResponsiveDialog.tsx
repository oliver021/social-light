import React, { useId } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
  type DialogProps,
} from '@mui/material';
import { X } from 'lucide-react';
import { T } from './tokens';

export type ResponsiveDialogProps = Omit<DialogProps, 'title'> & {
  title: string;
  actions?: React.ReactNode;
};

/**
 * The dialog for every create or edit form. Full screen below 640px, a centred sheet above,
 * with a title row and a Close button named "Close".
 */
export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({ title, actions, children, onClose, ...rest }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      onClose={onClose}
      aria-labelledby={titleId}
      {...rest}
    >
      <DialogTitle id={titleId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
        <Typography component="span" sx={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1.0625rem' }}>
          {title}
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={(e) => onClose?.(e, 'backdropClick')}
          sx={{ width: 44, height: 44, color: T.muted }}
        >
          <X aria-hidden="true" className="w-5 h-5" />
        </IconButton>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions sx={{ px: 3, pb: 2 }}>{actions}</DialogActions>}
    </Dialog>
  );
};
