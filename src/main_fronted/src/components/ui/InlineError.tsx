import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { T } from './tokens';

export interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

/** An error in place, announced to screen readers. Shows "Try again" only when a retry exists. */
export const InlineError: React.FC<InlineErrorProps> = ({ message, onRetry }) => (
  <Box role="alert" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, py: 1 }}>
    <Typography sx={{ color: T.danger, fontSize: '0.8125rem', fontWeight: 500 }}>{message}</Typography>
    {onRetry && (
      <Button size="small" onClick={onRetry} sx={{ minHeight: 44, color: T.primary }}>
        Try again
      </Button>
    )}
  </Box>
);
