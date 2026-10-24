import React, { useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { mediaUrl, uploadMedia } from '../api/gateway';

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
    <Box className="flex flex-col gap-1.5">
      {label && (
        <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs font-mono">
          {label}
        </Typography>
      )}

      <Box
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-3 flex flex-col items-center gap-2 text-center transition-colors ${
          isDragActive
            ? 'border-primary bg-primary-soft'
            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950'
        }`}
      >
        <input {...getInputProps({ 'aria-label': label ?? `Choose ${kind} file` })} />

        {src && kind === 'image' && (
          <img src={src} alt={label ?? 'Uploaded image'} className="max-w-full max-h-48 rounded-lg object-cover" referrerPolicy="no-referrer" />
        )}
        {src && kind === 'video' && (
          <video src={src} controls preload="metadata" playsInline className="max-w-full max-h-56 w-full rounded-lg bg-black" />
        )}

        {uploading ? (
          <Box className="w-full max-w-xs flex flex-col gap-1.5 min-h-[44px] justify-center">
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label="Upload progress"
              className="h-2 rounded"
            />
            <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs font-mono">
              Uploading… {progress}%
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs">
            {isDragActive
              ? 'Drop the file to upload it.'
              : src
                ? 'Replace the file or remove it.'
                : `Drag a file here, or choose one. ${HINT[kind]}.`}
          </Typography>
        )}

        <Box className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={open}
            startIcon={<Upload className="w-3.5 h-3.5" />}
            className="normal-case text-xs min-h-[44px] px-3 rounded-lg text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
          >
            {kind === 'image' ? 'Choose image' : 'Choose video'}
          </Button>
          {src && (
            <Button
              size="small"
              color="error"
              disabled={busy}
              onClick={() => { setError(null); onChange(null); }}
              className="normal-case text-xs min-h-[44px] px-3 rounded-lg"
            >
              Remove
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Typography role="alert" className="text-red-600 dark:text-red-400 text-xs">
          {error}
        </Typography>
      )}
    </Box>
  );
};
