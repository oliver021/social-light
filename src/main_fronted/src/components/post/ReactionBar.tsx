import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Post, Reactions } from '../../types';

export interface ReactionBarProps {
  post: Post;
  commentOpen: boolean;
  onToggleComments: () => void;
}

// Human reaction dictionary mapping key to emoji and style classes
const REACTION_CONFIG: Record<keyof Reactions, { emoji: string, label: string, color: string }> = {
  like: { emoji: '👍', label: 'Like', color: 'text-blue-500' },
  love: { emoji: '❤️', label: 'Love', color: 'text-rose-500' },
  laugh: { emoji: '😆', label: 'Haha', color: 'text-amber-500' },
  wow: { emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  sad: { emoji: '😢', label: 'Sad', color: 'text-indigo-400' },
  angry: { emoji: '😡', label: 'Angry', color: 'text-red-500 font-bold' }
};

/** Reaction counts, the react / comment / share buttons, and the hover reaction picker. */
export const ReactionBar: React.FC<ReactionBarProps> = ({ post, onToggleComments }) => {
  const { reactToPost, sharePost } = useApp();
  const [hoverReactionsOpen, setHoverReactionsOpen] = useState(false);

  const totalReactionsCount = Object.values(post.reactions).reduce((a, b) => a + b, 0);

  return (
    <>
    {/* POST METRICS AND INTERACTIVE REACTIONS */}
    <Box className="flex items-center justify-between">
      <Box className="flex items-center gap-1">
        {totalReactionsCount > 0 && (
          <Box className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/60 pl-2 pr-2.5 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-800">
            {/* Show most common emojis */}
            <Typography variant="caption" className="text-xs leading-none select-none">
              {Object.entries(post.reactions)
                .filter(([_, count]) => count > 0)
                .map(([type]) => REACTION_CONFIG[type as keyof Reactions].emoji)
                .slice(0, 3)
                .join('')}
            </Typography>
            <Typography variant="caption" className="font-mono text-xs text-zinc-600 dark:text-zinc-400 font-semibold leading-none">
              {totalReactionsCount}
            </Typography>
          </Box>
        )}
      </Box>

      <Box className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
        <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer hover:underline" onClick={() => onToggleComments()}>
          {post.comments.length} comments
        </Typography>
        <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400">
          {post.sharesCount} shares
        </Typography>
      </Box>
    </Box>

    {/* FEED CONTROLS & DYNAMIC REACTIONS BAR */}
    <Box className="flex items-center justify-between relative mt-0.5">
    
      {/* REACTION SYSTEM */}
      <Box 
        onMouseEnter={() => setHoverReactionsOpen(true)}
        onMouseLeave={() => setHoverReactionsOpen(false)}
        className="relative"
      >
        {/* Reaction Bar Floating Panel on Hover */}
        <AnimatePresence>
          {hoverReactionsOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{ opacity: 1, y: -45, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-full px-2 py-1.5 flex items-center gap-2 z-50 whitespace-nowrap"
            >
              {Object.entries(REACTION_CONFIG).map(([type, cfg]) => {
                const isActive = post.currentUserReaction === type;
                return (
                  <Tooltip key={type} title={cfg.label} arrow>
                    <motion.button
                      whileHover={{ scale: 1.35 }}
                      whileTap={{ scale: 0.85 }}
                      aria-label={cfg.label}
                      onClick={() => {
                        reactToPost(post.id, type as keyof Reactions);
                        setHoverReactionsOpen(false);
                      }}
                      className={`text-xl p-1 min-w-[40px] min-h-[40px] rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${
                        isActive ? 'bg-primary-soft/40 font-bold border border-primary' : ''
                      }`}
                    >
                      {cfg.emoji}
                    </motion.button>
                  </Tooltip>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Standard Like Trigger Button */}
        <Button
          size="small"
          color="inherit"
          onClick={() => reactToPost(post.id, 'like')}
          className={`normal-case text-xs font-display min-h-[44px] flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 ${
            post.currentUserReaction ? REACTION_CONFIG[post.currentUserReaction].color : ''
          }`}
        >
          {post.currentUserReaction ? (
            <span className="text-sm">{REACTION_CONFIG[post.currentUserReaction].emoji}</span>
          ) : (
            <ThumbsUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          )}
          {post.currentUserReaction ? REACTION_CONFIG[post.currentUserReaction].label : 'React'}
        </Button>
      </Box>

      {/* Comment Drawer Toggle */}
      <Button
        size="small"
        color="inherit"
        onClick={() => onToggleComments()}
        className="normal-case text-zinc-600 dark:text-zinc-400 text-xs font-display min-h-[44px] flex items-center gap-1.5"
      >
        <MessageCircle className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        Comment
      </Button>

      {/* Share Button: count updates optimistically, persisted via /api/shares */}
      <Button
        size="small"
        color="inherit"
        onClick={() => sharePost(post.id)}
        className="normal-case text-zinc-600 dark:text-zinc-400 text-xs font-display min-h-[44px] flex items-center gap-1.5"
      >
        <Share2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        Share
      </Button>
    </Box>
    </>
  );
};
