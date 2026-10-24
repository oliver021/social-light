import React from 'react';
import { Box, Typography } from '@mui/material';
import { mutedSx, sectionTitleSx } from './tokens';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  as?: 'h2' | 'h3';
}

/** Title (a real heading element) with an optional subtitle and an action on the right. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action, as = 'h2' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography component={as} sx={sectionTitleSx}>
        {title}
      </Typography>
      {subtitle && <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>{subtitle}</Typography>}
    </Box>
    {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
  </Box>
);
