import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { loadSharedBy, type SharedEntry } from '../../context/sharedPosts';
import { messageOf } from '../../api/gateway';
import { PostCard } from '../PostCard';
import { Surface } from '../ui/Surface';
import { EmptyState, InlineError, PostSkeleton, SectionHeader } from '../ui';
import { T } from '../ui/tokens';

/** One share: the sharer's message, then the original post read-only (or a note that it is gone). */
const SharedItem: React.FC<{ entry: SharedEntry }> = ({ entry }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
    {entry.commentary && (
      <Typography sx={{ fontSize: 'var(--ui-fs-base)', color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', px: 0.5 }}>
        {entry.commentary}
      </Typography>
    )}
    {entry.post ? (
      <PostCard post={entry.post} variant="embedded" />
    ) : (
      <Surface as="article" aria-label="Shared post no longer available">
        <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.muted }}>This post is no longer available</Typography>
      </Surface>
    )}
  </Box>
);

/**
 * The posts a person has shared, on their profile. A skeleton while it loads, an error with a
 * retry, an empty state, or the shares in the order the server lists them.
 */
export const ProfileShares: React.FC<{ userId: string }> = ({ userId }) => {
  const [state, setState] = useState<{ loading: boolean; entries: SharedEntry[]; error: string | null }>({
    loading: true,
    entries: [],
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadSharedBy(userId)
      .then((entries) => { if (live) setState({ loading: false, entries, error: null }); })
      .catch((err) => { if (live) setState({ loading: false, entries: [], error: messageOf(err, 'Could not load shared posts') }); });
    return () => { live = false; };
  }, [userId, attempt]);

  return (
    <Box component="section" aria-label="Shared" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)', minWidth: 0 }}>
      <SectionHeader title="Shared" />
      {state.loading ? (
        <PostSkeleton />
      ) : state.error ? (
        <InlineError message={state.error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : state.entries.length === 0 ? (
        <EmptyState compact title="Nothing shared yet" body="Posts this person shares, with their message, show up here." />
      ) : (
        state.entries.map((entry) => <SharedItem key={entry.shareId} entry={entry} />)
      )}
    </Box>
  );
};
