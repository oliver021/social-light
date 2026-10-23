import React, { useState } from 'react';
import { useApp, type Story } from '../context/AppContext';
import { Box, Card, Avatar, Typography, IconButton, Dialog, DialogContent, TextField, Button, Skeleton } from '@mui/material';
import { Plus, X } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import { EmptyState } from './ui/EmptyState';
import { useSettled } from './ui/useSettled';
import { cardSx, mutedSx, sectionTitleSx, touchTargetSx } from './ui/tokens';

const AVATAR = { width: 56, height: 56 };

// Stories strip atop the home feed, backed by the generated Stories module.
export const StoriesBar: React.FC = () => {
  const { currentUser, stories, addStory, viewStory } = useApp();
  const [creating, setCreating] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState('');
  const [caption, setCaption] = useState('');
  const [viewing, setViewing] = useState<Story | null>(null);
  const settled = useSettled();

  const handleCreate = () => {
    if (!uploadedMedia) return;
    addStory(uploadedMedia, caption.trim());
    setUploadedMedia(''); setCaption(''); setCreating(false);
  };

  const openStory = (s: Story) => { viewStory(s.id); setViewing(s); };

  return (
    <Card variant="outlined" component="section" aria-label="Stories" sx={{ ...cardSx, p: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', alignItems: 'flex-start', pb: 0.5 }}>
        {/* Add story */}
        <Box
          component="button"
          type="button"
          aria-label="Add story"
          onClick={() => setCreating(true)}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, background: 'none', border: 0, p: 0.5, cursor: 'pointer', color: 'inherit', minWidth: 64 }}
        >
          <Box sx={{ position: 'relative' }}>
            <Avatar src={currentUser.avatar} alt="" sx={{ ...AVATAR, border: '2px dashed var(--color-violet-400)' }} />
            <Box sx={{ position: 'absolute', bottom: -2, right: -2, bgcolor: 'var(--color-violet-600)', borderRadius: '50%', p: 0.25, border: '2px solid var(--ui-surface)', display: 'flex' }}>
              <Plus aria-hidden="true" className="w-3 h-3 text-white" />
            </Box>
          </Box>
          <Typography sx={{ ...mutedSx, fontSize: '0.75rem', fontWeight: 500 }}>Add story</Typography>
        </Box>

        {stories.map((s) => (
          <Box
            component="button"
            type="button"
            key={s.id}
            aria-label={`Open story from ${s.authorName}`}
            onClick={() => openStory(s)}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, background: 'none', border: 0, p: 0.5, cursor: 'pointer', color: 'inherit', minWidth: 64 }}
          >
            <Box sx={{ borderRadius: '50%', p: '2px', background: 'linear-gradient(to top right, #8b5cf6, #d946ef)' }}>
              <Avatar src={s.authorAvatar} alt="" sx={{ ...AVATAR, border: '2px solid var(--ui-surface)' }} />
            </Box>
            <Typography sx={{ ...mutedSx, fontSize: '0.75rem', fontWeight: 500, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.authorName.split(' ')[0]}
            </Typography>
          </Box>
        ))}

        {!settled && stories.length === 0 && [0, 1, 2].map((i) => (
          <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0, p: 0.5 }}>
            <Skeleton variant="circular" width={56} height={56} />
            <Skeleton variant="text" width={40} />
          </Box>
        ))}

        {settled && stories.length === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 180 }}>
            <EmptyState compact title="No stories yet" body="Share the first one." />
          </Box>
        )}
      </Box>

      {/* Create dialog */}
      <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="xs" aria-labelledby="new-story-title">
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography id="new-story-title" sx={sectionTitleSx}>New story</Typography>
          <MediaPicker kind="image" label="Image" value={uploadedMedia || undefined} onChange={(url) => setUploadedMedia(url ?? '')} />
          <TextField size="small" label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} fullWidth />
          <Button variant="contained" onClick={handleCreate} disabled={!uploadedMedia} sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600 }}>
            Share
          </Button>
        </DialogContent>
      </Dialog>

      {/* Viewer dialog */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="xs" aria-label="Story">
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton aria-label="Close story" onClick={() => setViewing(null)} sx={{ ...touchTargetSx, position: 'absolute', top: 8, right: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
            <X aria-hidden="true" className="w-4 h-4" />
          </IconButton>
          {viewing && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
                <Avatar src={viewing.authorAvatar} alt={viewing.authorName} sx={{ width: 32, height: 32 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--ui-text)' }}>{viewing.authorName}</Typography>
              </Box>
              <img src={mediaUrl(viewing.mediaUrl)} alt={viewing.caption || `Story by ${viewing.authorName}`} className="w-full max-w-full max-h-[60vh] object-cover" referrerPolicy="no-referrer" />
              {viewing.caption && <Typography sx={{ p: 1.5, fontSize: '0.875rem', color: 'var(--ui-text)' }}>{viewing.caption}</Typography>}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
