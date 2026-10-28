import React, { useState } from 'react';
import { Divider } from '@mui/material';
import type { Post } from '../types';
import { Surface } from './ui/Surface';
import { PostHeader } from './post/PostHeader';
import { PostBody } from './post/PostBody';
import { ReactionBar } from './post/ReactionBar';
import { CommentThread } from './post/CommentThread';
import type { OverflowItem } from './ui/OverflowMenu';

export interface PostCardProps {
  post: Post;
  /**
   * `default` is a feed post with reactions and comments. `embedded` is a read-only copy of
   * another post (a shared post on a profile): author and body only, no menu, no comment box.
   */
  variant?: 'default' | 'embedded';
  /** Extra items for the post's "More actions" menu, supplied by the page that shows it (M10). */
  extraMenuItems?: OverflowItem[];
}

/** One post in a feed: the author, the body, the reaction bar, and the comment drawer. */
export const PostCard: React.FC<PostCardProps> = ({ post, variant = 'default', extraMenuItems }) => {
  const [commentOpen, setCommentOpen] = useState(false);

  if (variant === 'embedded') {
    return (
      <Surface as="article" aria-label={`Post by ${post.author.name}`} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <PostHeader post={post} readOnly />
        <PostBody post={post} />
      </Surface>
    );
  }

  return (
    <Surface as="article" aria-label={`Post by ${post.author.name}`} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <PostHeader post={post} extraMenuItems={extraMenuItems} />
      <PostBody post={post} />
      <Divider sx={{ my: 0.5 }} />
      <ReactionBar post={post} commentOpen={commentOpen} onToggleComments={() => setCommentOpen((open) => !open)} />
      <CommentThread post={post} open={commentOpen} />
    </Surface>
  );
};
