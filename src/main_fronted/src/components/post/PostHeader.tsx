import React from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Typography } from '@mui/material';
import type { Post } from '../../types';
import { UserLine } from '../ui/UserLine';
import { canChatWith } from './chat';

export interface PostHeaderProps {
  post: Post;
}

/** Author line of a post: avatar, name (opens a chat), "@handle · time", and the type tag. */
export const PostHeader: React.FC<PostHeaderProps> = ({ post }) => {
  const { currentUser, openChatWithUser } = useApp();
  const chatTarget = canChatWith(post.authorId, currentUser.id) ? post.authorId : undefined;

  return (
    <Box className="flex items-center justify-between gap-2 min-w-0">
      <Box className="min-w-0 flex-1">
        <UserLine
          name={post.author.name}
          handle={post.author.handle}
          avatarSrc={post.author.avatar}
          meta={post.createdAt}
          onOpen={
            chatTarget
              ? () => openChatWithUser({ id: chatTarget, name: post.author.name, avatar: post.author.avatar, handle: post.author.handle })
              : undefined
          }
        />
      </Box>
      {post.type !== 'text' && (
        <Box className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200/50 dark:border-zinc-800">
          <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider">
            {post.type}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
