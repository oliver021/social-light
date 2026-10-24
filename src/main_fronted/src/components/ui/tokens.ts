import type { SxProps, Theme } from '@mui/material/styles';

// Typed names of the shared colour tokens defined in index.css (--ui-*). Use these in MUI
// `sx` (bgcolor: T.primarySoft) instead of a string literal. Tailwind utility classes lose
// to MUI's own styles, so MUI components read the variables through these presets.
export const T = {
  page: 'var(--ui-page)',
  surface: 'var(--ui-surface)',
  surface2: 'var(--ui-surface-2)',
  surface3: 'var(--ui-surface-3)',
  border: 'var(--ui-border)',
  borderStrong: 'var(--ui-border-strong)',
  text: 'var(--ui-text)',
  muted: 'var(--ui-muted)',
  subtle: 'var(--ui-subtle)',
  primary: 'var(--ui-primary)',
  primaryHover: 'var(--ui-primary-hover)',
  onPrimary: 'var(--ui-on-primary)',
  primarySoft: 'var(--ui-primary-soft)',
  accent: 'var(--ui-accent)',
  accentSoft: 'var(--ui-accent-soft)',
  success: 'var(--ui-success)',
  successSoft: 'var(--ui-success-soft)',
  warning: 'var(--ui-warning)',
  warningSoft: 'var(--ui-warning-soft)',
  danger: 'var(--ui-danger)',
  dangerSoft: 'var(--ui-danger-soft)',
  focus: 'var(--ui-focus)',
  onMedia: 'var(--ui-on-media)',
  onMediaMuted: 'var(--ui-on-media-muted)',
} as const;

export const cardSx: SxProps<Theme> = {
  bgcolor: T.surface,
  border: `1px solid ${T.border}`,
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
  color: T.text,
};

export const mutedSx: SxProps<Theme> = {
  color: T.muted,
  fontSize: '0.8125rem',
  lineHeight: 1.5,
};

export const subtleSx: SxProps<Theme> = {
  color: T.subtle,
  fontSize: 'var(--ui-fs-xs)',
  lineHeight: 1.5,
};

export const dangerTextSx: SxProps<Theme> = {
  color: T.danger,
};

export const pillButtonSx: SxProps<Theme> = {
  borderRadius: 'var(--ui-radius-full)',
  px: 2,
  minHeight: 36,
};

export const focusRingSx: SxProps<Theme> = {
  '&:focus-visible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
};

// Minimum touch target (WCAG 2.5.5 / Apple HIG). Use on follow/join buttons and chips.
export const touchTargetSx: SxProps<Theme> = {
  minHeight: 44,
  minWidth: 44,
};
