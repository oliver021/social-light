import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Button, ButtonBase, Tooltip, Typography } from '@mui/material';
import { MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Post, Reactions } from '../../types';
import { T } from '../ui/tokens';
import { SharePostDialog } from './SharePostDialog';

export interface ReactionBarProps {
  post: Post;
  commentOpen: boolean;
  onToggleComments: () => void;
}

// Reaction dictionary: emoji, label and the token colour that identifies the reaction.
const REACTION_CONFIG: Record<keyof Reactions, { emoji: string; label: string; color: string }> = {
  like: { emoji: '👍', label: 'Like', color: T.primary },
  love: { emoji: '❤️', label: 'Love', color: T.danger },
  laugh: { emoji: '😆', label: 'Haha', color: T.warning },
  wow: { emoji: '😮', label: 'Wow', color: T.warning },
  sad: { emoji: '😢', label: 'Sad', color: T.accent },
  angry: { emoji: '😡', label: 'Angry', color: T.danger },
};

const TEXT_BUTTON_SX = {
  textTransform: 'none',
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--ui-fs-sm)',
  fontWeight: 600,
  color: T.muted,
  minHeight: 44,
  px: 1,
  '&:hover': { bgcolor: T.surface2 },
  '&:active': { bgcolor: T.surface3 },
  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
} as const;

/** Reaction counts, the react / comment / share buttons, and the reaction picker (hover or focus). */
export const ReactionBar: React.FC<ReactionBarProps> = ({ post, commentOpen, onToggleComments }) => {
  const { reactToPost } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const totalReactionsCount = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  const reacted = post.currentUserReaction ? REACTION_CONFIG[post.currentUserReaction] : null;

  return (
    <>
      {/* POST METRICS */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {totalReactionsCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, bgcolor: T.surface2, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-full)' }}>
              <Typography aria-hidden="true" sx={{ fontSize: 'var(--ui-fs-xs)', lineHeight: 1, userSelect: 'none' }}>
                {Object.entries(post.reactions)
                  .filter(([, count]) => count > 0)
                  .map(([type]) => REACTION_CONFIG[type as keyof Reactions].emoji)
                  .slice(0, 3)
                  .join('')}
              </Typography>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', fontWeight: 600, color: T.muted, lineHeight: 1 }}>
                {totalReactionsCount}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
          <ButtonBase
            onClick={() => onToggleComments()}
            aria-expanded={commentOpen}
            sx={{ minHeight: 44, px: 0.5, color: T.muted, fontSize: 'inherit', fontFamily: 'inherit', borderRadius: 'var(--ui-radius-sm)', '&:hover': { textDecoration: 'underline' }, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
          >
            {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
          </ButtonBase>
          <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: T.muted }}>
            {post.sharesCount} {post.sharesCount === 1 ? 'share' : 'shares'}
          </Typography>
        </Box>
      </Box>

      {/* ACTIONS */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, position: 'relative' }}>
        {/* Reaction picker: opens on hover or keyboard focus */}
        <Box
          onMouseEnter={() => setPickerOpen(true)}
          onMouseLeave={() => setPickerOpen(false)}
          onFocus={() => setPickerOpen(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPickerOpen(false);
          }}
          sx={{ position: 'relative' }}
        >
          <AnimatePresence>
            {pickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: -52, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', left: 0, zIndex: 50, whiteSpace: 'nowrap' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, bgcolor: T.surface, border: `1px solid ${T.border}`, boxShadow: 'var(--ui-shadow-2)', borderRadius: 'var(--ui-radius-full)' }}>
                  {Object.entries(REACTION_CONFIG).map(([type, cfg]) => {
                    const isActive = post.currentUserReaction === type;
                    return (
                      <Tooltip key={type} title={cfg.label} arrow>
                        <ButtonBase
                          aria-label={cfg.label}
                          aria-pressed={isActive}
                          onClick={() => {
                            reactToPost(post.id, type as keyof Reactions);
                            setPickerOpen(false);
                          }}
                          sx={{
                            fontSize: '1.25rem',
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--ui-radius-full)',
                            border: `1px solid ${isActive ? T.primary : 'transparent'}`,
                            bgcolor: isActive ? T.primarySoft : 'transparent',
                            transition: `transform var(--ui-dur) var(--ui-ease), background-color var(--ui-dur) var(--ui-ease)`,
                            '&:hover': { bgcolor: T.surface2, transform: 'scale(1.2)' },
                            '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
                          }}
                        >
                          {cfg.emoji}
                        </ButtonBase>
                      </Tooltip>
                    );
                  })}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            size="small"
            onClick={() => reactToPost(post.id, 'like')}
            sx={{ ...TEXT_BUTTON_SX, color: reacted ? reacted.color : T.muted, fontWeight: reacted ? 700 : 600 }}
          >
            {reacted ? (
              <Box component="span" aria-hidden="true" sx={{ fontSize: '1rem', mr: 0.75 }}>{reacted.emoji}</Box>
            ) : (
              <ThumbsUp aria-hidden="true" size={18} strokeWidth={1.75} style={{ marginRight: 6 }} />
            )}
            {reacted ? reacted.label : 'React'}
          </Button>
        </Box>

        <Button size="small" onClick={() => onToggleComments()} aria-expanded={commentOpen} sx={TEXT_BUTTON_SX}>
          <MessageCircle aria-hidden="true" size={18} strokeWidth={1.75} style={{ marginRight: 6 }} />
          Comment
        </Button>

        {/* Share opens the share dialog: an optional message, then POST /api/shares */}
        <Button size="small" onClick={() => setShareOpen(true)} sx={TEXT_BUTTON_SX}>
          <Share2 aria-hidden="true" size={18} strokeWidth={1.75} style={{ marginRight: 6 }} />
          Share
        </Button>
      </Box>
      {shareOpen && <SharePostDialog post={post} open={shareOpen} onClose={() => setShareOpen(false)} />}
    </>
  );
};
