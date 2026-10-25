import React, { useState } from 'react';
import { useApp, type Story } from '../context/AppContext';
import { Box, Button, Dialog, DialogContent, IconButton, TextField, Typography, Skeleton } from '@mui/material';
import { Plus, Trash2, X } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import { EmptyState } from './ui/EmptyState';
import { ResponsiveDialog } from './ui/ResponsiveDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Surface } from './ui/Surface';
import { UserAvatar } from './ui/UserAvatar';
import { useSettled } from './ui/useSettled';
import { T, touchTargetSx } from './ui/tokens';

const TILE_SX = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0.5,
  flexShrink: 0,
  minWidth: 72,
  p: 0.5,
  background: 'none',
  border: 0,
  borderRadius: 'var(--ui-radius-sm)',
  cursor: 'pointer',
  color: 'inherit',
  '&:hover': { bgcolor: T.surface2 },
  '&:active': { bgcolor: T.surface3 },
  '&.Mui-focusVisible, &:focus-visible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
} as const;

const LABEL_SX = {
  fontSize: 'var(--ui-fs-xs)',
  fontWeight: 500,
  color: T.text,
  maxWidth: 72,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

// Stories strip atop the home feed, backed by the generated Stories module.
export const StoriesBar: React.FC = () => {
  const { currentUser, stories, addStory, viewStory, deleteStory } = useApp();
  const [creating, setCreating] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState('');
  const [caption, setCaption] = useState('');
  const [viewing, setViewing] = useState<Story | null>(null);
  const settled = useSettled();

  const closeCreate = () => {
    setCreating(false);
    setUploadedMedia('');
    setCaption('');
  };

  const handleCreate = () => {
    if (!uploadedMedia) return;
    addStory(uploadedMedia, caption.trim());
    closeCreate();
  };

  const openStory = (s: Story) => { viewStory(s.id); setViewing(s); };

  return (
    <Surface as="section" padding="sm" aria-label="Stories">
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', alignItems: 'flex-start', pb: 0.5 }}>
        {/* Add story */}
        <Box component="button" type="button" aria-label="Add story" onClick={() => setCreating(true)} sx={TILE_SX}>
          <Box sx={{ position: 'relative', p: '2px', borderRadius: 'var(--ui-radius-full)', border: `2px dashed ${T.primary}` }}>
            <UserAvatar name={currentUser.name} src={currentUser.avatar} size="lg" />
            <Box sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: T.primary, borderRadius: 'var(--ui-radius-full)', p: 0.25, border: `2px solid ${T.surface}`, display: 'flex' }}>
              <Plus aria-hidden="true" size={12} strokeWidth={2} className="text-white" />
            </Box>
          </Box>
          <Typography sx={LABEL_SX}>Add story</Typography>
        </Box>

        {stories.map((s) => (
          <Box component="button" type="button" key={s.id} aria-label={`Open story from ${s.authorName}`} onClick={() => openStory(s)} sx={TILE_SX}>
            <Box sx={{ borderRadius: 'var(--ui-radius-full)', p: '2px', background: 'linear-gradient(to top right, var(--ui-accent), var(--ui-primary))' }}>
              <Box sx={{ borderRadius: 'var(--ui-radius-full)', p: '2px', bgcolor: T.surface }}>
                <UserAvatar name={s.authorName} src={s.authorAvatar} size="lg" />
              </Box>
            </Box>
            <Typography sx={LABEL_SX}>{s.authorName.split(' ')[0]}</Typography>
          </Box>
        ))}

        {!settled && stories.length === 0 && [0, 1, 2].map((i) => (
          <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, p: 0.5 }}>
            <Skeleton variant="circular" width={56} height={56} animation="wave" />
            <Skeleton variant="text" width={40} animation="wave" />
          </Box>
        ))}

        {settled && stories.length === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 180 }}>
            <EmptyState compact title="No stories yet" body="Share the first one." />
          </Box>
        )}
      </Box>

      {/* Create dialog */}
      <ResponsiveDialog
        open={creating}
        onClose={closeCreate}
        title="New story"
        actions={
          <Button variant="contained" onClick={handleCreate} disabled={!uploadedMedia} sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', px: 2.5 }}>
            Share
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <MediaPicker kind="image" label="Image" value={uploadedMedia || undefined} onChange={(url) => setUploadedMedia(url ?? '')} />
          <TextField size="small" label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} fullWidth />
        </Box>
      </ResponsiveDialog>

      {/* Viewer dialog */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="xs" fullWidth slotProps={{ paper: { 'aria-label': 'Story' } }}>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            aria-label="Close story"
            onClick={() => setViewing(null)}
            sx={{ ...touchTargetSx, position: 'absolute', top: 8, right: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: T.onMedia, '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <X aria-hidden="true" size={18} strokeWidth={1.75} />
          </IconButton>
          {viewing && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
                <UserAvatar name={viewing.authorName} src={viewing.authorAvatar} size="sm" />
                <Typography sx={{ fontWeight: 700, fontSize: 'var(--ui-fs-sm)', color: T.text }}>{viewing.authorName}</Typography>
                {/* Owner rule: only the author sees the delete control. The right margin keeps it clear of Close. */}
                {!!viewing.authorId && viewing.authorId === currentUser.id && (
                  <IconButton
                    aria-label="Delete your story"
                    title="Delete story"
                    onClick={() => setConfirmDeleteOpen(true)}
                    sx={{ ...touchTargetSx, ml: 'auto', mr: '52px', color: T.text }}
                  >
                    <Trash2 aria-hidden="true" size={18} strokeWidth={1.75} />
                  </IconButton>
                )}
              </Box>
              <Box
                component="img"
                src={mediaUrl(viewing.mediaUrl)}
                alt={viewing.caption || `Story by ${viewing.authorName}`}
                referrerPolicy="no-referrer"
                sx={{ display: 'block', width: '100%', maxWidth: '100%', maxHeight: '60vh', objectFit: 'cover' }}
              />
              {viewing.caption && <Typography sx={{ p: 1.5, fontSize: 'var(--ui-fs-sm)', color: T.text, overflowWrap: 'anywhere' }}>{viewing.caption}</Typography>}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Outside the viewer so that closing the viewer after a delete does not unmount it. */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this story?"
        body="It will be removed for everyone who can see it. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!viewing) return;
          await deleteStory(viewing.id);
          setViewing(null);
        }}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </Surface>
  );
};
