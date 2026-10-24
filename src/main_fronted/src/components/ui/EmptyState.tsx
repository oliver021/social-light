import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import type { LucideIcon } from 'lucide-react';
import { cardSx, mutedSx, sectionTitleSx, touchTargetSx } from './tokens';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void; ariaLabel?: string };
  /** Shorter padding and no card border, for use inside a strip such as Stories. */
  compact?: boolean;
}

// One empty-state pattern for every tab: icon, a plain title, one line of help and at
// most one button that moves the user forward.
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, body, action, compact = false }) => (
  <Box
    component="section"
    sx={compact ? { display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1 } : { ...cardSx, textAlign: 'center', p: 3 }}
  >
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
      {Icon && !compact && <Icon aria-hidden="true" className="w-6 h-6 text-primary" />}
      <Typography component="h3" sx={compact ? { ...mutedSx, fontWeight: 600 } : { ...sectionTitleSx, fontSize: '0.9375rem' }}>
        {title}
      </Typography>
      {body && <Typography sx={{ ...mutedSx, maxWidth: 360 }}>{body}</Typography>}
      {action && (
        <Button
          variant="contained"
          size="medium"
          onClick={action.onClick}
          aria-label={action.ariaLabel}
          sx={{ ...touchTargetSx, mt: 1, textTransform: 'none', fontWeight: 600, borderRadius: 999, px: 2.5 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  </Box>
);
