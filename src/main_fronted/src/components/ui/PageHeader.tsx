import React from 'react';
import { Box, Typography } from '@mui/material';
import { mutedSx, sectionTitleSx } from './tokens';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** The top of each tab: one h1, an optional line of help and optional actions. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, minWidth: 0 }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h1" sx={{ ...sectionTitleSx, fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 700 }}>
        {title}
      </Typography>
      {description && <Typography sx={{ ...mutedSx, mt: 0.5 }}>{description}</Typography>}
    </Box>
    {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>{actions}</Box>}
  </Box>
);
