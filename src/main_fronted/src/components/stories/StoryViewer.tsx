import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, ButtonBase, Dialog, DialogContent, IconButton, TextField, Typography } from '@mui/material';
import { Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { StoryGroup, StoryReply } from '../../context/useStories';
import { messageOf, mediaUrl } from '../../api/gateway';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { UserLine } from '../ui/UserLine';
import { T, touchTargetSx } from '../ui/tokens';

/** How long an image story stays on screen. Videos run until they end. */
export const IMAGE_STORY_MS = 5000;
const TICK_MS = 50;
/** A press shorter than this is a tap (navigate); a longer press only pauses. */
const TAP_MAX_MS = 300;
const SENT_MS = 2000;

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

interface StoryViewerProps {
  /** The author whose stories are shown, or null when the viewer is closed. */
  group: StoryGroup | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen viewer for one author's stories. Image stories advance after IMAGE_STORY_MS,
 * videos at their end; a tap or click on the right half (or ArrowRight) goes on, the left half
 * (or ArrowLeft) goes back, Escape closes, and a press-and-hold pauses. Reduced motion keeps the
 * timing but draws no moving bar. Others' stories take a reply; my own list who replied.
 */
export const StoryViewer: React.FC<StoryViewerProps> = ({ group, open, onClose }) => {
  const { currentUser, viewStory, deleteStory, replyToStory, loadReplies, openProfile, showToast } = useApp();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [replies, setReplies] = useState<StoryReply[] | null>(null);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesError, setRepliesError] = useState<string | null>(null);
  const [confirmStoryId, setConfirmStoryId] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const holdStartedAt = useRef(0);

  const stories = group?.stories ?? [];
  const story = stories[index] ?? null;
  const isMine = !!story && story.authorId === currentUser.id;
  const isVideo = story?.mediaType === 'video';
  const authorName = group?.authorName ?? '';

  const goNext = () => {
    if (index + 1 < stories.length) setIndex(index + 1);
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };
  // Timers and key handlers call these through a ref, so they always see the current story.
  const navRef = useRef({ goNext, goPrev });
  navRef.current = { goNext, goPrev };

  // Each open starts at the first story.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open, group?.authorId]);

  // Per-story state: a new story starts at zero, with an empty reply box.
  useEffect(() => {
    setProgress(0);
    setReply('');
    setReplyError(null);
    setSent(false);
    setRepliesOpen(false);
    setReplies(null);
    setRepliesError(null);
  }, [story?.id]);

  // A view is recorded once per story shown.
  useEffect(() => {
    if (open && story) viewStory(story.id);
  }, [open, story?.id]);

  // My own story: read the reply count up front, so the button can show it.
  useEffect(() => {
    if (!open || !story || !isMine) return;
    let cancelled = false;
    loadReplies(story.id)
      .then((list) => { if (!cancelled) setReplies(list); })
      .catch((err) => { if (!cancelled) setRepliesError(messageOf(err, 'Replies could not be loaded')); });
    return () => { cancelled = true; };
  }, [open, story?.id, isMine]);

  // Image stories: a progress tick, then advance when the bar is full.
  useEffect(() => {
    if (!open || !story || isVideo || holding || reduced) return;
    const id = window.setInterval(() => setProgress((p) => Math.min(1, p + TICK_MS / IMAGE_STORY_MS)), TICK_MS);
    return () => window.clearInterval(id);
  }, [open, story?.id, isVideo, holding, reduced]);
  useEffect(() => {
    if (progress >= 1 && open && story && !isVideo) navRef.current.goNext();
  }, [progress]);

  // Reduced motion: no moving bar, but the story still moves on after the same time.
  useEffect(() => {
    if (!open || !story || isVideo || holding || !reduced) return;
    const id = window.setTimeout(() => navRef.current.goNext(), IMAGE_STORY_MS);
    return () => window.clearTimeout(id);
  }, [open, story?.id, isVideo, holding, reduced, index]);

  // Videos pause while held and play again after.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open) return;
    if (holding) video.pause?.();
    else video.play?.()?.catch?.(() => {});
  }, [holding, open, story?.id]);

  // ArrowLeft / ArrowRight while the viewer is open (not while typing in the reply box).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
      if (e.key === 'ArrowRight') navRef.current.goNext();
      else if (e.key === 'ArrowLeft') navRef.current.goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Auto-clear the "Sent" note.
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), SENT_MS);
    return () => window.clearTimeout(id);
  }, [sent]);

  const onPressStart = () => {
    holdStartedAt.current = Date.now();
    setHolding(true);
  };
  const onPressEnd = () => setHolding(false);
  const onZoneClick = (direction: 'next' | 'prev') => {
    // A press that was held pauses the story; it does not navigate.
    if (Date.now() - holdStartedAt.current > TAP_MAX_MS) return;
    if (direction === 'next') goNext();
    else goPrev();
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!story || !text || sending) return;
    setSending(true);
    setReplyError(null);
    try {
      await replyToStory(story.id, text);
      setReply('');
      setSent(true);
    } catch (err) {
      setReplyError(messageOf(err, 'Your reply was not sent'));
    } finally {
      setSending(false);
    }
  };

  const toggleReplies = () => {
    setRepliesOpen((open) => !open);
  };

  const confirmDelete = async () => {
    if (!confirmStoryId) return;
    await deleteStory(confirmStoryId);
    setConfirmStoryId(null);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && !!group}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { 'aria-label': `Story by ${authorName}` } }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            aria-label="Close story"
            onClick={onClose}
            sx={{ ...touchTargetSx, position: 'absolute', top: 8, right: 8, zIndex: 2, bgcolor: 'rgba(0,0,0,0.5)', color: T.onMedia, '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <X aria-hidden="true" size={18} strokeWidth={1.75} />
          </IconButton>
          {story && group && (
            <Box>
              {/* Progress: one segment per story of this author. */}
              <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, pt: 1.5 }}>
                {stories.map((s, i) => (
                  <Box key={s.id} sx={{ flex: 1, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        height: '100%',
                        bgcolor: T.onMedia,
                        width: i < index ? '100%' : i === index && !reduced ? `${progress * 100}%` : '0%',
                      }}
                    />
                  </Box>
                ))}
              </Box>
              <Typography className="sr-only">{`Story ${index + 1} of ${stories.length}`}</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
                <UserLine name={authorName} avatarSrc={group.authorAvatar} size="sm" onOpen={story.authorId ? () => { onClose(); openProfile(story.authorId); } : undefined} />
                {/* Owner rule: only the author sees the delete control. The right margin keeps it clear of Close. */}
                {isMine && (
                  <IconButton
                    aria-label="Delete your story"
                    title="Delete story"
                    onClick={() => setConfirmStoryId(story.id)}
                    sx={{ ...touchTargetSx, ml: 'auto', mr: '52px', color: T.text }}
                  >
                    <Trash2 aria-hidden="true" size={18} strokeWidth={1.75} />
                  </IconButton>
                )}
              </Box>

              <Box
                onPointerDown={onPressStart}
                onPointerUp={onPressEnd}
                onPointerLeave={onPressEnd}
                onPointerCancel={onPressEnd}
                sx={{ position: 'relative', bgcolor: 'rgba(0,0,0,1)' }}
              >
                {isVideo ? (
                  <Box
                    component="video"
                    ref={videoRef}
                    src={mediaUrl(story.mediaUrl)}
                    aria-label={`Video story by ${authorName}`}
                    autoPlay
                    muted
                    playsInline
                    onEnded={() => navRef.current.goNext()}
                    onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                      const v = e.currentTarget;
                      if (v.duration > 0) setProgress(v.currentTime / v.duration);
                    }}
                    sx={{ display: 'block', width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={mediaUrl(story.mediaUrl)}
                    alt={story.caption || `Story by ${authorName}`}
                    referrerPolicy="no-referrer"
                    sx={{ display: 'block', width: '100%', maxWidth: '100%', maxHeight: '60vh', objectFit: 'cover' }}
                  />
                )}
                <ButtonBase
                  aria-label="Previous story"
                  onClick={() => onZoneClick('prev')}
                  sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', zIndex: 1, justifyContent: 'flex-start', '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: -2 } }}
                />
                <ButtonBase
                  aria-label="Next story"
                  onClick={() => onZoneClick('next')}
                  sx={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', zIndex: 1, justifyContent: 'flex-end', '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: -2 } }}
                />
              </Box>

              {story.caption && <Typography sx={{ p: 1.5, fontSize: 'var(--ui-fs-sm)', color: T.text, overflowWrap: 'anywhere' }}>{story.caption}</Typography>}

              {/* Someone else's story: a reply box. */}
              {!isMine && (
                <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      size="small"
                      fullWidth
                      label={`Reply to ${authorName}…`}
                      value={reply}
                      disabled={sending}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                    />
                  </Box>
                  {replyError && <Alert severity="error">{replyError}</Alert>}
                  {sent && <Typography role="status" sx={{ fontSize: 'var(--ui-fs-xs)', color: T.success, fontWeight: 600 }}>Sent</Typography>}
                </Box>
              )}

              {/* My story: how many replied, and who. */}
              {isMine && (
                <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    onClick={toggleReplies}
                    aria-expanded={repliesOpen}
                    sx={{ ...touchTargetSx, alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600, color: T.text }}
                  >
                    {`Replies (${replies?.length ?? 0})`}
                  </Button>
                  {repliesOpen && repliesError && <Alert severity="error">{repliesError}</Alert>}
                  {repliesOpen && (
                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {!repliesError && replies?.length === 0 && (
                        <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.muted }}>No replies yet.</Typography>
                      )}
                      {replies?.map((r) => (
                        <Box component="li" key={r.id}>
                          <UserLine name={r.authorName} handle={r.handle} avatarSrc={r.authorAvatar} size="sm" />
                          <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text, overflowWrap: 'anywhere', pl: 5 }}>{r.body}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Outside the viewer, so the confirmation survives the viewer closing after a delete. */}
      <ConfirmDialog
        open={confirmStoryId !== null}
        title="Delete this story?"
        body="It will be removed for everyone who can see it. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await confirmDelete();
          } catch (err) {
            showToast(messageOf(err, 'The story was not deleted'));
          }
        }}
        onClose={() => setConfirmStoryId(null)}
      />
    </>
  );
};
