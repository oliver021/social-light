import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { Surface } from './Surface';

/** Placeholder for one post card while the feed loads. Moved from FeedsTab (M0.3). */
export const PostSkeleton: React.FC = () => (
  <Surface as="article" aria-label="Loading post">
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Skeleton variant="circular" width={40} height={40} animation="wave" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" width="40%" animation="wave" />
        <Skeleton variant="text" width="25%" animation="wave" />
      </Box>
    </Box>
    <Skeleton variant="rounded" height={120} animation="wave" />
  </Surface>
);

/** A list of rows (people, notifications, threads) while it loads. */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <Box aria-busy="true" aria-label="Loading" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {Array.from({ length: rows }, (_, i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Skeleton variant="circular" width={40} height={40} animation="wave" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="50%" animation="wave" />
          <Skeleton variant="text" width="30%" animation="wave" />
        </Box>
      </Box>
    ))}
  </Box>
);

/** A grid of card placeholders (marketplace, groups, reels). */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <Box
    aria-busy="true"
    aria-label="Loading"
    sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--ui-gap)' }}
  >
    {Array.from({ length: count }, (_, i) => (
      <Surface key={i} padding="none">
        <Skeleton variant="rounded" height={140} animation="wave" sx={{ borderRadius: 0 }} />
        <Box sx={{ p: 1.5 }}>
          <Skeleton variant="text" width="70%" animation="wave" />
          <Skeleton variant="text" width="40%" animation="wave" />
        </Box>
      </Surface>
    ))}
  </Box>
);
