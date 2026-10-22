import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Post, Reactions } from '../types';
import { 
  Card, 
  Avatar, 
  Typography, 
  IconButton, 
  Box, 
  Button, 
  Divider, 
  TextField, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  LinearProgress,
  Tooltip,
  Collapse
} from '@mui/material';
import { 
  MessageCircle, 
  Share2, 
  ThumbsUp, 
  Heart, 
  Smile, 
  Frown, 
  Flame, 
  ChevronDown,
  ChevronUp,
  FileVideo,
  Play,
  Pause,
  ExternalLink,
  MessageSquareShare,
  Send,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { reactToPost, sharePost, votePoll, addComment, openChatWithUser } = useApp();
  const [commentOpen, setCommentOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [hoverReactionsOpen, setHoverReactionsOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(post.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleToggleVideo = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.warn("Autoplay block:", err);
        });
      }
      setVideoPlaying(!videoPlaying);
    }
  };

  // Human reaction dictionary mapping key to emoji and style classes
  const REACTION_CONFIG: Record<keyof Reactions, { emoji: string, label: string, color: string }> = {
    like: { emoji: '👍', label: 'Like', color: 'text-blue-500' },
    love: { emoji: '❤️', label: 'Love', color: 'text-rose-500' },
    laugh: { emoji: '😆', label: 'Haha', color: 'text-amber-500' },
    wow: { emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
    sad: { emoji: '😢', label: 'Sad', color: 'text-indigo-400' },
    angry: { emoji: '😡', label: 'Angry', color: 'text-red-500 font-bold' }
  };

  const totalReactionsCount = Object.values(post.reactions).reduce((a, b) => a + b, 0);

  return (
    <Card 
      variant="outlined" 
      className="p-4 min-w-0 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-3"
    >
      {/* AUTHOR HEADER */}
      <Box className="flex items-center justify-between gap-2 min-w-0">
        <Tooltip title={`Chat with ${post.author.name}`} placement="top-start">
          <Box 
            onClick={() => {
              if (post.author.handle !== '@oliverdev') {
                openChatWithUser({
                  id: post.author.handle === '@sarahcore' ? 'sarah-1' :
                      post.author.handle === '@elena_r' ? 'elena-1' :
                      post.author.handle === '@dmorrison' ? 'dave-1' :
                      post.author.handle === '@linusedu' ? 'linus-1' :
                      `user-${post.author.name.replace(/\s+/g, '-').toLowerCase()}`,
                  name: post.author.name,
                  avatar: post.author.avatar,
                  handle: post.author.handle
                });
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
          >
            <Avatar src={post.author.avatar} alt={post.author.name} className="w-10 h-10 border border-zinc-100 dark:border-zinc-90 w-10 shrink-0 animate-fade-in" />
            <Box className="min-w-0">
              <Typography variant="body2" className="font-display font-medium text-zinc-900 dark:text-zinc-100 text-xs break-words hover:text-blue-500 hover:underline">
                {post.author.name}
              </Typography>
              <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 block text-xs -mt-0.5 break-all">
                {post.author.handle} • {post.createdAt}
              </Typography>
            </Box>
          </Box>
        </Tooltip>
        {post.type !== 'text' && (
          <Box className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200/50 dark:border-zinc-800">
            <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider">
              {post.type}
            </Typography>
          </Box>
        )}
      </Box>

      {/* CORE POST CONTENT */}
      <Typography variant="body2" className="text-zinc-850 dark:text-zinc-300 leading-relaxed text-xs break-words whitespace-pre-wrap">
        {post.content}
      </Typography>

      {/* RENDER DYNAMIC ATTACHMENTS */}
      {post.type === 'poll' && post.poll && (
        <Box className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-850 rounded-xl space-y-2.5">
          <Typography variant="subtitle2" className="font-display font-semibold text-zinc-800 dark:text-zinc-200 text-xs break-words">
            📊 {post.poll.question}
          </Typography>
          
          <Box className="space-y-2">
            {post.poll.options.map((opt) => {
              const percentage = post.poll!.totalVotes > 0 
                ? Math.round((opt.votes / post.poll!.totalVotes) * 100) 
                : 0;

              const isUserVoted = post.poll!.userVotedOptionId === opt.id;

              return (
                <Box 
                  key={opt.id} 
                  onClick={() => votePoll(post.id, opt.id)}
                  className={`relative p-2.5 rounded-lg border cursor-pointer select-none overflow-hidden transition-all duration-350 ${
                    isUserVoted 
                    ? 'border-violet-400 bg-violet-50/15 dark:bg-violet-950/10' 
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  {/* Graphical bar progress indicator background */}
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-violet-600/10 dark:bg-violet-400/10 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />

                  <Box className="relative flex items-center justify-between z-10">
                    <Typography variant="caption" className={`text-xs font-medium break-words min-w-0 ${isUserVoted ? 'text-violet-700 dark:text-violet-300 font-semibold' : 'text-zinc-700 dark:text-zinc-400'}`}>
                      {opt.text} {isUserVoted && '✓'}
                    </Typography>
                    <Typography variant="caption" className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {opt.votes} ({percentage}%)
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 font-mono text-xs block">
            {post.poll.totalVotes} responses counted • Click items to vote
          </Typography>
        </Box>
      )}

      {post.type === 'image' && post.imageUrl && (
        <Box className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-850 max-h-96">
          <img
            src={post.imageUrl}
            alt={post.content ? `Image attached to post: ${post.content.slice(0, 80)}` : 'Image attached to post'}
            className="w-full max-w-full object-cover max-h-96"
            referrerPolicy="no-referrer"
          />
        </Box>
      )}

      {post.type === 'video' && post.videoUrl && (
        <Box className="relative rounded-xl overflow-hidden border border-zinc-200/60 dark:border-zinc-850 bg-black aspect-video flex items-center justify-center">
          <video 
            ref={videoRef}
            src={post.videoUrl}
            loop
            muted
            playsInline
            className="w-full max-w-full h-full object-cover"
          />
          {/* Custom play interface overlay */}
          <Box className="absolute inset-0 bg-black/35 hover:bg-black/20 flex items-center justify-center transition-all">
            <IconButton
              size="large"
              aria-label={videoPlaying ? 'Pause video' : 'Play video'}
              onClick={handleToggleVideo}
              className="bg-white/90 hover:bg-white text-zinc-900 p-2.5 shadow-xl"
            >
              {videoPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </IconButton>
          </Box>
          <Box className="absolute bottom-2.5 left-2.5 bg-zinc-900/70 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-1.5 border border-zinc-700/50">
            <FileVideo className="w-3" color="#a78bfa" />
            <Typography variant="caption" className="font-mono text-xs text-zinc-300">
              Interactive video preview
            </Typography>
          </Box>
        </Box>
      )}

      {post.type === 'link' && post.linkUrl && (
        <Card 
          variant="outlined" 
          className="rounded-xl border border-zinc-200 dark:border-zinc-850 overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-violet-300 hover:dark:border-violet-900 transition-all cursor-pointer flex flex-col md:flex-row"
          onClick={() => window.open(post.linkUrl, '_blank')}
        >
          {post.linkImage && (
            <img 
              src={post.linkImage}
              alt={post.linkTitle}
              className="w-full md:w-32 h-24 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          )}
          <Box className="p-3 flex flex-col justify-between min-w-0">
            <Box className="min-w-0">
              <Typography variant="subtitle2" className="font-display font-bold text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-1 break-all text-xs">
                {post.linkTitle}
              </Typography>
              <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed text-xs break-words">
                {post.linkDesc}
              </Typography>
            </Box>
            <Box className="flex items-center gap-1 mt-1 text-xs font-mono text-violet-600 dark:text-violet-400">
              <ExternalLink className="w-3 h-3" />
              Source: chromium.org
            </Box>
          </Box>
        </Card>
      )}

      <Divider className="my-0.5" />

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
          <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer hover:underline" onClick={() => setCommentOpen(!commentOpen)}>
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
                          isActive ? 'bg-violet-50/40 dark:bg-violet-950/30 font-bold border border-violet-300' : ''
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
          onClick={() => setCommentOpen(!commentOpen)}
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

      {/* COMMENTS LIST DRAWER (STATEFUL COLLAPSE) */}
      <Collapse in={commentOpen}>
        <Box className="mt-3 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-850/60 p-3 rounded-xl">
          {/* ADD COMMENT INPUT */}
          <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-3">
            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Join node thread..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="bg-white dark:bg-zinc-950/80 rounded-lg text-xs"
              slotProps={{
                input: {
                  className: 'text-xs pr-1 py-1'
                },
                htmlInput: { 'aria-label': 'Write a comment' }
              }}
            />
            <IconButton
              type="submit"
              aria-label="Post comment"
              disabled={!newCommentText.trim()}
              className="bg-violet-605 text-white hover:bg-violet-700 w-11 h-11 shrink-0 text-zinc-700 dark:text-zinc-300"
              size="small"
              style={{ borderRadius: '8px' }}
            >
              <Send className="w-3.5 h-3.5 fill-current text-white/90" />
            </IconButton>
          </form>

          {/* RECENT REPLIES */}
          {post.comments.length > 0 ? (
            <List className="py-0 divide-y divide-zinc-100 dark:divide-zinc-850/40 max-h-52 overflow-y-auto">
              <AnimatePresence>
                {post.comments.map((comment) => (
                  <ListItem key={comment.id} disablePadding className="py-2 flex items-start gap-2.5">
                    <Tooltip title={`Chat with ${comment.author.name}`} placement="top-start">
                      <Avatar 
                        src={comment.author.avatar} 
                        className="w-7 h-7 cursor-pointer hover:opacity-85 transition-opacity" 
                        onClick={() => {
                          if (comment.author.handle !== '@oliverdev') {
                            openChatWithUser({
                              id: comment.author.handle === '@sarahcore' ? 'sarah-1' :
                                  comment.author.handle === '@elena_r' ? 'elena-1' :
                                  comment.author.handle === '@dmorrison' ? 'dave-1' :
                                  comment.author.handle === '@linusedu' ? 'linus-1' :
                                  `user-${comment.author.name.replace(/\s+/g, '-').toLowerCase()}`,
                              name: comment.author.name,
                              avatar: comment.author.avatar,
                              handle: comment.author.handle
                            });
                          }
                        }}
                      />
                    </Tooltip>
                    <Box className="bg-white dark:bg-zinc-900/60 px-3 py-1.5 border border-zinc-200/40 dark:border-zinc-850/40 rounded-xl max-w-[85%] min-w-0 break-words">
                      <Box className="flex items-center gap-1.5 mb-0.5">
                        <Typography 
                          variant="caption" 
                          className="font-bold text-zinc-800 dark:text-zinc-200 text-xs cursor-pointer hover:text-blue-500 hover:underline"
                          onClick={() => {
                            if (comment.author.handle !== '@oliverdev') {
                              openChatWithUser({
                                id: comment.author.handle === '@sarahcore' ? 'sarah-1' :
                                    comment.author.handle === '@elena_r' ? 'elena-1' :
                                    comment.author.handle === '@dmorrison' ? 'dave-1' :
                                    comment.author.handle === '@linusedu' ? 'linus-1' :
                                    `user-${comment.author.name.replace(/\s+/g, '-').toLowerCase()}`,
                                name: comment.author.name,
                                avatar: comment.author.avatar,
                                handle: comment.author.handle
                              });
                            }
                          }}
                        >
                          {comment.author.name}
                        </Typography>
                        <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                          {comment.author.handle} • {comment.createdAt}
                        </Typography>
                      </Box>
                      <Typography variant="caption" className="text-zinc-600 dark:text-zinc-300 text-xs block leading-normal leading-relaxed break-words whitespace-pre-wrap">
                        {comment.content}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </AnimatePresence>
            </List>
          ) : (
            <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 block text-center py-2 text-xs font-display">
              Empty thread. Pitch your first response node!
            </Typography>
          )}
        </Box>
      </Collapse>
    </Card>
  );
};
