import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Card, Avatar, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { Clapperboard, Plus, Play, Pause, Volume2, VolumeX, Music2 } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import type { Reel } from '../context/useReels';

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

// One full-height reel. Plays muted-by-default when at least 60 % is on screen, pauses
// when it leaves the viewport, and reports the first time it becomes active (a view).
const ReelPlayer: React.FC<{
  reel: Reel;
  muted: boolean;
  onToggleMute: () => void;
  onActive: (reelId: string) => void;
}> = ({ reel, muted, onToggleMute, onActive }) => {
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
      <Box className="relative h-full w-full max-w-[min(100%,calc((100dvh_-_14.5rem)*9/16))] sm:max-w-[min(100%,calc((100dvh_-_10.5rem)*9/16))] bg-black rounded-2xl overflow-hidden">
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
          className="!absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !bg-black/40 !text-white min-h-[44px] min-w-[44px] opacity-80"
          sx={{ display: paused ? 'flex' : 'none' }}
        >
          {paused ? <Play className="w-7 h-7 fill-current" /> : <Pause className="w-7 h-7" />}
        </IconButton>

        <IconButton
          aria-label={muted ? 'Unmute reel' : 'Mute reel'}
          onClick={onToggleMute}
          className="!absolute top-2 right-2 !bg-black/40 !text-white min-h-[44px] min-w-[44px]"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </IconButton>

        <Box className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
          <Box className="flex items-center gap-2 min-w-0">
            <Avatar src={reel.creatorAvatar} className="w-8 h-8 shrink-0" />
            <Typography variant="body2" className="font-semibold text-white text-sm break-words min-w-0">
              {reel.creatorName}
            </Typography>
            <Typography variant="caption" className="text-white/80 text-xs font-mono shrink-0">{reel.duration}s</Typography>
          </Box>
          {reel.caption && (
            <Box className="mt-2 flex items-start gap-1.5">
              <Music2 className="w-3 h-3 text-violet-300 mt-0.5 shrink-0" />
              <Typography variant="body2" className="text-white text-xs break-words min-w-0">{reel.caption}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Reels feed (short-form video): a vertical scroll-snap list, one reel per screen.
export const ReelsTab: React.FC = () => {
  const { reels, addReel, viewReel } = useApp();
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

  return (
    <Box className="relative">
      <Card variant="outlined" className="mb-3 p-3 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-violet-500" />
          <Typography variant="subtitle1" className="font-display font-bold text-zinc-800 dark:text-zinc-200">Reels</Typography>
        </Box>
        <Button size="small" variant="contained" onClick={() => setOpen(true)} className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 normal-case text-xs shrink-0">
          <Plus className="w-4 h-4 mr-1" /> New Reel
        </Button>
      </Card>

      {reels.length === 0 ? (
        <Card variant="outlined" className="p-8 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 text-center">
          <Typography variant="body2" className="text-zinc-600 dark:text-zinc-400 text-sm">No reels yet. Publish the first short.</Typography>
        </Card>
      ) : (
        // Phone: leave room for the app header, the Reels bar and the bottom nav.
        <Box className="h-[calc(100dvh-13.5rem)] sm:h-[calc(100dvh-8.5rem)] overflow-y-auto snap-y snap-mandatory overscroll-contain">
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

      <Dialog
        open={open}
        onClose={() => { if (!publishing) { setOpen(false); resetDialog(); } }}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { className: 'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950' } }}
      >
        <DialogTitle className="font-display font-bold text-sm text-zinc-800 dark:text-zinc-200">New Reel</DialogTitle>
        <DialogContent className="flex flex-col gap-3 pt-2">
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
            <Typography role="alert" className="text-red-600 dark:text-red-400 text-xs">{publishError}</Typography>
          )}
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button size="small" onClick={() => { setOpen(false); resetDialog(); }} disabled={publishing} className="normal-case text-xs text-zinc-600 dark:text-zinc-400">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePublish}
            disabled={!videoUrl || publishing}
            className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 normal-case"
          >
            {publishing ? 'Publishing…' : 'Publish Reel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
