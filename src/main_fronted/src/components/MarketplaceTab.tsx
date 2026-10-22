import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Box, 
  Card, 
  Typography, 
  Grid, 
  Button, 
  TextField, 
  Divider, 
  Collapse,
  Badge,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { ShoppingBag, Tag, MapPin, Search, PlusCircle, ShoppingCart, Check, X, LogIn, ImageOff } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import { motion, AnimatePresence } from 'motion/react';

export const MarketplaceTab: React.FC = () => {
  const { marketItems, marketCategories, createMarketItem, addNotification } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  
  // Create listing form state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newLocation, setNewLocation] = useState('Austin, TX');
  // Root-relative url of the uploaded listing picture (empty when none chosen).
  const [newImage, setNewImage] = useState('');

  // Real catalog types from the backend (falls back to a sensible default before load).
  const categories = ['All', ...(marketCategories.length ? marketCategories : ['General'])];

  const filteredItems = marketItems.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                        item.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrice) return;
    
    createMarketItem(
      newTitle.trim(),
      newDesc.trim(),
      Number(newPrice),
      newCategory,
      newLocation,
      mediaUrl(newImage) ?? ''
    );

    // reset fields
    setNewTitle('');
    setNewDesc('');
    setNewPrice('');
    setNewImage('');
    setCreateOpen(false);

    addNotification('mention', 'Marketplace', `Saved "${newTitle}" as a local draft. It is not published to the catalog.`);
  };

  return (
    <Box id="marketplace-tab-page" className="space-y-4">
      {/* FILTER BAR AND NEW LISTING BUTTON */}
      <Card variant="outlined" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 flex flex-col gap-3">
        <Box className="flex items-center justify-between">
          <Typography variant="subtitle2" className="font-display font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-amber-500 animate-pulse" />
            Marketplace
          </Typography>

          <Button
            size="small"
            variant="contained"
            onClick={() => setCreateOpen(true)}
            className="normal-case text-xs font-display bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1 py-1 px-2.5 min-h-[44px] shrink-0 shadow-md shadow-amber-500/15"
          >
            <PlusCircle className="w-4 h-4" />
            List an Item
          </Button>
        </Box>

        <Box className="flex gap-2">
          <TextField
            size="small"
            fullWidth
            placeholder="Search products, hardware, workspace items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
            className="bg-zinc-50/50 dark:bg-zinc-90 w-10 text-xs"
            slotProps={{
              input: {
                className: 'text-xs',
                startAdornment: <Search className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 mr-2 shrink-0" />
              },
              htmlInput: { 'aria-label': 'Search marketplace' }
            }}
          />
        </Box>

        {/* HORIZONTAL CATEGORY CHIPS */}
        <Box className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {categories.map((cat) => (
            <Chip 
              key={cat}
              label={cat}
              onClick={() => setActiveCategory(cat)}
              size="small"
              className={`text-xs font-medium transition shrink-0 ${
                activeCategory === cat 
                ? 'bg-amber-550 text-zinc-950 font-semibold bg-amber-500' 
                : 'bg-zinc-100 dark:bg-zinc-90 w-10 hover:bg-zinc-200 dark:hover:bg-zinc-850'
              }`}
            />
          ))}
        </Box>
      </Card>

      {/* PRODUCTS DISPLAY LIST GRID */}
      {filteredItems.length === 0 ? (
        <Card variant="outlined" className="p-8 text-center border-dashed border-zinc-200 dark:border-zinc-800">
          <Typography variant="body2" className="text-zinc-600 dark:text-zinc-400 font-display">
            No listing nodes matching search parameters. Help populate it!
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredItems.map((item) => (
            <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
              <Card 
                variant="outlined" 
                className="h-full border-zinc-200 dark:border-zinc-850 hover:border-amber-300 dark:hover:border-amber-850 transition-all rounded-2xl bg-white dark:bg-zinc-950 flex flex-col justify-between overflow-hidden relative"
              >
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full max-w-full h-40 object-cover border-b border-zinc-100 dark:border-zinc-900"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Box className="w-full h-40 flex flex-col items-center justify-center gap-1 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                    <ImageOff className="w-6 h-6" aria-hidden="true" />
                    <Typography variant="caption" className="text-xs">No picture</Typography>
                  </Box>
                )}
                <Box className="p-4 flex flex-col justify-between h-full gap-3">
                  <Box className="space-y-1.5">
                    <Box className="flex items-center justify-between gap-1">
                      <Typography variant="body2" className="font-display font-semibold text-zinc-900 dark:text-zinc-100 text-xs line-clamp-1">
                        {item.title}
                      </Typography>
                      <Typography variant="body2" className="font-mono font-bold text-amber-600 dark:text-amber-500 text-xs whitespace-nowrap">
                        ${item.price}
                      </Typography>
                    </Box>

                    {item.id.startsWith('draft-') && (
                      <Chip size="small" label="Local draft, not in catalog" className="text-[10px] h-5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300" />
                    )}

                    <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed line-clamp-2">
                      {item.description}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box className="flex items-center justify-between">
                    <Box className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                      {item.location}
                    </Box>

                    <Button
                      size="small"
                      variant="contained"
                      disabled
                      className="normal-case text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-zinc-900 pr-2.5 pl-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                      style={{ height: '24px' }}
                      sx={{ '&.Mui-disabled': { color: 'text.secondary', bgcolor: 'action.disabledBackground' } }}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Checkout unavailable in this demo
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* CREATE LISTING DIALOG MODAL */}
      <Dialog 
        open={createOpen} 
        onClose={() => setCreateOpen(false)}
        slotProps={{
          paper: {
            className: 'w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2'
          }
        }}
      >
        <DialogTitle className="font-display font-bold text-sm text-zinc-800 dark:text-zinc-200 pb-2">
          New listing
        </DialogTitle>
        <DialogContent className="space-y-3 pt-2">
          <Typography role="note" className="text-amber-800 dark:text-amber-300 text-xs bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2">
            Local draft. Listings are kept in this browser and are not published to the catalog yet.
          </Typography>
          <TextField
            size="small"
            fullWidth
            label="Product Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g., Cybernetic Keycap Puller"
            slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
          />

          <Box className="flex flex-col sm:flex-row gap-2">
            <TextField
              size="small"
              label="Price (USD)"
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="34"
              slotProps={{ 
                input: { 
                  className: 'text-xs',
                  startAdornment: <InputAdornment position="start"><span className="text-xs">$</span></InputAdornment>
                }, 
                inputLabel: { className: 'text-xs' } 
              }}
            />
            <TextField
              size="small"
              fullWidth
              label="Location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g., Austin, TX"
              slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
            />
          </Box>

          <TextField
            size="small"
            fullWidth
            multiline
            rows={2}
            label="Item Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Introduce custom characteristics, hardware interface, condition..."
            slotProps={{ input: { className: 'text-xs' }, inputLabel: { className: 'text-xs' } }}
          />

          <MediaPicker
            kind="image"
            label="Listing image (optional)"
            value={newImage || undefined}
            onChange={(url) => setNewImage(url ?? '')}
          />
        </DialogContent>
        <DialogActions className="pr-4 pb-4">
          <Button size="small" onClick={() => setCreateOpen(false)} className="text-xs text-zinc-600 dark:text-zinc-400 normal-case">Cancel</Button>
          <Button 
            size="small" 
            variant="contained" 
            onClick={handleCreateSubmit}
            disabled={!newTitle.trim() || !newPrice}
            className="bg-amber-500 hover:bg-amber-600 text-zinc-900 rounded-lg text-xs normal-case px-4.5 min-h-[44px]"
          >
            Save local draft
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
