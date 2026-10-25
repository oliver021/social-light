import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import type { Post } from '../../types';
import { UserLine } from '../ui/UserLine';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { OverflowMenu } from '../ui/OverflowMenu';
import { T } from '../ui/tokens';

export interface PostHeaderProps {
  post: Post;
}

/**
 * Author line of a post: avatar, name (opens their profile), "@handle · time", the type tag, and,
 * for the author only, the "More actions" menu with delete.
 */
export const PostHeader: React.FC<PostHeaderProps> = ({ post }) => {
  const { currentUser, openProfile, deletePost, showToast } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Owner rule: no owner id means no delete control.
  const isOwner = !!post.authorId && post.authorId === currentUser.id;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <UserLine
          name={post.author.name}
          handle={post.author.handle}
          avatarSrc={post.author.avatar}
          meta={post.createdAt}
          onOpen={post.authorId ? () => openProfile(post.authorId!) : undefined}
        />
      </Box>
      {post.type !== 'text' && (
        <Box sx={{ px: 1, py: 0.25, bgcolor: T.surface2, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-full)' }}>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {post.type}
          </Typography>
        </Box>
      )}
      <OverflowMenu
        label="More actions for this post"
        items={[
          {
            id: 'delete',
            label: 'Delete post',
            icon: Trash2,
            danger: true,
            hidden: !isOwner,
            onSelect: () => setConfirmOpen(true),
          },
        ]}
      />
      {isOwner && (
        <ConfirmDialog
          open={confirmOpen}
          title="Delete this post?"
          body="It will be removed from your profile and from your followers' feeds."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            await deletePost(post.id);
            showToast('Post deleted', 'success');
          }}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </Box>
  );
};
