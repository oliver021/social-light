import React, { useState } from 'react';
import { Divider } from '@mui/material';
import type { Post } from '../types';
import { Surface } from './ui/Surface';
import { PostHeader } from './post/PostHeader';
import { PostBody } from './post/PostBody';
import { ReactionBar } from './post/ReactionBar';
import { CommentThread } from './post/CommentThread';

interface PostCardProps {
  post: Post;
}

/** One post in a feed: the author, the body, the reaction bar, and the comment drawer. */
export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [commentOpen, setCommentOpen] = useState(false);

  return (
    <Surface as="article" aria-label={`Post by ${post.author.name}`} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <PostHeader post={post} />
      <PostBody post={post} />
      <Divider sx={{ my: 0.5 }} />
      <ReactionBar post={post} commentOpen={commentOpen} onToggleComments={() => setCommentOpen((open) => !open)} />
      <CommentThread post={post} open={commentOpen} />
    </Surface>
  );
};
