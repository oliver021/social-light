import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';
import { StoriesBar } from './StoriesBar';
import { 
  Box, 
  Card, 
  Avatar, 
  Typography, 
  Button, 
  TextField, 
  IconButton, 
  Divider
} from '@mui/material';
import { MediaPicker } from './MediaPicker';
import { 
  Image, 
  FileVideo, 
  BarChart4, 
  Link2, 
  Send, 
  Smile, 
  Plus, 
  Minus,
  CheckCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const POSTS_PAGE_SIZE = 5;

export const FeedsTab: React.FC = () => {
  const { currentUser, posts, addPost } = useApp();

  // Composer state
  const [postText, setPostText] = useState('');
  const [composerType, setComposerType] = useState<'text' | 'link' | 'image' | 'video' | 'poll'>('text');

  // Attachment inputs. imageInput/videoInput hold the url returned by the media upload.
  const [linkInput, setLinkInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [videoInput, setVideoInput] = useState('');

  // Poll configuration
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Local paging over the feed: reveal the next page of already-loaded posts.
  const [displayedPostsCount, setDisplayedPostsCount] = useState(3);

  // Each attachment type needs real input before the post can be published.
  const filledPollOptions = pollOptions.filter((opt) => opt.trim() !== '');
  const attachmentMissing =
    (composerType === 'image' && !imageInput) ||
    (composerType === 'video' && !videoInput) ||
    (composerType === 'link' && !linkInput.trim()) ||
    (composerType === 'poll' && (!pollQuestion.trim() || filledPollOptions.length < 2));

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = () => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.slice(0, pollOptions.length - 1));
    }
  };

  const handleCloseComposerExtra = () => {
    setComposerType('text');
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && composerType === 'text') return;
    if (attachmentMissing) return;

    let extraData: any = {};
    if (composerType === 'link') {
      const linkUrl = linkInput.trim();
      extraData = {
        title: 'User Shared Link',
        linkUrl,
        linkTitle: 'Hyperlink node from ' + linkUrl,
        linkDesc: 'Shared on the network. Discover related files and nodes.',
      };
    } else if (composerType === 'image') {
      extraData = {
        imageUrl: imageInput
      };
    } else if (composerType === 'video') {
      extraData = {
        videoUrl: videoInput
      };
    } else if (composerType === 'poll') {
      const activeOptions = filledPollOptions
        .map((opt, i) => ({ id: `opt-${Date.now()}-${i}`, text: opt, votes: 0 }));

      extraData = {
        poll: {
          question: pollQuestion.trim(),
          options: activeOptions,
          totalVotes: 0
        }
      };
    }

    addPost(postText, composerType, extraData);
    
    // Clear inputs
    setPostText('');
    setComposerType('text');
    setLinkInput('');
    setImageInput('');
    setVideoInput('');
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleLoadMore = () => {
    setDisplayedPostsCount((prev) => prev + POSTS_PAGE_SIZE);
  };

  const activePosts = posts.slice(0, displayedPostsCount);
  const hasMorePosts = posts.length > displayedPostsCount;

  return (
    <Box id="main-feed-homepage" className="space-y-4 flex flex-col">
      {/* STORIES STRIP (generated Stories module) */}
      <StoriesBar />
      {/* POST COMPOSER CARD */}
      <Card variant="outlined" id="post-composer-form" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 flex flex-col gap-3">
        <Box className="flex items-start gap-2.5">
          <Avatar src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 border border-zinc-100 dark:border-zinc-900" />
          <Box className="w-full flex flex-col gap-2">
            <TextField
              fullWidth
              multiline
              rows={composerType === 'poll' ? 1 : 2}
              placeholder={`Share what you are building to the grid, ${currentUser.name}...`}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  className: 'text-zinc-800 dark:text-zinc-100 text-xs py-1.5'
                },
                htmlInput: { 'aria-label': 'Post text' }
              }}
            />
          </Box>
        </Box>

        {/* DYNAMIC COMPOSER drawers based on selection */}
        <AnimatePresence>
          {composerType === 'poll' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-1 py-2 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl space-y-2 border border-zinc-200/50 dark:border-zinc-850"
            >
              <TextField
                size="small"
                fullWidth
                label="Survey Question"
                placeholder="Which React 19 core features are you implementing first?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                variant="outlined"
                className="bg-white dark:bg-zinc-950 text-xs"
                slotProps={{ inputLabel: { className: 'text-xs' }, input: { className: 'text-xs' } }}
              />

              <Box className="space-y-1.5 pt-1">
                {pollOptions.map((opt, index) => (
                  <TextField
                    key={index}
                    size="small"
                    fullWidth
                    label={`Response Choice #${index + 1}`}
                    placeholder={`e.g., Response branch option...`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[index] = e.target.value;
                      setPollOptions(updated);
                    }}
                    variant="outlined"
                    className="bg-white dark:bg-zinc-950 text-xs"
                    slotProps={{ inputLabel: { className: 'text-xs' }, input: { className: 'text-xs' } }}
                  />
                ))}
              </Box>

              <Box className="flex items-center gap-1 justify-between pr-1">
                <Box className="flex items-center gap-1">
                  <Button 
                    size="small" 
                    onClick={handleAddPollOption} 
                    disabled={pollOptions.length >= 4} 
                    className="normal-case text-xs"
                    startIcon={<Plus className="w-3" />}
                  >
                    Add choice
                  </Button>
                  <Button 
                    size="small" 
                    onClick={handleRemovePollOption} 
                    disabled={pollOptions.length <= 2}
                    className="normal-case text-xs"
                    startIcon={<Minus className="w-3" />}
                    color="error"
                  >
                    Remove
                  </Button>
                </Box>
                <Button size="small" onClick={handleCloseComposerExtra} className="normal-case text-xs text-zinc-600 dark:text-zinc-400">Cancel</Button>
              </Box>
            </motion.div>
          )}

          {composerType === 'link' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-2 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl space-y-2 border border-zinc-200/50 dark:border-zinc-850"
            >
              <TextField
                size="small"
                fullWidth
                label="Hyperlink URL"
                placeholder="https://chromium.googlesource.com/chromium/src"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                variant="outlined"
                className="bg-white dark:bg-zinc-950 text-xs"
                slotProps={{ inputLabel: { className: 'text-xs' }, input: { className: 'text-xs' } }}
              />
              <Box className="flex justify-end pr-1">
                <Button size="small" onClick={handleCloseComposerExtra} className="normal-case text-xs text-zinc-600 dark:text-zinc-400">Cancel</Button>
              </Box>
            </motion.div>
          )}

          {composerType === 'image' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-850 rounded-xl space-y-2"
            >
              <MediaPicker kind="image" label="Image" value={imageInput || undefined} onChange={(url) => setImageInput(url ?? '')} />
              <Box className="flex justify-end pr-1">
                <Button size="small" onClick={handleCloseComposerExtra} className="normal-case text-xs text-zinc-600 dark:text-zinc-400">Cancel</Button>
              </Box>
            </motion.div>
          )}

          {composerType === 'video' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-2 py-2 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800 rounded-xl space-y-2"
            >
              <MediaPicker kind="video" label="Video" value={videoInput || undefined} onChange={(url) => setVideoInput(url ?? '')} />
              <Box className="flex justify-end pr-1">
                <Button size="small" onClick={handleCloseComposerExtra} className="normal-case text-xs text-zinc-600 dark:text-zinc-400">Cancel</Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <Divider className="my-0.5" />

        {/* COMPOSER BUTTON CONTROLS AND AI TOGGLE */}
        <Box className="flex items-center justify-between flex-wrap gap-2">
          <Box className="flex items-center gap-1">
            <IconButton
              size="small"
              aria-label="Attach image"
              color={composerType === 'image' ? 'primary' : 'inherit'}
              onClick={() => setComposerType('image')}
              className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <Image className="w-4 h-4 text-emerald-500" />
            </IconButton>

            <IconButton
              size="small"
              aria-label="Attach video"
              color={composerType === 'video' ? 'primary' : 'inherit'}
              onClick={() => setComposerType('video')}
              className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <FileVideo className="w-4 h-4 text-rose-500" />
            </IconButton>

            <IconButton
              size="small"
              aria-label="Add poll"
              color={composerType === 'poll' ? 'primary' : 'inherit'}
              onClick={() => setComposerType('poll')}
              className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <BarChart4 className="w-4 h-4 text-cyan-500" />
            </IconButton>

            <IconButton
              size="small"
              aria-label="Attach link"
              color={composerType === 'link' ? 'primary' : 'inherit'}
              onClick={() => setComposerType('link')}
              className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <Link2 className="w-4 h-4 text-amber-500" />
            </IconButton>
          </Box>

          <Button
            size="small"
            variant="contained"
            onClick={handlePostSubmit}
            disabled={(!postText.trim() && composerType === 'text') || attachmentMissing}
            className="normal-case font-display text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4.5 py-1.5 min-h-[44px] text-white shadow-md flex items-center gap-1.5 rounded-full"
            sx={{ '&.Mui-disabled': { color: 'text.secondary' } }}
          >
            Publish
            <Send className="w-3 h-3" />
          </Button>
        </Box>
      </Card>

      {/* RENDER POSTS FEED LIST */}
      <Box className="space-y-4">
        {activePosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </Box>

      {/* INFINITE SCROLL LOADER COMPONENT */}
      <Box className="flex flex-col items-center justify-center pt-2 pb-6">
        {hasMorePosts ? (
          <Button
            onClick={handleLoadMore}
            variant="outlined"
            size="small"
            className="font-display normal-case text-xs border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full px-6 flex items-center gap-1 text-zinc-700 dark:text-zinc-300"
          >
            <Clock className="w-3.5 h-3.5 text-violet-500" />
            Load More Feed Nodes
          </Button>
        ) : posts.length > 0 ? (
          <Box className="flex items-center gap-2 py-3 opacity-60">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 font-mono text-xs">
              You are all caught up.
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};
