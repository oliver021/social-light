import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Typography, Button, TextField, IconButton, Skeleton } from '@mui/material';
import { Clapperboard, Plus, Play, Pause, Trash2, Volume2, VolumeX, Music2 } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import type { Reel } from '../context/useReels';
import { ConfirmDialog, EmptyState, OverflowMenu, PageHeader, ResponsiveDialog, UserAvatar, T, touchTargetSx } from './ui';

const MAX_REEL_SECONDS = 90;
const MAX_CAPTION = 200;

/**
 * Length of a local video file in seconds. MediaRecorder WebM files report
 * `duration === Infinity` until the end is reached, so in that case we seek to the end and
 * wait for the browser to publish the real duration (or give up after a few seconds).
 */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    let settled = false;
    let timeout: number | undefined;
    const finish = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeEventListener('durationchange', check);
      video.removeEventListener('timeupdate', check);
      URL.revokeObjectURL(objectUrl);
      if (seconds === null) reject(new Error('unknown duration'));
      else resolve(seconds);
    };
    const check = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) finish(video.duration);
    };
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      check();
      if (settled) return;
      video.addEventListener('durationchange', check);
      video.addEventListener('timeupdate', check);
      timeout = window.setTimeout(() => finish(null), 8000);
      video.currentTime = 1e101;
    };
    video.src = objectUrl;
  });
}

// Overlay buttons sit on top of the video, so they use fixed white and black (the only
// raw colours allowed in this tab) with a 44 px target.
const OVERLAY_BUTTON = '!absolute !bg-black/40 !text-white min-h-[44px] min-w-[44px]';

// One full-height reel. Plays muted-by-default when at least 60 % is on screen, pauses
// when it leaves the viewport, and reports the first time it becomes active (a view).
const ReelPlayer: React.FC<{
  reel: Reel;
  muted: boolean;
  onToggleMute: () => void;
  onActive: (reelId: string) => void;
}> = ({ reel, muted, onToggleMute, onActive }) => {
  const { currentUser, deleteReel, showToast } = useApp();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Owner rule: only the creator gets the delete control.
  const isOwner = !!reel.creatorId && reel.creatorId === currentUser.id;
  const slotRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewedRef = useRef(false);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const slot = slotRef.current;
    if (!video || !slot || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          if (!viewedRef.current) {
            viewedRef.current = true;
            onActive(reel.id);
          }
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(slot);
    return () => observer.disconnect();
  }, [reel.id, onActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  return (
    <Box ref={slotRef} className="h-full snap-start snap-always flex items-center justify-center p-2 sm:p-4">
      <Box className="relative h-full w-full max-w-[min(100%,calc((100dvh_-_16.25rem)*9/16))] sm:max-w-[min(100%,calc((100dvh_-_12.25rem)*9/16))] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={mediaUrl(reel.videoUrl)}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-label={`Reel by ${reel.creatorName}${reel.caption ? `: ${reel.caption}` : ''}`}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onClick={togglePlay}
          className="absolute inset-0 w-full h-full object-contain cursor-pointer"
        />

        <IconButton
          aria-label={paused ? 'Play reel' : 'Pause reel'}
          onClick={togglePlay}
          className={`${OVERLAY_BUTTON} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80`}
          sx={{ display: paused ? 'flex' : 'none' }}
        >
          {paused ? <Play aria-hidden="true" className="w-7 h-7 fill-current" strokeWidth={1.75} /> : <Pause aria-hidden="true" className="w-7 h-7" strokeWidth={1.75} />}
        </IconButton>

        <IconButton
          aria-label={muted ? 'Unmute reel' : 'Mute reel'}
          onClick={onToggleMute}
          className={`${OVERLAY_BUTTON} top-2 right-2`}
        >
          {muted ? <VolumeX aria-hidden="true" className="w-5 h-5" strokeWidth={1.75} /> : <Volume2 aria-hidden="true" className="w-5 h-5" strokeWidth={1.75} />}
        </IconButton>

        {isOwner && (
          // The overlay sits on video, so the menu button gets a dark backing and a white icon.
          <Box
            className="absolute top-2 left-2"
            sx={{
              '& .MuiIconButton-root': { color: T.onMedia, bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } },
            }}
          >
            <OverflowMenu
              label="More actions for your reel"
              items={[{ id: 'delete', label: 'Delete reel', icon: Trash2, danger: true, onSelect: () => setConfirmDeleteOpen(true) }]}
            />
          </Box>
        )}

        <Box className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
          <Box className="flex items-center gap-2 min-w-0">
            <UserAvatar name={reel.creatorName} src={reel.creatorAvatar} size="sm" />
            <Typography className="font-semibold text-white text-sm break-words min-w-0">
              {reel.creatorName}
            </Typography>
            <Typography className="text-white/80 text-xs font-mono shrink-0">{reel.duration}s</Typography>
          </Box>
          {reel.caption && (
            <Box className="mt-2 flex items-start gap-1.5">
              <Music2 aria-hidden="true" className="w-3 h-3 text-white/80 mt-0.5 shrink-0" strokeWidth={1.75} />
              <Typography variant="body2" className="text-white text-xs break-words min-w-0">{reel.caption}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {isOwner && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Delete this reel?"
          body="It will be removed from Reels. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            await deleteReel(reel.id);
            showToast('Reel deleted', 'success');
          }}
          onClose={() => setConfirmDeleteOpen(false)}
        />
      )}
    </Box>
  );
};

// Reels feed (short-form video): a vertical scroll-snap list, one reel per screen.
export const ReelsTab: React.FC = () => {
  const { reels, reelsLoading, addReel, viewReel } = useApp();
  const [open, setOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const validateVideo = async (file: File): Promise<string | null> => {
    const seconds = await readVideoDuration(file);
    if (!Number.isFinite(seconds) || seconds <= 0) return 'Could not read the length of this video.';
    if (seconds > MAX_REEL_SECONDS) {
      return `Reels can be up to ${MAX_REEL_SECONDS} seconds long. This video is ${Math.ceil(seconds)} seconds.`;
    }
    setDuration(seconds);
    return null;
  };

  const resetDialog = () => {
    setVideoUrl('');
    setCaption('');
    setDuration(0);
    setPublishError(null);
  };

  const closeDialog = () => {
    setOpen(false);
    resetDialog();
  };

  const handlePublish = async () => {
    if (!videoUrl || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await addReel(videoUrl, caption.trim(), duration);
      resetDialog();
      setOpen(false);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Could not publish the reel.');
    } finally {
      setPublishing(false);
    }
  };

  const newReelButton = (
    <Button
      variant="contained"
      onClick={() => setOpen(true)}
      startIcon={<Plus aria-hidden="true" className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      sx={{
        borderRadius: 'var(--ui-radius-full)',
        px: 2,
        minWidth: 44,
        minHeight: 44,
        textTransform: 'none',
        fontWeight: 600,
        flexShrink: 0,
        backgroundImage: `linear-gradient(to right, ${T.primary}, ${T.accent})`,
      }}
    >
      New reel
    </Button>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      <PageHeader title="Reels" description="Short vertical videos, up to 90 seconds each." actions={newReelButton} />

      {reelsLoading && reels.length === 0 ? (
        // A reel-shaped placeholder: the first reels are still loading.
        <Box data-testid="skeleton-reels" aria-busy="true" aria-label="Loading" sx={{ display: 'flex', justifyContent: 'center' }}>
          <Skeleton variant="rounded" animation="wave" sx={{ width: 'min(100%, 360px)', height: 'min(70dvh, 640px)', borderRadius: 'var(--ui-radius-lg)' }} />
        </Box>
      ) : reels.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No reels yet"
          body="Short vertical videos show up here. Be the first to post one."
          action={{ label: 'New reel', onClick: () => setOpen(true) }}
        />
      ) : (
        // Phone: leave room for the app header, the page title and the bottom nav.
        <Box className="h-[calc(100dvh-15.25rem)] sm:h-[calc(100dvh-10.25rem)] overflow-y-auto snap-y snap-mandatory overscroll-contain">
          {reels.map((r) => (
            <ReelPlayer
              key={r.id}
              reel={r}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onActive={viewReel}
            />
          ))}
        </Box>
      )}

      <ResponsiveDialog
        open={open}
        onClose={() => { if (!publishing) closeDialog(); }}
        title="New reel"
        actions={
          <>
            <Button onClick={closeDialog} disabled={publishing} sx={{ ...touchTargetSx, textTransform: 'none', color: T.muted }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={!videoUrl || publishing}
              sx={{
                ...touchTargetSx,
                textTransform: 'none',
                fontWeight: 600,
                backgroundImage: `linear-gradient(to right, ${T.primary}, ${T.accent})`,
                '&.Mui-disabled': { backgroundImage: 'none', bgcolor: T.border, color: T.muted },
              }}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <MediaPicker
            kind="video"
            label="Video (up to 90 seconds)"
            value={videoUrl || undefined}
            onChange={(url) => setVideoUrl(url ?? '')}
            validate={validateVideo}
            disabled={publishing}
          />
          <TextField
            size="small"
            label="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
            helperText={`${caption.length}/${MAX_CAPTION}`}
            fullWidth
            multiline
            maxRows={3}
            disabled={publishing}
          />
          {publishError && (
            <Typography role="alert" sx={{ color: T.danger, fontSize: 'var(--ui-fs-xs)' }}>{publishError}</Typography>
          )}
        </Box>
      </ResponsiveDialog>
    </Box>
  );
};
