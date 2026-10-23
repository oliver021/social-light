import type { SxProps, Theme } from '@mui/material/styles';

// MUI sx presets for the shared surface tokens defined in index.css (--ui-*).
// Use these on MUI components: Tailwind utility classes lose to MUI's own styles.
export const cardSx: SxProps<Theme> = {
  bgcolor: 'var(--ui-surface)',
  border: '1px solid var(--ui-border)',
  borderRadius: 'var(--ui-radius)',
  boxShadow: 'none',
  p: 'var(--ui-card-pad)',
  minWidth: 0,
};

export const sectionTitleSx: SxProps<Theme> = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: '0.875rem',
  lineHeight: 1.25,
  color: 'var(--ui-text)',
};

export const mutedSx: SxProps<Theme> = {
  color: 'var(--ui-muted)',
  fontSize: '0.8125rem',
  lineHeight: 1.5,
};

// Minimum touch target (WCAG 2.5.5 / Apple HIG). Use on follow/join buttons and chips.
export const touchTargetSx: SxProps<Theme> = {
  minHeight: 44,
  minWidth: 44,
};
