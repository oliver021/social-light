import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar, Box, Collapse, IconButton, List, ListItem, TextField, Tooltip, Typography } from '@mui/material';
import { Send } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import type { Post } from '../../types';
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
      <Box className="mt-3 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-850/60 p-3 rounded-xl">
        {/* ADD COMMENT INPUT */}
        <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-3">
          <TextField
            size="small"
            fullWidth
            variant="outlined"
            placeholder="Write a comment..."
            value={newCommentText}
            disabled={posting}
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
            disabled={!newCommentText.trim() || posting}
            className="bg-primary text-on-primary hover:bg-primary-hover w-11 h-11 shrink-0 text-zinc-700 dark:text-zinc-300"
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
                      alt={comment.author.name}
                      className="w-7 h-7 cursor-pointer hover:opacity-85 transition-opacity" 
                      onClick={() => chatWith(comment.authorId, comment.author.name, comment.author.avatar, comment.author.handle)}
                    />
                  </Tooltip>
                  <Box className="bg-white dark:bg-zinc-900/60 px-3 py-1.5 border border-zinc-200/40 dark:border-zinc-850/40 rounded-xl max-w-[85%] min-w-0 break-words">
                    <Box className="flex items-center gap-1.5 mb-0.5">
                      <Typography 
                        variant="caption" 
                        className="font-bold text-zinc-800 dark:text-zinc-200 text-xs cursor-pointer hover:text-blue-500 hover:underline"
                        onClick={() => chatWith(comment.authorId, comment.author.name, comment.author.avatar, comment.author.handle)}
                      >
                        {comment.author.name}
                      </Typography>
                      <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                        {[comment.author.handle, comment.createdAt].filter(Boolean).join(' • ')}
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
  );
};
