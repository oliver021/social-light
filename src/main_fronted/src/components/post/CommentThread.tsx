import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Button, ButtonBase, Collapse, IconButton, List, ListItem, TextField, Tooltip, Typography } from '@mui/material';
import { Heart, Send, Trash2 } from 'lucide-react';
import type { Comment, Post } from '../../types';
import { UserAvatar } from '../ui/UserAvatar';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { OverflowMenu } from '../ui/OverflowMenu';
import { T } from '../ui/tokens';
import { buildThreads, type ThreadReply } from './commentTree';

/** How many replies show before "View n more replies". */
const REPLIES_BEFORE_FOLD = 2;

/** Text buttons inside a thread: at least 44 px tall for touch, no capitals. */
const SMALL_BUTTON_SX = {
  minHeight: 44,
  px: 1,
  textTransform: 'none',
  fontSize: 'var(--ui-fs-xs)',
  fontWeight: 600,
  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
} as const;

export interface CommentThreadProps {
  post: Post;
  open: boolean;
}

/**
 * The comment drawer: the add-comment field and the thread. Enter or the send button posts.
 * The text is cleared only once the server has accepted the comment. Replies sit under their
 * comment; a reply field opens under the comment being answered.
 */
export const CommentThread: React.FC<CommentThreadProps> = ({ post, open }) => {
  const { currentUser, addComment, deleteComment, toggleCommentLike, openProfile, showToast } = useApp();
  const [newCommentText, setNewCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  // The comment awaiting delete confirmation (only ever one at a time).
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);
  // Top-level comments whose replies are all shown (the others fold after REPLIES_BEFORE_FOLD).
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  // The comment a reply is being written to, and that reply's text (one open reply field at a time).
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);

  const threads = useMemo(() => buildThreads(post.comments), [post.comments]);

  // Enter in the add-comment field submits this form. The text is cleared only once the server
  // has accepted the comment; otherwise it stays so nothing typed is lost.
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

  const openReply = (comment: Comment) => {
    setReplyTarget(comment);
    setReplyText('');
  };

  const closeReply = () => {
    setReplyTarget(null);
    setReplyText('');
  };

  // Enter in the reply field sends it to the comment it answers. The field closes only once
  // the server has accepted the reply.
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !replyTarget || replyPosting) return;
    const target = replyTarget;
    setReplyPosting(true);
    try {
      await addComment(post.id, text, target.id);
      setReplyTarget((current) => (current?.id === target.id ? null : current));
      setReplyText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Your reply was not posted');
    } finally {
      setReplyPosting(false);
    }
  };

  const expandReplies = (rootId: string) => {
    setExpanded((prev) => new Set(prev).add(rootId));
  };

  // Owner rule: only comments whose author is me get the menu.
  const isOwnComment = (comment: Comment) => !!comment.authorId && comment.authorId === currentUser.id;

  /** One comment (top-level or a reply). A deleted placeholder shows its label and no actions. */
  const renderRow = (comment: Comment, opts: { indent: boolean; replyToName: string | null }) => {
    const linkable = !!comment.authorId;
    const openAuthor = () => { if (comment.authorId) openProfile(comment.authorId); };
    const name = comment.author.name;
    const indentSx = opts.indent ? { pl: 6, ml: 1, borderLeft: `2px solid ${T.border}` } : { pl: 0, ml: 0 };

    if (comment.deleted) {
      return (
        <ListItem disableGutters sx={{ py: 1, minWidth: 0, ...indentSx }}>
          <Typography sx={{ fontStyle: 'italic', fontSize: 'var(--ui-fs-sm)', color: T.muted }}>Comment deleted</Typography>
        </ListItem>
      );
    }

    return (
      <ListItem disableGutters sx={{ py: 1, alignItems: 'flex-start', gap: 1.25, minWidth: 0, ...indentSx }}>
        {linkable ? (
          <Tooltip title={`Open ${name}'s profile`} placement="top-start">
            <ButtonBase
              onClick={openAuthor}
              aria-label={`Open ${name}'s profile`}
              sx={{ borderRadius: 'var(--ui-radius-full)', minWidth: 44, minHeight: 44, flexShrink: 0, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
            >
              <UserAvatar name={name} src={comment.author.avatar} size="sm" />
            </ButtonBase>
          </Tooltip>
        ) : (
          <UserAvatar name={name} src={comment.author.avatar} size="sm" />
        )}
        <Box sx={{ minWidth: 0, flex: 1, maxWidth: '85%', px: 1.5, py: 1, bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-lg)', overflowWrap: 'anywhere' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 0.75, mb: 0.25 }}>
            {linkable ? (
              <ButtonBase
                onClick={openAuthor}
                sx={{ fontWeight: 700, fontSize: 'var(--ui-fs-xs)', color: T.text, borderRadius: 'var(--ui-radius-sm)', '&:hover': { textDecoration: 'underline' }, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
              >
                {name}
              </ButtonBase>
            ) : (
              <Typography sx={{ fontWeight: 700, fontSize: 'var(--ui-fs-xs)', color: T.text }}>{name}</Typography>
            )}
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
              {[comment.author.handle, comment.createdAt].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {opts.replyToName && (
              <Box component="span" sx={{ fontWeight: 600, color: T.primary, mr: 0.5 }}>@{opts.replyToName}</Box>
            )}
            {comment.content}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, ml: -1 }}>
            <Button
              size="small"
              aria-pressed={!!comment.likedByMe}
              aria-label={`Like comment by ${name}`}
              onClick={() => { toggleCommentLike(post.id, comment.id).catch(() => {}); }}
              sx={{ ...SMALL_BUTTON_SX, color: comment.likedByMe ? T.primary : T.muted }}
            >
              <Heart aria-hidden="true" size={16} strokeWidth={1.75} fill={comment.likedByMe ? 'currentColor' : 'none'} style={{ marginRight: 4 }} />
              Like{(comment.likes ?? 0) > 0 ? ` · ${comment.likes}` : ''}
            </Button>
            <Button size="small" aria-label={`Reply to ${name}`} onClick={() => openReply(comment)} sx={{ ...SMALL_BUTTON_SX, color: T.muted }}>
              Reply
            </Button>
          </Box>
        </Box>
        {isOwnComment(comment) && (
          <OverflowMenu
            label={`More actions for your comment: ${comment.content.slice(0, 40)}`}
            items={[{ id: 'delete', label: 'Delete comment', icon: Trash2, danger: true, onSelect: () => setPendingDelete(comment) }]}
          />
        )}
      </ListItem>
    );
  };

  /** The inline reply field under the comment being answered. Enter sends, Escape cancels. */
  const renderReplyField = (target: Comment, indent: boolean) => (
    <ListItem disableGutters sx={{ py: 1, minWidth: 0, ...(indent ? { pl: 6, ml: 1, borderLeft: `2px solid ${T.border}` } : { pl: 0, ml: 0 }) }}>
      <Box component="form" onSubmit={handleReplySubmit} sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <TextField
          size="small"
          fullWidth
          autoFocus
          variant="outlined"
          placeholder={`Reply to ${target.author.name}...`}
          value={replyText}
          disabled={replyPosting}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') closeReply(); }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: T.surface, borderRadius: 'var(--ui-radius-sm)' } }}
          slotProps={{
            input: { sx: { fontSize: 'var(--ui-fs-sm)' } },
            htmlInput: { 'aria-label': `Write a reply to ${target.author.name}` },
          }}
        />
        <IconButton
          type="submit"
          aria-label={`Post reply to ${target.author.name}`}
          disabled={!replyText.trim() || replyPosting}
          sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: 'var(--ui-radius-sm)', bgcolor: T.primary, color: T.onPrimary, '&:hover': { bgcolor: T.primaryHover }, '&.Mui-disabled': { bgcolor: T.surface3, color: T.subtle } }}
        >
          <Send aria-hidden="true" size={18} strokeWidth={1.75} />
        </IconButton>
      </Box>
    </ListItem>
  );

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

        {/* THREAD: each top-level comment, then its replies in server order */}
        {threads.length > 0 ? (
          <List disablePadding aria-label="Comments" sx={{ maxHeight: 320, overflowY: 'auto', '& > li + li': { borderTop: `1px solid ${T.border}` } }}>
            {threads.map((node) => {
              const showAll = expanded.has(node.root.id);
              const hidden = showAll ? 0 : Math.max(0, node.replies.length - REPLIES_BEFORE_FOLD);
              const visible: ThreadReply[] = hidden > 0 ? node.replies.slice(0, REPLIES_BEFORE_FOLD) : node.replies;
              return (
                <React.Fragment key={node.root.id}>
                  {renderRow(node.root, { indent: false, replyToName: null })}
                  {replyTarget?.id === node.root.id && renderReplyField(node.root, false)}
                  {visible.map((reply) => (
                    <React.Fragment key={reply.comment.id}>
                      {renderRow(reply.comment, { indent: true, replyToName: reply.replyToName })}
                      {replyTarget?.id === reply.comment.id && renderReplyField(reply.comment, true)}
                    </React.Fragment>
                  ))}
                  {hidden > 0 && (
                    <ListItem disableGutters sx={{ pl: 6, py: 0.5 }}>
                      <Button size="small" onClick={() => expandReplies(node.root.id)} sx={{ ...SMALL_BUTTON_SX, color: T.primary }}>
                        View {hidden} more {hidden === 1 ? 'reply' : 'replies'}
                      </Button>
                    </ListItem>
                  )}
                </React.Fragment>
              );
            })}
          </List>
        ) : (
          <EmptyState compact title="No comments yet" body="Be the first to comment." />
        )}
      </Box>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this comment?"
        body="It will be removed from the thread."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDelete) await deleteComment(post.id, pendingDelete.id);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </Collapse>
  );
};
