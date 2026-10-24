import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, ButtonBase, Collapse, IconButton, List, ListItem, TextField, Tooltip, Typography } from '@mui/material';
import { Send } from 'lucide-react';
import type { Post } from '../../types';
import { UserAvatar } from '../ui/UserAvatar';
import { EmptyState } from '../ui/EmptyState';
import { T } from '../ui/tokens';
import { canChatWith } from './chat';

export interface CommentThreadProps {
  post: Post;
  open: boolean;
}

/**
 * The comment drawer: the add-comment field and the thread. Enter or the send button posts.
 * The text is cleared only once the server has accepted the comment.
 */
export const CommentThread: React.FC<CommentThreadProps> = ({ post, open }) => {
  const { currentUser, addComment, openChatWithUser, showToast } = useApp();
  const [newCommentText, setNewCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  // Enter in the field submits this form. The text is cleared only once the server has
  // accepted the comment; otherwise it stays so nothing typed is lost.
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newCommentText.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await addComment(post.id, text);
      setNewCommentText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Your comment was not posted');
    } finally {
      setPosting(false);
    }
  };

  const chatWith = (userId: string | undefined, name: string, avatar: string, handle: string) => {
    if (canChatWith(userId, currentUser.id)) {
      openChatWithUser({ id: userId, name, avatar, handle });
    }
  };

  return (
    <Collapse in={open}>
      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: T.surface2, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-lg)' }}>
        {/* ADD COMMENT INPUT */}
        <Box component="form" onSubmit={handleCommentSubmit} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            variant="outlined"
            placeholder="Write a comment..."
            value={newCommentText}
            disabled={posting}
            onChange={(e) => setNewCommentText(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': { bgcolor: T.surface, borderRadius: 'var(--ui-radius-sm)' },
            }}
            slotProps={{
              input: { sx: { fontSize: 'var(--ui-fs-sm)' } },
              htmlInput: { 'aria-label': 'Write a comment' },
            }}
          />
          <IconButton
            type="submit"
            aria-label="Post comment"
            disabled={!newCommentText.trim() || posting}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 'var(--ui-radius-sm)',
              bgcolor: T.primary,
              color: T.onPrimary,
              '&:hover': { bgcolor: T.primaryHover },
              '&.Mui-disabled': { bgcolor: T.surface3, color: T.subtle },
              '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
            }}
          >
            <Send aria-hidden="true" size={18} strokeWidth={1.75} />
          </IconButton>
        </Box>

        {/* THREAD */}
        {post.comments.length > 0 ? (
          <List disablePadding aria-label="Comments" sx={{ maxHeight: 208, overflowY: 'auto', '& > li + li': { borderTop: `1px solid ${T.border}` } }}>
            {post.comments.map((comment) => {
              const chatable = canChatWith(comment.authorId, currentUser.id);
              const openChat = () => chatWith(comment.authorId, comment.author.name, comment.author.avatar, comment.author.handle);
              return (
                <ListItem key={comment.id} disableGutters sx={{ py: 1, alignItems: 'flex-start', gap: 1.25, minWidth: 0 }}>
                  {chatable ? (
                    <Tooltip title={`Chat with ${comment.author.name}`} placement="top-start">
                      <ButtonBase
                        onClick={openChat}
                        aria-label={`Chat with ${comment.author.name}`}
                        sx={{ borderRadius: 'var(--ui-radius-full)', minWidth: 44, minHeight: 44, flexShrink: 0, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
                      >
                        <UserAvatar name={comment.author.name} src={comment.author.avatar} size="sm" />
                      </ButtonBase>
                    </Tooltip>
                  ) : (
                    <UserAvatar name={comment.author.name} src={comment.author.avatar} size="sm" />
                  )}
                  <Box sx={{ minWidth: 0, maxWidth: '85%', px: 1.5, py: 1, bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-lg)', overflowWrap: 'anywhere' }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 0.75, mb: 0.25 }}>
                      {chatable ? (
                        <ButtonBase
                          onClick={openChat}
                          sx={{ fontWeight: 700, fontSize: 'var(--ui-fs-xs)', color: T.text, borderRadius: 'var(--ui-radius-sm)', '&:hover': { textDecoration: 'underline' }, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
                        >
                          {comment.author.name}
                        </ButtonBase>
                      ) : (
                        <Typography sx={{ fontWeight: 700, fontSize: 'var(--ui-fs-xs)', color: T.text }}>{comment.author.name}</Typography>
                      )}
                      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
                        {[comment.author.handle, comment.createdAt].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {comment.content}
                    </Typography>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        ) : (
          <EmptyState compact title="No comments yet" body="Be the first to comment." />
        )}
      </Box>
    </Collapse>
  );
};
