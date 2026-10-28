import React, { useEffect, useState } from 'react';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mediaUrl } from '../../api/gateway';
import { ResponsiveDialog } from '../ui/ResponsiveDialog';
import { T } from '../ui/tokens';

export interface ImageGalleryProps {
  /** Root-relative or absolute image urls, in the order the author chose. */
  images: string[];
  /** Alt text for the images (the post text, or the author). */
  alt: string;
}

/** Grid template and height per image count: 1 full width, 2 side by side, 3 one large and two stacked, 4 a 2x2 grid. */
function layoutFor(count: number): { columns: string; rows: string; height: number | 'auto' } {
  if (count === 1) return { columns: '1fr', rows: '1fr', height: 'auto' };
  if (count === 2) return { columns: '1fr 1fr', rows: '1fr', height: 240 };
  if (count === 3) return { columns: '2fr 1fr', rows: '1fr 1fr', height: 360 };
  return { columns: '1fr 1fr', rows: '1fr 1fr', height: 440 };
}

/**
 * The images of one post. Every tile is a button that opens a lightbox, where the arrow keys
 * and the Previous / Next buttons move between the images.
 */
export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, alt }) => {
  const count = images.length;
  // The index of the image open in the lightbox, or null when it is closed.
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const layout = layoutFor(count);

  const step = (delta: number) => {
    setIndex((current) => (current === null ? current : (current + delta + count) % count));
  };

  // The arrow keys work anywhere while the lightbox is open, not only when it has focus.
  useEffect(() => {
    if (!open || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // step only reads count and uses the functional setState, so re-subscribing on open/count is enough.
  }, [open, count]);

  if (count === 0) return null;

  const current = index ?? 0;
  const currentSrc = mediaUrl(images[current]);

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: layout.columns,
          gridTemplateRows: layout.rows,
          gap: '4px',
          height: layout.height,
          borderRadius: 'var(--ui-radius-lg)',
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          bgcolor: T.surface2,
        }}
      >
        {images.map((url, i) => (
          <ButtonBase
            key={`${url}-${i}`}
            onClick={() => setIndex(i)}
            aria-label={`Open image ${i + 1} of ${count}`}
            sx={{
              position: 'relative',
              display: 'block',
              minHeight: 44,
              overflow: 'hidden',
              gridRow: count === 3 && i === 0 ? '1 / span 2' : undefined,
              '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: -2 },
            }}
          >
            <Box
              component="img"
              src={mediaUrl(url)}
              alt={alt}
              referrerPolicy="no-referrer"
              sx={{
                display: 'block',
                width: '100%',
                height: count === 1 ? 'auto' : '100%',
                maxHeight: count === 1 ? 560 : undefined,
                objectFit: 'cover',
              }}
            />
          </ButtonBase>
        ))}
      </Box>

      <ResponsiveDialog
        open={open}
        onClose={() => setIndex(null)}
        title="Post photos"
        maxWidth="md"
        actions={count > 1 ? (
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted, mr: 'auto' }}>
            {current + 1} / {count}
          </Typography>
        ) : undefined}
      >
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <IconButton
              aria-label="Previous image"
              disabled={count < 2}
              onClick={() => step(-1)}
              sx={{ width: 44, height: 44, flexShrink: 0, color: T.text }}
            >
              <ChevronLeft aria-hidden="true" size={24} strokeWidth={1.75} />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
              <Box
                component="img"
                src={currentSrc}
                alt={`Image ${current + 1} of ${count}`}
                referrerPolicy="no-referrer"
                sx={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </Box>
            <IconButton
              aria-label="Next image"
              disabled={count < 2}
              onClick={() => step(1)}
              sx={{ width: 44, height: 44, flexShrink: 0, color: T.text }}
            >
              <ChevronRight aria-hidden="true" size={24} strokeWidth={1.75} />
            </IconButton>
          </Box>
        )}
      </ResponsiveDialog>
    </>
  );
};
