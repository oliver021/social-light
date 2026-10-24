import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { T, cardSx } from './tokens';

export interface SurfaceProps {
  as?: 'section' | 'article' | 'div';
  padding?: 'none' | 'sm' | 'md';
  /** Hover lifts the border and adds shadow-1. Use only on a surface that is itself a control. */
  interactive?: boolean;
  'aria-label'?: string;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

const PADDING: Record<NonNullable<SurfaceProps['padding']>, object> = {
  none: { p: 0 },
  sm: { p: 1.5 },
  md: {},
};

/** The one card. Every panel and list card is a Surface (token-based, no shadow at rest). */
export const Surface: React.FC<SurfaceProps> = ({
  as = 'div',
  padding = 'md',
  interactive = false,
  children,
  sx,
  ...rest
}) => (
  <Box
    component={as}
    {...rest}
    sx={[
      cardSx,
      PADDING[padding],
      interactive && {
        cursor: 'pointer',
        transition: `box-shadow var(--ui-dur) var(--ui-ease), border-color var(--ui-dur) var(--ui-ease)`,
        '&:hover': { boxShadow: 'var(--ui-shadow-1)', borderColor: T.borderStrong },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);
