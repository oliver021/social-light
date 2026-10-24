import React from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Typography } from '@mui/material';
import type { Post } from '../../types';
import { UserLine } from '../ui/UserLine';
import { T } from '../ui/tokens';
import { canChatWith } from './chat';

export interface PostHeaderProps {
  post: Post;
}

/** Author line of a post: avatar, name (opens a chat), "@handle · time", and the type tag. */
export const PostHeader: React.FC<PostHeaderProps> = ({ post }) => {
  const { currentUser, openChatWithUser } = useApp();
  const chatTarget = canChatWith(post.authorId, currentUser.id) ? post.authorId : undefined;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
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
        <Box sx={{ px: 1, py: 0.25, bgcolor: T.surface2, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-full)' }}>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {post.type}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
