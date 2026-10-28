import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';
import { StoriesBar } from './StoriesBar';
import { Box, Button, Typography } from '@mui/material';
import { CheckCircle, Users } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { PostSkeleton } from './ui/Skeletons';
import { useSettled } from './ui/useSettled';
import { PostComposer } from './post/PostComposer';
import { T, touchTargetSx } from './ui/tokens';
import { SHOW_PEOPLE_EVENT } from './Widgets';

const POSTS_PAGE_SIZE = 5;

export const FeedsTab: React.FC = () => {
  const { currentUser, posts, people, relationsLoading } = useApp();
  const settled = useSettled();
  const followingSomeone = people.some((p) => p.followed);
  const firstName = currentUser.name.split(' ')[0] || currentUser.name;

  // Local paging over the feed: reveal the next page of already-loaded posts.
  const [displayedPostsCount, setDisplayedPostsCount] = useState(3);

  const handleLoadMore = () => {
    setDisplayedPostsCount((prev) => prev + POSTS_PAGE_SIZE);
  };

  const activePosts = posts.slice(0, displayedPostsCount);
  const hasMorePosts = posts.length > displayedPostsCount;

  const showPeople = () => {
    window.dispatchEvent(new Event(SHOW_PEOPLE_EVENT));
  };

  return (
    <Box id="main-feed-homepage" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      {/* STORIES STRIP (generated Stories module) */}
      <StoriesBar />

      {/* POST COMPOSER CARD: the same composer as communities and organizations (M9) */}
      <PostComposer target={{ kind: 'home' }} placeholder={`What's on your mind, ${firstName}?`} />

      {/* FEED: skeleton while loading, empty state when the feed is genuinely empty, else posts */}
      {posts.length === 0 && (!settled || relationsLoading) && <PostSkeleton />}

      {posts.length === 0 && settled && !relationsLoading && (
        followingSomeone ? (
          <EmptyState
            icon={Users}
            title="No posts yet"
            body="The people you follow have not posted yet. Share something, or follow more people."
            action={{ label: 'Find more people', onClick: showPeople, ariaLabel: 'Find more people to follow' }}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Follow a few people to fill your feed"
            body="Posts from people you follow show up here. Start with People you may know."
            action={{ label: 'Find people', onClick: showPeople, ariaLabel: 'Find people to follow' }}
          />
        )
      )}

      {posts.length > 0 && (
        <>
          {/* RENDER POSTS FEED LIST */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
            {activePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </Box>

          {/* PAGING FOOTER */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pt: 1, pb: 3 }}>
            {hasMorePosts ? (
              <Button
                onClick={handleLoadMore}
                variant="outlined"
                sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', px: 3, color: T.text, borderColor: T.borderStrong }}
              >
                Show more posts
              </Button>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5, color: T.muted }}>
                <CheckCircle aria-hidden="true" size={16} strokeWidth={1.75} color={T.success} />
                <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.muted }}>
                  You are all caught up.
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};
