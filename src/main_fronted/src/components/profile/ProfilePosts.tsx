import React from 'react';
import { Box } from '@mui/material';
import { useApp } from '../../context/AppContext';
import { PostCard } from '../PostCard';
import { EmptyState, InlineError, PostSkeleton, SectionHeader } from '../ui';

/**
 * The posts of one person on a profile: a skeleton while the timeline loads, an error with a
 * retry, an empty state, or the cards. The timeline is the one loaded for `userId`.
 */
export const ProfilePosts: React.FC<{ userId: string }> = ({ userId }) => {
  const { timeline, loadTimeline } = useApp();
  const current = timeline?.userId === userId ? timeline : null;

  return (
    <Box component="section" aria-label="Posts" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)', minWidth: 0 }}>
      <SectionHeader title="Posts" />
      {!current || (current.loading && current.posts.length === 0 && !current.error) ? (
        <PostSkeleton />
      ) : current.error && current.posts.length === 0 ? (
        <InlineError message={current.error} onRetry={() => { loadTimeline(userId).catch(() => {}); }} />
      ) : current.posts.length === 0 ? (
        <EmptyState compact title="No posts yet" body="Posts from this person will show up here." />
      ) : (
        current.posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </Box>
  );
};
