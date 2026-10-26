import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, ButtonBase, Typography } from '@mui/material';
import { Ban, Bell, BellOff, Clock, EyeOff, Trash2 } from 'lucide-react';
import type { Post } from '../../types';
import { UserLine } from '../ui/UserLine';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { OverflowMenu } from '../ui/OverflowMenu';
import { T } from '../ui/tokens';
import { BlockConfirm } from '../relationships/BlockConfirm';

export interface PostHeaderProps {
  post: Post;
  /** A read-only copy (a shared post on a profile): no "More actions" menu at all. */
  readOnly?: boolean;
}

/**
 * Author line of a post: avatar, name (opens their profile), "@handle · time", the type tag, and
 * the "More actions" menu. The author gets Delete. Anyone else's post gets Hide post, Snooze,
 * Mute (or Unmute) and Block. A shared copy (readOnly) gets no menu.
 */
export const PostHeader: React.FC<PostHeaderProps> = ({ post, readOnly = false }) => {
  const { currentUser, openProfile, openGroup, deletePost, showToast, hidePost, snoozeUser, muteUser, removePreference, mutedUsers } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  // Owner rule: no owner id means no delete control.
  const isOwner = !readOnly && !!post.authorId && post.authorId === currentUser.id;
  // Someone else's post: the person must have an id, or there is nothing to act on.
  const canModerate = !readOnly && !isOwner && !!post.authorId;
  const authorId = post.authorId;
  const name = post.author.name;
  const muteEntry = authorId ? mutedUsers.find((m) => m.userId === authorId) : undefined;

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
        {/* A community post: "› {community}" opens that community. */}
        {post.groupId && post.groupName && (
          <ButtonBase
            onClick={() => openGroup(post.groupId!)}
            aria-label={`Open community ${post.groupName}`}
            sx={{ font: 'inherit', fontSize: 'var(--ui-fs-xs)', color: T.muted, fontWeight: 600, minHeight: 24, maxWidth: '100%', borderRadius: 'var(--ui-radius-sm)', '&:hover': { textDecoration: 'underline' }, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
          >
            {`› ${post.groupName}`}
          </ButtonBase>
        )}
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
          {
            id: 'hide',
            label: 'Hide post',
            icon: EyeOff,
            hidden: !canModerate,
            onSelect: () => { hidePost(post.id).catch(() => {}); },
          },
          {
            id: 'snooze',
            label: `Snooze ${name} for 30 days`,
            icon: Clock,
            hidden: !canModerate || !!muteEntry,
            onSelect: () => {
              if (authorId) snoozeUser(authorId).then((ok) => { if (ok) showToast(`Snoozed ${name} for 30 days`, 'success'); }).catch(() => {});
            },
          },
          {
            id: 'mute',
            label: `Mute ${name}`,
            icon: BellOff,
            hidden: !canModerate || !!muteEntry,
            onSelect: () => {
              if (authorId) muteUser(authorId).then((ok) => { if (ok) showToast(`Muted ${name}`, 'success'); }).catch(() => {});
            },
          },
          {
            id: 'unmute',
            label: `Unmute ${name}`,
            icon: Bell,
            hidden: !canModerate || !muteEntry,
            onSelect: () => {
              if (muteEntry) removePreference(muteEntry.preferenceId).then((ok) => { if (ok) showToast(`${name} is back in your feed`, 'success'); }).catch(() => {});
            },
          },
          {
            id: 'block',
            label: `Block ${name}`,
            icon: Ban,
            danger: true,
            hidden: !canModerate,
            onSelect: () => setBlockOpen(true),
          },
        ]}
      />
      {canModerate && authorId && (
        <BlockConfirm open={blockOpen} userId={authorId} name={name} onClose={() => setBlockOpen(false)} />
      )}
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
