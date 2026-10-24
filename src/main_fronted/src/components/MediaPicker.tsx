import React, { useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { mediaUrl, uploadMedia } from '../api/gateway';
import { T } from './ui/tokens';

interface MediaPickerProps {
  kind: 'image' | 'video';
  /** Root-relative url of an already uploaded file (e.g. `/blobs/<sha>.png`). */
  value?: string;
  /** Receives the uploaded url, or null when the user removes the file. */
  onChange: (url: string | null) => void;
  label?: string;
  disabled?: boolean;
  /**
   * Optional extra check run on the picked file before upload (e.g. video duration).
   * Resolve to an error message to reject the file, or null to accept it.
   */
  validate?: (file: File) => Promise<string | null>;
}

const MAX_BYTES: Record<MediaPickerProps['kind'], number> = {
  image: 10 * 1024 * 1024,
  video: 25 * 1024 * 1024,
};
const ACCEPT: Record<MediaPickerProps['kind'], Accept> = {
  image: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [] },
  video: { 'video/mp4': [], 'video/webm': [] },
};
const HINT: Record<MediaPickerProps['kind'], string> = {
  image: 'JPEG, PNG, WebP or GIF up to 10 MB',
  video: 'MP4 or WebM up to 25 MB',
};

function rejectionMessage(kind: MediaPickerProps['kind'], rejection: FileRejection | undefined): string {
  const code = rejection?.errors[0]?.code;
  if (code === 'file-too-large') {
    return kind === 'image' ? 'Images must be 10 MB or smaller.' : 'Videos must be 25 MB or smaller.';
  }
  if (code === 'file-invalid-type') {
    return kind === 'image'
      ? 'Use a JPEG, PNG, WebP or GIF image.'
      : 'Use an MP4 or WebM video.';
  }
  if (code === 'too-many-files') return 'Choose one file at a time.';
  return rejection?.errors[0]?.message || 'This file cannot be used.';
}

// Pick-upload-preview control for image/video media. Files are chosen with a button or
// dragged onto the dashed area (react-dropzone), validated, uploaded with real progress,
// and only the resulting url is handed to the parent.
export const MediaPicker: React.FC<MediaPickerProps> = ({ kind, value, onChange, label, disabled = false, validate }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = uploading || disabled;
  const src = mediaUrl(value);

  const handleFile = async (file: File | undefined) => {
    if (!file || busy) return;
    setError(null);
    try {
      const problem = validate ? await validate(file) : null;
      if (problem) {
        setError(problem);
        return;
      }
    } catch {
      setError('Could not read this file. Try another one.');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      onChange(await uploadMedia(file, setProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    accept: ACCEPT[kind],
    maxSize: MAX_BYTES[kind],
    maxFiles: 1,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: busy,
    onDropAccepted: (files) => { void handleFile(files[0]); },
    onDropRejected: (rejections) => setError(rejectionMessage(kind, rejections[0])),
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      {label && (
        <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
          {label}
        </Typography>
      )}

      <Box
        {...getRootProps()}
        sx={{
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          textAlign: 'center',
          border: `2px dashed ${isDragActive ? T.primary : T.borderStrong}`,
          borderRadius: 'var(--ui-radius-lg)',
          bgcolor: isDragActive ? T.primarySoft : T.surface,
          transition: `background-color var(--ui-dur) var(--ui-ease), border-color var(--ui-dur) var(--ui-ease)`,
        }}
      >
        <input {...getInputProps({ 'aria-label': label ?? `Choose ${kind} file` })} />

        {src && kind === 'image' && (
          <Box
            component="img"
            src={src}
            alt={label ? `${label} preview` : 'Selected image preview'}
            referrerPolicy="no-referrer"
            sx={{ maxWidth: '100%', maxHeight: 192, borderRadius: 'var(--ui-radius-lg)', objectFit: 'cover' }}
          />
        )}
        {src && kind === 'video' && (
          <Box
            component="video"
            src={src}
            controls
            preload="metadata"
            playsInline
            aria-label={label ? `${label} preview` : 'Selected video preview'}
            sx={{ maxWidth: '100%', maxHeight: 224, width: '100%', borderRadius: 'var(--ui-radius-lg)', bgcolor: 'black' }}
          />
        )}

        {uploading ? (
          <Box sx={{ width: '100%', maxWidth: 320, minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.75 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label="Upload progress"
              sx={{ height: 8, borderRadius: 'var(--ui-radius-full)' }}
            />
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
              Uploading… {progress}%
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
            {isDragActive
              ? 'Drop the file to upload it.'
              : src
                ? 'Replace the file or remove it.'
                : `Drag a file here, or choose one. ${HINT[kind]}.`}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={open}
            startIcon={<Upload aria-hidden="true" size={18} strokeWidth={1.75} />}
            sx={{ textTransform: 'none', fontSize: 'var(--ui-fs-sm)', minHeight: 44, px: 1.5, borderRadius: 'var(--ui-radius-sm)', color: T.text, borderColor: T.borderStrong }}
          >
            {kind === 'image' ? 'Choose image' : 'Choose video'}
          </Button>
          {src && (
            <Button
              size="small"
              color="error"
              disabled={busy}
              onClick={() => { setError(null); onChange(null); }}
              sx={{ textTransform: 'none', fontSize: 'var(--ui-fs-sm)', minHeight: 44, px: 1.5, borderRadius: 'var(--ui-radius-sm)' }}
            >
              Remove
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Typography role="alert" sx={{ fontSize: 'var(--ui-fs-xs)', color: T.danger }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};
