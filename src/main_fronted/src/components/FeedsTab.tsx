import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';
import { StoriesBar } from './StoriesBar';
import { Box, Button, Divider, IconButton, TextField, Typography } from '@mui/material';
import { MediaPicker } from './MediaPicker';
import { Image, FileVideo, BarChart4, Link2, Send, Plus, Minus, CheckCircle, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmptyState } from './ui/EmptyState';
import { Surface } from './ui/Surface';
import { UserAvatar } from './ui/UserAvatar';
import { useSettled } from './ui/useSettled';
import { PostSkeleton } from './ui/Skeletons';
import { T, touchTargetSx } from './ui/tokens';
import { mediaUrl } from '../api/gateway';
import { SHOW_PEOPLE_EVENT } from './Widgets';

const POSTS_PAGE_SIZE = 5;
/** A post carries at most this many images (matches the store's limit). */
const MAX_COMPOSER_IMAGES = 4;

const ICON_BUTTON_SX = (active: boolean) => ({
  ...touchTargetSx,
  color: active ? undefined : T.muted,
  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
});

const SMALL_TEXT_BUTTON_SX = {
  ...touchTargetSx,
  textTransform: 'none',
  fontSize: 'var(--ui-fs-sm)',
} as const;

const INPUT_SLOT_PROPS = {
  inputLabel: { sx: { fontSize: 'var(--ui-fs-sm)' } },
  input: { sx: { fontSize: 'var(--ui-fs-sm)', bgcolor: T.surface } },
} as const;

/** The panel that opens under the composer for an attachment. Animates its height in and out. */
const ComposerDrawer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    style={{ overflow: 'hidden' }}
  >
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: T.surface2, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-lg)' }}>
      {children}
    </Box>
  </motion.div>
);

export const FeedsTab: React.FC = () => {
  const { currentUser, posts, addPost, people, relationsLoading } = useApp();
  const settled = useSettled();
  const followingSomeone = people.some((p) => p.followed);
  const firstName = currentUser.name.split(' ')[0] || currentUser.name;

  // Composer state
  const [postText, setPostText] = useState('');
  const [composerType, setComposerType] = useState<'text' | 'link' | 'image' | 'video' | 'poll'>('text');

  // Attachment inputs. imageUrls/videoInput hold the urls returned by the media uploads.
  const [linkInput, setLinkInput] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  // True while an image upload runs: the post cannot be published until it ends.
  const [imageUploading, setImageUploading] = useState(false);
  const [videoInput, setVideoInput] = useState('');

  // Poll configuration
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Local paging over the feed: reveal the next page of already-loaded posts.
  const [displayedPostsCount, setDisplayedPostsCount] = useState(3);

  // Each attachment type needs real input before the post can be published.
  const filledPollOptions = pollOptions.filter((opt) => opt.trim() !== '');
  const attachmentMissing =
    (composerType === 'image' && imageUrls.length === 0) ||
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
        imageUrls
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
    setImageUrls([]);
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
    <Box id="main-feed-homepage" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      {/* STORIES STRIP (generated Stories module) */}
      <StoriesBar />

      {/* POST COMPOSER CARD */}
      <Surface as="section" aria-label="Create a post" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0 }}>
          <UserAvatar name={currentUser.name} src={currentUser.avatar} size="md" />
          <Box sx={{ width: '100%', minWidth: 0 }}>
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
                  sx: { fontSize: 'var(--ui-fs-base)', color: T.text, py: 0.5 }
                },
                htmlInput: { 'aria-label': 'Post text' }
              }}
            />
          </Box>
        </Box>

        {/* DYNAMIC COMPOSER drawers based on selection */}
        <AnimatePresence>
          {composerType === 'poll' && (
            <ComposerDrawer key="poll">
              <TextField
                size="small"
                fullWidth
                label="Question"
                placeholder="What do you want to ask?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                variant="outlined"
                slotProps={INPUT_SLOT_PROPS}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                    slotProps={INPUT_SLOT_PROPS}
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    onClick={handleAddPollOption}
                    disabled={pollOptions.length >= 4}
                    sx={SMALL_TEXT_BUTTON_SX}
                    startIcon={<Plus aria-hidden="true" size={18} strokeWidth={1.75} />}
                  >
                    Add option
                  </Button>
                  <Button
                    onClick={handleRemovePollOption}
                    disabled={pollOptions.length <= 2}
                    sx={SMALL_TEXT_BUTTON_SX}
                    startIcon={<Minus aria-hidden="true" size={18} strokeWidth={1.75} />}
                    color="error"
                  >
                    Remove option
                  </Button>
                </Box>
                <Button onClick={handleCloseComposerExtra} sx={{ ...SMALL_TEXT_BUTTON_SX, color: T.muted }}>Cancel</Button>
              </Box>
            </ComposerDrawer>
          )}

          {composerType === 'link' && (
            <ComposerDrawer key="link">
              <TextField
                size="small"
                fullWidth
                label="Link"
                placeholder="https://example.com"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                variant="outlined"
                slotProps={INPUT_SLOT_PROPS}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleCloseComposerExtra} sx={{ ...SMALL_TEXT_BUTTON_SX, color: T.muted }}>Cancel</Button>
              </Box>
            </ComposerDrawer>
          )}

          {composerType === 'image' && (
            <ComposerDrawer key="image">
              {imageUrls.length > 0 && (
                <Box component="ul" aria-label="Attached images" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {imageUrls.map((url, index) => (
                    <Box component="li" key={url} sx={{ position: 'relative', width: 96, height: 96, borderRadius: 'var(--ui-radius-sm)', overflow: 'hidden', border: `1px solid ${T.border}`, bgcolor: T.surface }}>
                      <Box component="img" src={mediaUrl(url)} alt={`Image ${index + 1}`} referrerPolicy="no-referrer" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <IconButton
                        aria-label={`Remove image ${index + 1}`}
                        disabled={imageUploading}
                        onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== index))}
                        sx={{ position: 'absolute', top: 4, right: 4, width: 44, height: 44, bgcolor: T.surface, color: T.text, '&:hover': { bgcolor: T.surface2 }, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
                      >
                        <X aria-hidden="true" size={16} strokeWidth={1.75} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              {imageUrls.length < MAX_COMPOSER_IMAGES ? (
                <MediaPicker
                  kind="image"
                  label={imageUrls.length === 0 ? 'Image' : `Add image ${imageUrls.length + 1} of ${MAX_COMPOSER_IMAGES}`}
                  onChange={(url) => { if (url) setImageUrls((prev) => (prev.length < MAX_COMPOSER_IMAGES ? [...prev, url] : prev)); }}
                  onBusyChange={setImageUploading}
                />
              ) : (
                <Typography sx={{ fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
                  A post can have up to {MAX_COMPOSER_IMAGES} images.
                </Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleCloseComposerExtra} sx={{ ...SMALL_TEXT_BUTTON_SX, color: T.muted }}>Cancel</Button>
              </Box>
            </ComposerDrawer>
          )}

          {composerType === 'video' && (
            <ComposerDrawer key="video">
              <MediaPicker kind="video" label="Video" value={videoInput || undefined} onChange={(url) => setVideoInput(url ?? '')} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleCloseComposerExtra} sx={{ ...SMALL_TEXT_BUTTON_SX, color: T.muted }}>Cancel</Button>
              </Box>
            </ComposerDrawer>
          )}
        </AnimatePresence>

        <Divider />

        {/* COMPOSER ATTACHMENTS AND SUBMIT */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              aria-label="Attach image"
              aria-pressed={composerType === 'image'}
              color={composerType === 'image' ? 'primary' : 'default'}
              onClick={() => setComposerType('image')}
              sx={ICON_BUTTON_SX(composerType === 'image')}
            >
              <Image aria-hidden="true" size={18} strokeWidth={1.75} color={T.success} />
            </IconButton>

            <IconButton
              aria-label="Attach video"
              aria-pressed={composerType === 'video'}
              color={composerType === 'video' ? 'primary' : 'default'}
              onClick={() => setComposerType('video')}
              sx={ICON_BUTTON_SX(composerType === 'video')}
            >
              <FileVideo aria-hidden="true" size={18} strokeWidth={1.75} color={T.danger} />
            </IconButton>

            <IconButton
              aria-label="Add poll"
              aria-pressed={composerType === 'poll'}
              color={composerType === 'poll' ? 'primary' : 'default'}
              onClick={() => setComposerType('poll')}
              sx={ICON_BUTTON_SX(composerType === 'poll')}
            >
              <BarChart4 aria-hidden="true" size={18} strokeWidth={1.75} color={T.accent} />
            </IconButton>

            <IconButton
              aria-label="Attach link"
              aria-pressed={composerType === 'link'}
              color={composerType === 'link' ? 'primary' : 'default'}
              onClick={() => setComposerType('link')}
              sx={ICON_BUTTON_SX(composerType === 'link')}
            >
              <Link2 aria-hidden="true" size={18} strokeWidth={1.75} color={T.warning} />
            </IconButton>
          </Box>

          <Button
            variant="contained"
            onClick={handlePostSubmit}
            disabled={(!postText.trim() && composerType === 'text') || attachmentMissing || imageUploading}
            endIcon={<Send aria-hidden="true" size={16} strokeWidth={1.75} />}
            sx={{
              ...touchTargetSx,
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 'var(--ui-radius-full)',
              px: 2.5,
              background: 'linear-gradient(to right, var(--ui-primary), var(--ui-accent))',
              color: T.onPrimary,
              '&.Mui-disabled': { color: T.muted, background: T.surface3 },
            }}
          >
            Post
          </Button>
        </Box>
      </Surface>

      {/* FEED: skeleton while loading, empty state when the feed is genuinely empty, else posts */}
      {posts.length === 0 && (!settled || relationsLoading) && <PostSkeleton />}

      {posts.length === 0 && settled && !relationsLoading && (
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
            {activePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </Box>

          {/* PAGING FOOTER */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pt: 1, pb: 3 }}>
            {hasMorePosts ? (
              <Button
                onClick={handleLoadMore}
                variant="outlined"
                sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', px: 3, color: T.text, borderColor: T.borderStrong }}
              >
                Show more posts
              </Button>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5, color: T.muted }}>
                <CheckCircle aria-hidden="true" size={16} strokeWidth={1.75} color={T.success} />
                <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.muted }}>
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
