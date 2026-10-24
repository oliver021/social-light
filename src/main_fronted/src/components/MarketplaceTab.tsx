import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Typography, Grid, Button, TextField, Divider, Chip, InputAdornment } from '@mui/material';
import { ShoppingBag, MapPin, Search, PlusCircle, ShoppingCart, ImageOff } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import { CardGridSkeleton, EmptyState, PageHeader, ResponsiveDialog, Surface, SectionHeader, T, mutedSx, touchTargetSx } from './ui';

export const MarketplaceTab: React.FC = () => {
  const { marketItems, marketCategories, marketplaceLoading, createMarketItem, addNotification } = useApp();
  // The first catalog load is pending: show placeholder cards, not a false "no listings".
  const gridPending = Boolean(marketplaceLoading) && marketItems.length === 0;
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

  const listButton = (
    <Button
      variant="contained"
      onClick={() => setCreateOpen(true)}
      startIcon={<PlusCircle aria-hidden="true" className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      sx={{ borderRadius: 'var(--ui-radius-full)', px: 2, minWidth: 44, minHeight: 44, textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
    >
      List an item
    </Button>
  );

  return (
    <Box id="marketplace-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      <PageHeader title="Marketplace" description="Items people list for sale near you." actions={listButton} />

      {/* SEARCH AND CATEGORY FILTERS */}
      <Surface as="section" aria-label="Marketplace filters" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionHeader title="Browse" as="h2" />

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
                  <Search aria-hidden="true" className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Search items' }
          }}
        />

        {/* CATEGORY CHIPS (44 px touch targets on phones) */}
        <Box role="group" aria-label="Categories" sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', py: 0.5 }}>
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
                  borderRadius: 'var(--ui-radius-full)',
                  fontSize: 'var(--ui-fs-sm)',
                  fontWeight: selected ? 600 : 500,
                  flexShrink: 0,
                  bgcolor: selected ? T.primarySoft : 'transparent',
                  color: selected ? T.primary : T.text,
                  borderColor: T.border,
                  '&:hover': { bgcolor: selected ? T.primarySoft : T.surface2 },
                  '&:active': { bgcolor: T.surface3 },
                }}
              />
            );
          })}
        </Box>
      </Surface>

      {/* PRODUCTS */}
      {gridPending ? (
        <CardGridSkeleton count={6} />
      ) : filteredItems.length === 0 ? (
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
              <Surface
                as="article"
                aria-label={item.title}
                padding="none"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full max-w-full h-40 object-cover"
                    style={{ borderBottom: `1px solid ${T.border}` }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Box
                    role="img"
                    aria-label={`${item.title}: no picture`}
                    sx={{ width: '100%', height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, borderBottom: `1px solid ${T.border}`, bgcolor: T.page, color: T.muted }}
                  >
                    <ImageOff aria-hidden="true" className="w-6 h-6" strokeWidth={1.75} />
                    <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>No picture</Typography>
                  </Box>
                )}
                <Box sx={{ p: 'var(--ui-card-pad)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 1.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 'var(--ui-fs-base)', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--ui-fs-base)', color: T.text, whiteSpace: 'nowrap' }}>
                        ${item.price}
                      </Typography>
                    </Box>

                    {item.id.startsWith('draft-') && (
                      <Chip size="small" label="Draft, this device only" sx={{ alignSelf: 'flex-start', fontSize: 'var(--ui-fs-xs)', height: 24, bgcolor: T.warningSoft, color: T.warning }} />
                    )}

                    <Typography sx={{ ...mutedSx, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                      <MapPin aria-hidden="true" className="w-[14px] h-[14px] shrink-0" strokeWidth={1.75} />
                      {item.location}
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      disabled
                      startIcon={<ShoppingCart aria-hidden="true" className="w-3 h-3" strokeWidth={1.75} />}
                      sx={{ borderRadius: 'var(--ui-radius-full)', px: 2, textTransform: 'none', fontWeight: 600, fontSize: 'var(--ui-fs-xs)', minHeight: 32 }}
                    >
                      Checkout unavailable in this demo
                    </Button>
                  </Box>
                </Box>
              </Surface>
            </Grid>
          ))}
        </Grid>
      )}

      {/* CREATE LISTING DIALOG */}
      <ResponsiveDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New listing"
        actions={
          <>
            <Button onClick={() => setCreateOpen(false)} sx={{ ...touchTargetSx, textTransform: 'none', color: T.muted }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateSubmit}
              disabled={!newTitle.trim() || !newPrice}
              sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, '&.Mui-disabled': { bgcolor: T.border, color: T.muted } }}
            >
              Save draft
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography role="note" sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text, bgcolor: T.warningSoft, borderRadius: 'var(--ui-radius-sm)', p: 1.25, border: `1px solid ${T.warning}` }}>
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
        </Box>
      </ResponsiveDialog>
    </Box>
  );
};
