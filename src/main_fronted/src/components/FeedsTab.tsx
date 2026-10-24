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
  Plus,
  Minus,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmptyState } from './ui/EmptyState';
import { useSettled } from './ui/useSettled';
import { PostSkeleton } from './ui/Skeletons';
import { cardSx, mutedSx, touchTargetSx } from './ui/tokens';
import { SHOW_PEOPLE_EVENT } from './Widgets';

const POSTS_PAGE_SIZE = 5;

export const FeedsTab: React.FC = () => {
  const { currentUser, posts, addPost, people } = useApp();
  const settled = useSettled();
  const followingSomeone = people.some((p) => p.followed);
  const firstName = currentUser.name.split(' ')[0] || currentUser.name;

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
        title: 'Shared link',
        linkUrl,
        linkTitle: linkUrl,
        linkDesc: '',
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

  const showPeople = () => {
    window.dispatchEvent(new Event(SHOW_PEOPLE_EVENT));
  };

  return (
    <Box id="main-feed-homepage" className="space-y-4 flex flex-col">
      {/* STORIES STRIP (generated Stories module) */}
      <StoriesBar />
      {/* POST COMPOSER CARD */}
      <Card variant="outlined" id="post-composer-form" component="section" aria-label="Create a post" sx={{ ...cardSx, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box className="flex items-start gap-2.5">
          <Avatar src={currentUser.avatar} alt={currentUser.name} sx={{ width: 40, height: 40, flexShrink: 0 }} />
          <Box className="w-full flex flex-col gap-2 min-w-0">
            <TextField
              fullWidth
              multiline
              rows={composerType === 'poll' ? 1 : 2}
              placeholder={`What's on your mind, ${firstName}?`}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: { fontSize: '0.875rem', py: 0.5 }
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
                label="Question"
                placeholder="What do you want to ask?"
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
                    label={`Option ${index + 1}`}
                    placeholder="Add an answer"
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
                    onClick={handleAddPollOption}
                    disabled={pollOptions.length >= 4}
                    sx={{ ...touchTargetSx, textTransform: 'none', fontSize: '0.8125rem' }}
                    startIcon={<Plus className="w-3 h-3" />}
                  >
                    Add option
                  </Button>
                  <Button
                    onClick={handleRemovePollOption}
                    disabled={pollOptions.length <= 2}
                    sx={{ ...touchTargetSx, textTransform: 'none', fontSize: '0.8125rem' }}
                    startIcon={<Minus className="w-3 h-3" />}
                    color="error"
                  >
                    Remove option
                  </Button>
                </Box>
                <Button onClick={handleCloseComposerExtra} sx={{ ...touchTargetSx, textTransform: 'none', fontSize: '0.8125rem', color: 'var(--ui-muted)' }}>Cancel</Button>
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
                label="Link"
                placeholder="https://example.com"
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

        <Divider />

        {/* COMPOSER ATTACHMENTS AND SUBMIT */}
        <Box className="flex items-center justify-between flex-wrap gap-2">
          <Box className="flex items-center gap-0.5">
            <IconButton
              aria-label="Attach image"
              aria-pressed={composerType === 'image'}
              color={composerType === 'image' ? 'primary' : 'default'}
              onClick={() => setComposerType('image')}
              sx={{ ...touchTargetSx, color: composerType === 'image' ? undefined : 'var(--ui-muted)' }}
            >
              <Image aria-hidden="true" className="w-4 h-4 text-emerald-500" />
            </IconButton>

            <IconButton
              aria-label="Attach video"
              aria-pressed={composerType === 'video'}
              color={composerType === 'video' ? 'primary' : 'default'}
              onClick={() => setComposerType('video')}
              sx={{ ...touchTargetSx, color: composerType === 'video' ? undefined : 'var(--ui-muted)' }}
            >
              <FileVideo aria-hidden="true" className="w-4 h-4 text-rose-500" />
            </IconButton>

            <IconButton
              aria-label="Add poll"
              aria-pressed={composerType === 'poll'}
              color={composerType === 'poll' ? 'primary' : 'default'}
              onClick={() => setComposerType('poll')}
              sx={{ ...touchTargetSx, color: composerType === 'poll' ? undefined : 'var(--ui-muted)' }}
            >
              <BarChart4 aria-hidden="true" className="w-4 h-4 text-cyan-500" />
            </IconButton>

            <IconButton
              aria-label="Attach link"
              aria-pressed={composerType === 'link'}
              color={composerType === 'link' ? 'primary' : 'default'}
              onClick={() => setComposerType('link')}
              sx={{ ...touchTargetSx, color: composerType === 'link' ? undefined : 'var(--ui-muted)' }}
            >
              <Link2 aria-hidden="true" className="w-4 h-4 text-amber-500" />
            </IconButton>
          </Box>

          <Button
            variant="contained"
            onClick={handlePostSubmit}
            disabled={(!postText.trim() && composerType === 'text') || attachmentMissing}
            endIcon={<Send aria-hidden="true" className="w-3 h-3" />}
            sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 999, px: 2.5, background: 'linear-gradient(to right, var(--ui-primary), var(--ui-accent))', color: 'var(--ui-on-primary)', '&.Mui-disabled': { color: 'var(--ui-muted)', background: 'var(--ui-border)' } }}
          >
            Post
          </Button>
        </Box>
      </Card>

      {/* FEED: skeleton while loading, empty state when the feed is genuinely empty, else posts */}
      {posts.length === 0 && !settled && <PostSkeleton />}

      {posts.length === 0 && settled && (
        followingSomeone ? (
          <EmptyState
            icon={Users}
            title="No posts yet"
            body="The people you follow have not posted yet. Share something, or follow more people."
            action={{ label: 'Find more people', onClick: showPeople, ariaLabel: 'Find more people to follow' }}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Follow a few people to fill your feed"
            body="Posts from people you follow show up here. Start with People you may know."
            action={{ label: 'Find people', onClick: showPeople, ariaLabel: 'Find people to follow' }}
          />
        )
      )}

      {posts.length > 0 && (
        <>
          {/* RENDER POSTS FEED LIST */}
          <Box className="space-y-4">
            {activePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </Box>

          {/* PAGING FOOTER */}
          <Box className="flex flex-col items-center justify-center pt-2 pb-6">
            {hasMorePosts ? (
              <Button
                onClick={handleLoadMore}
                variant="outlined"
                sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 999, px: 3, color: 'var(--ui-text)', borderColor: 'var(--ui-border)' }}
              >
                <Clock aria-hidden="true" className="w-3.5 h-3.5 mr-1 text-primary" />
                Show more posts
              </Button>
            ) : (
              <Box className="flex items-center gap-2 py-3" sx={mutedSx}>
                <CheckCircle aria-hidden="true" className="w-4 h-4 text-emerald-500" />
                <Typography sx={{ ...mutedSx, fontSize: '0.8125rem' }}>
                  You are all caught up.
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};
