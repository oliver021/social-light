import React, { useState } from 'react';
import { useApp, type Story } from '../context/AppContext';
import { Box, Card, Avatar, Typography, IconButton, Dialog, DialogContent, TextField, Button } from '@mui/material';
import { Plus, X } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';

// Stories strip atop the home feed, backed by the generated Stories module.
export const StoriesBar: React.FC = () => {
  const { currentUser, stories, addStory, viewStory } = useApp();
  const [creating, setCreating] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState('');
  const [caption, setCaption] = useState('');
  const [viewing, setViewing] = useState<Story | null>(null);

  const handleCreate = () => {
    if (!uploadedMedia) return;
    addStory(uploadedMedia, caption.trim());
    setUploadedMedia(''); setCaption(''); setCreating(false);
  };

  const openStory = (s: Story) => { viewStory(s.id); setViewing(s); };

  return (
    <Card variant="outlined" className="p-3 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950">
      <Box className="flex gap-3 overflow-x-auto scrollbar-none">
        {/* Add story */}
        <Box
          role="button"
          tabIndex={0}
          aria-label="Add story"
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
          onClick={() => setCreating(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCreating(true); } }}
        >
          <Box className="relative">
            <Avatar src={currentUser.avatar} className="w-14 h-14 border-2 border-dashed border-violet-400" />
            <Box className="absolute -bottom-0.5 -right-0.5 bg-violet-600 rounded-full p-0.5 border-2 border-white dark:border-zinc-950">
              <Plus className="w-3 h-3 text-white" />
            </Box>
          </Box>
          <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Add Story</Typography>
        </Box>

        {stories.map((s) => (
          <Box
            key={s.id}
            role="button"
            tabIndex={0}
            aria-label={`Open story from ${s.authorName}`}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer hover:opacity-85"
            onClick={() => openStory(s)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStory(s); } }}
          >
            <Box className="rounded-full p-0.5 bg-gradient-to-tr from-violet-500 to-fuchsia-500">
              <Avatar src={s.authorAvatar} className="w-14 h-14 border-2 border-white dark:border-zinc-950" />
            </Box>
            <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate w-16 text-center">
              {s.authorName.split(' ')[0]}
            </Typography>
          </Box>
        ))}

        {stories.length === 0 && (
          <Box className="flex items-center px-3">
            <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 italic">No stories yet — share the first one.</Typography>
          </Box>
        )}
      </Box>

      {/* Create dialog */}
      <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="xs">
        <DialogContent className="dark:bg-zinc-950 flex flex-col gap-3">
          <Typography variant="subtitle2" className="font-display font-bold text-zinc-800 dark:text-zinc-200">New Story</Typography>
          <MediaPicker kind="image" label="Image" value={uploadedMedia || undefined} onChange={(url) => setUploadedMedia(url ?? '')} />
          <TextField size="small" label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} fullWidth />
          <Button variant="contained" onClick={handleCreate} disabled={!uploadedMedia} className="bg-gradient-to-r from-violet-600 to-fuchsia-600">Share Story</Button>
        </DialogContent>
      </Dialog>

      {/* Viewer dialog */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="xs">
        <DialogContent className="dark:bg-zinc-950 p-0 relative">
          <IconButton size="small" aria-label="Close story" onClick={() => setViewing(null)} className="absolute top-2 right-2 z-10 w-11 h-11 bg-black/40 text-white">
            <X className="w-4 h-4" />
          </IconButton>
          {viewing && (
            <Box>
              <Box className="flex items-center gap-2 p-3">
                <Avatar src={viewing.authorAvatar} className="w-8 h-8" />
                <Typography variant="caption" className="font-bold text-zinc-800 dark:text-zinc-200">{viewing.authorName}</Typography>
              </Box>
              <img src={mediaUrl(viewing.mediaUrl)} alt={viewing.caption || `Story by ${viewing.authorName}`} className="w-full max-w-full max-h-[60vh] object-cover" referrerPolicy="no-referrer" />
              {viewing.caption && <Typography variant="body2" className="p-3 text-xs text-zinc-700 dark:text-zinc-300">{viewing.caption}</Typography>}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
