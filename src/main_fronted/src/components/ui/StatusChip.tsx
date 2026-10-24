import React from 'react';
import { Chip } from '@mui/material';
import { T } from './tokens';

export type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONE: Record<StatusTone, { bg: string; fg: string }> = {
  neutral: { bg: T.surface3, fg: T.muted },
  primary: { bg: T.primarySoft, fg: T.primary },
  success: { bg: T.successSoft, fg: T.success },
  warning: { bg: T.warningSoft, fg: T.warning },
  danger: { bg: T.dangerSoft, fg: T.danger },
};

export interface StatusChipProps {
  label: string;
  tone?: StatusTone;
}

/** A small pill for a state (e.g. "Pending", "Sold"). Colour comes only from the tokens. */
export const StatusChip: React.FC<StatusChipProps> = ({ label, tone = 'neutral' }) => (
  <Chip
    label={label}
    size="small"
    sx={{ bgcolor: TONE[tone].bg, color: TONE[tone].fg, fontWeight: 600, fontSize: 'var(--ui-fs-xs)', height: 22 }}
  />
);
