import React, { useMemo, useState } from 'react';
import { useApp, groupStoriesByAuthor } from '../context/AppContext';
import { Alert, Box, Button, MenuItem, TextField, Typography, Skeleton } from '@mui/material';
import { Plus } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { messageOf } from '../api/gateway';
import { EmptyState } from './ui/EmptyState';
import { ResponsiveDialog } from './ui/ResponsiveDialog';
import { Surface } from './ui/Surface';
import { UserAvatar } from './ui/UserAvatar';
import { useSettled } from './ui/useSettled';
import { StoryViewer } from './stories/StoryViewer';
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

// Stories strip atop the home feed, backed by the generated Stories module. One tile per author;
// the viewer steps through that author's live stories.
export const StoriesBar: React.FC = () => {
  const { currentUser, stories, addStory } = useApp();
  const [creating, setCreating] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploadedMedia, setUploadedMedia] = useState('');
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // The author whose stories are open in the viewer, or null when it is closed.
  const [openAuthorId, setOpenAuthorId] = useState<string | null>(null);
  const settled = useSettled();

  const groups = useMemo(() => groupStoriesByAuthor(stories, currentUser.id), [stories, currentUser.id]);
  const openGroup = groups.find((g) => g.authorId === openAuthorId) ?? null;

  const closeCreate = () => {
    if (saving) return;
    setCreating(false);
    setMediaType('image');
    setUploadedMedia('');
    setCaption('');
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!uploadedMedia || saving) return;
    setSaving(true);
    setCreateError(null);
    try {
      await addStory(uploadedMedia, caption.trim(), mediaType);
      setSaving(false);
      setCreating(false);
      setMediaType('image');
      setUploadedMedia('');
      setCaption('');
    } catch (err) {
      setCreateError(messageOf(err, 'Your story was not shared'));
      setSaving(false);
    }
  };

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

        {groups.map((g) => (
          <Box component="button" type="button" key={g.authorId} aria-label={`Open story from ${g.authorName}`} onClick={() => setOpenAuthorId(g.authorId)} sx={TILE_SX}>
            <Box sx={{ borderRadius: 'var(--ui-radius-full)', p: '2px', background: 'linear-gradient(to top right, var(--ui-accent), var(--ui-primary))' }}>
              <Box sx={{ borderRadius: 'var(--ui-radius-full)', p: '2px', bgcolor: T.surface }}>
                <UserAvatar name={g.authorName} src={g.authorAvatar} size="lg" />
              </Box>
            </Box>
            <Typography sx={LABEL_SX}>{g.authorName.split(' ')[0]}</Typography>
          </Box>
        ))}

        {!settled && groups.length === 0 && [0, 1, 2].map((i) => (
          <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, p: 0.5 }}>
            <Skeleton variant="circular" width={56} height={56} animation="wave" />
            <Skeleton variant="text" width={40} animation="wave" />
          </Box>
        ))}

        {settled && groups.length === 0 && (
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
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!uploadedMedia || saving}
            sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', px: 2.5 }}
          >
            {saving ? 'Sharing…' : 'Share'}
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          {createError && <Alert severity="error">{createError}</Alert>}
          <TextField
            size="small"
            select
            label="Type"
            value={mediaType}
            disabled={saving}
            onChange={(e) => {
              setMediaType(e.target.value as 'image' | 'video');
              setUploadedMedia('');
            }}
          >
            <MenuItem value="image">Photo</MenuItem>
            <MenuItem value="video">Video</MenuItem>
          </TextField>
          <MediaPicker
            key={mediaType}
            kind={mediaType}
            label={mediaType === 'video' ? 'Video' : 'Image'}
            value={uploadedMedia || undefined}
            disabled={saving}
            onChange={(url) => setUploadedMedia(url ?? '')}
          />
          <TextField size="small" label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} fullWidth disabled={saving} />
        </Box>
      </ResponsiveDialog>

      {/* Viewer: always mounted, so its exit transition and the delete confirmation keep working. */}
      <StoryViewer group={openGroup} open={!!openGroup} onClose={() => setOpenAuthorId(null)} />
    </Surface>
  );
};
