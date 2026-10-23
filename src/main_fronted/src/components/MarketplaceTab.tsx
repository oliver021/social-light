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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment
} from '@mui/material';
import { ShoppingBag, MapPin, Search, PlusCircle, ShoppingCart, ImageOff } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import { EmptyState } from './ui/EmptyState';
import { cardSx, mutedSx, sectionTitleSx, touchTargetSx } from './ui/tokens';

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

  const filtersActive = search.trim() !== '' || activeCategory !== 'All';

  const clearFilters = () => {
    setSearch('');
    setActiveCategory('All');
  };

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

    addNotification('mention', 'Marketplace', `Saved "${newTitle}" as a draft on this device. It is not published yet.`);
  };

  return (
    <Box id="marketplace-tab-page" className="space-y-4">
      {/* HEADER, SEARCH AND CATEGORY FILTERS */}
      <Card variant="outlined" component="section" aria-label="Marketplace filters" sx={{ ...cardSx, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box className="flex items-center justify-between gap-2">
          <Typography component="h2" sx={{ ...sectionTitleSx, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingBag aria-hidden="true" className="w-4 h-4 text-amber-500" />
            Marketplace
          </Typography>

          <Button
            variant="contained"
            onClick={() => setCreateOpen(true)}
            sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 999, px: 2, bgcolor: '#b45309', color: '#fff', '&:hover': { bgcolor: '#92400e' }, flexShrink: 0 }}
          >
            <PlusCircle aria-hidden="true" className="w-4 h-4 mr-1" />
            List an item
          </Button>
        </Box>

        <TextField
          size="small"
          fullWidth
          placeholder="Search items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="outlined"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search aria-hidden="true" className="w-3.5 h-3.5" />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Search items' }
          }}
        />

        {/* CATEGORY CHIPS (44 px touch targets on phones) */}
        <Box role="group" aria-label="Categories" className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {categories.map((cat) => {
            const selected = activeCategory === cat;
            return (
              <Chip
                key={cat}
                label={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={selected}
                variant={selected ? 'filled' : 'outlined'}
                sx={{
                  height: { xs: 44, sm: 32 },
                  px: 0.5,
                  borderRadius: 999,
                  fontSize: '0.8125rem',
                  fontWeight: selected ? 600 : 500,
                  flexShrink: 0,
                  bgcolor: selected ? '#f59e0b' : 'transparent',
                  color: selected ? '#18181b' : 'var(--ui-text)',
                  borderColor: 'var(--ui-border)',
                  '&:hover': { bgcolor: selected ? '#d97706' : 'action.hover' },
                }}
              />
            );
          })}
        </Box>
      </Card>

      {/* PRODUCTS */}
      {filteredItems.length === 0 ? (
        marketItems.length === 0 || !filtersActive ? (
          <EmptyState
            icon={ShoppingBag}
            title="No listings yet"
            body="Items people list for sale show up here. You can save a draft to try the form."
            action={{ label: 'List an item', onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No items match your search"
            body="Try another word or category."
            action={{ label: 'Clear filters', onClick: clearFilters }}
          />
        )
      ) : (
        <Grid container spacing={2}>
          {filteredItems.map((item) => (
            <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
              <Card
                variant="outlined"
                component="article"
                aria-label={item.title}
                sx={{ ...cardSx, p: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border-color 0.2s', '&:hover': { borderColor: '#fcd34d' } }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full max-w-full h-40 object-cover"
                    style={{ borderBottom: '1px solid var(--ui-border)' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Box
                    role="img"
                    aria-label={`${item.title}: no picture`}
                    sx={{ width: '100%', height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, borderBottom: '1px solid var(--ui-border)', bgcolor: 'var(--ui-page)', color: 'var(--ui-muted)' }}
                  >
                    <ImageOff aria-hidden="true" className="w-6 h-6" />
                    <Typography sx={{ ...mutedSx, fontSize: '0.75rem' }}>No picture</Typography>
                  </Box>
                )}
                <Box sx={{ p: 'var(--ui-card-pad)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 1.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ui-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: '#b45309', whiteSpace: 'nowrap' }}>
                        ${item.price}
                      </Typography>
                    </Box>

                    {item.id.startsWith('draft-') && (
                      <Chip size="small" label="Draft, this device only" sx={{ alignSelf: 'flex-start', fontSize: '0.6875rem', height: 22, bgcolor: '#fef3c7', color: '#92400e' }} />
                    )}

                    <Typography sx={{ ...mutedSx, fontSize: '0.8125rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ ...mutedSx, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                      <MapPin aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      {item.location}
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      disabled
                      startIcon={<ShoppingCart aria-hidden="true" className="w-3 h-3" />}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 999, minHeight: 32 }}
                    >
                      Checkout unavailable in this demo
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* CREATE LISTING DIALOG */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: { borderRadius: 'var(--ui-radius)', border: '1px solid var(--ui-border)', bgcolor: 'var(--ui-surface)', backgroundImage: 'none' }
          }
        }}
      >
        <DialogTitle sx={{ ...sectionTitleSx, fontSize: '1rem', pb: 1 }}>
          New listing
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography role="note" sx={{ fontSize: '0.8125rem', color: '#92400e', bgcolor: '#fffbeb', borderRadius: 2, p: 1.25, border: '1px solid #fde68a', '.dark &': { color: '#fcd34d', bgcolor: 'rgba(120,53,15,0.25)', borderColor: 'rgba(146,64,14,0.5)' } }}>
            Saved in this browser only. Listings are not published to the catalog yet.
          </Typography>
          <TextField
            size="small"
            fullWidth
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What are you selling?"
          />

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField
              size="small"
              label="Price (USD)"
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="34"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }
              }}
              sx={{ width: { xs: '100%', sm: 150 } }}
            />
            <TextField
              size="small"
              fullWidth
              label="Location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="City, region"
            />
          </Box>

          <TextField
            size="small"
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Condition, size, or anything buyers should know"
          />

          <MediaPicker
            kind="image"
            label="Photo (optional)"
            value={newImage || undefined}
            onChange={(url) => setNewImage(url ?? '')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ ...touchTargetSx, textTransform: 'none', color: 'var(--ui-muted)' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={!newTitle.trim() || !newPrice}
            sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, bgcolor: '#b45309', color: '#fff', '&:hover': { bgcolor: '#92400e' }, '&.Mui-disabled': { bgcolor: 'var(--ui-border)', color: 'var(--ui-muted)' } }}
          >
            Save draft
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
