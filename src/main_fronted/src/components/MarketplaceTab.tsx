import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Typography, Grid, Button, TextField, Divider, Chip, InputAdornment, MenuItem } from '@mui/material';
import { ShoppingBag, Tag, Search, PlusCircle, ShoppingCart, ImageOff } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { mediaUrl } from '../api/gateway';
import { AsyncButton, CardGridSkeleton, EmptyState, InlineError, PageHeader, ResponsiveDialog, Surface, SectionHeader, T, mutedSx, touchTargetSx } from './ui';

/** Prices are shown in US dollars, the only currency the catalog stores. */
const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const SEARCH_DEBOUNCE_MS = 350;

export const MarketplaceTab: React.FC = () => {
  const {
    marketItems,
    marketTypes,
    marketBrands,
    marketQuery,
    setMarketQuery,
    marketCountLabel,
    marketNote,
    marketHasMore,
    loadMoreMarket,
    marketError,
    retryMarketplace,
    marketplaceLoading,
    createMarketItem,
    addNotification,
    marketSelectedId,
    openMarketItem,
    closeMarketItem,
    marketDetail,
    marketDetailLoading,
    marketDetailError,
  } = useApp();
  // The first catalog load is pending: show placeholder cards, not a false "no listings".
  const gridPending = Boolean(marketplaceLoading) && marketItems.length === 0;
  // The text box is local; the query (and the server request) follows it after a short pause.
  const [searchInput, setSearchInput] = useState(marketQuery.text);
  useEffect(() => {
    const next = searchInput.trim();
    if (next === marketQuery.text.trim()) return;
    const timer = setTimeout(() => setMarketQuery({ text: next }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, marketQuery.text, setMarketQuery]);

  // Create listing form state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newLocation, setNewLocation] = useState('Austin, TX');
  // Root-relative url of the uploaded listing picture (empty when none chosen).
  const [newImage, setNewImage] = useState('');

  const filtersActive = marketQuery.text.trim() !== '' || marketQuery.typeId !== null || marketQuery.brandId !== null;

  const clearFilters = () => {
    setSearchInput('');
    setMarketQuery({ text: '', typeId: null, brandId: null });
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

      {/* SEARCH, MODE AND FILTERS */}
      <Surface as="section" aria-label="Marketplace filters" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionHeader title="Browse" as="h2" />

        <TextField
          size="small"
          fullWidth
          placeholder="Search the marketplace…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          variant="outlined"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search aria-hidden="true" className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Search the marketplace' }
          }}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box role="radiogroup" aria-label="Search mode" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['smart', 'name'] as const).map((mode) => {
              const selected = marketQuery.mode === mode;
              return (
                <Button
                  key={mode}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMarketQuery({ mode })}
                  variant={selected ? 'contained' : 'outlined'}
                  sx={{ ...touchTargetSx, borderRadius: 'var(--ui-radius-full)', px: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {mode === 'smart' ? 'Smart search' : 'Name'}
                </Button>
              );
            })}
          </Box>
          {marketQuery.mode === 'smart' && (
            <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>Finds related products, not just matching words.</Typography>
          )}
        </Box>

        <TextField
          select
          size="small"
          label="Brand"
          value={marketQuery.brandId === null ? '' : String(marketQuery.brandId)}
          onChange={(e) => setMarketQuery({ brandId: e.target.value === '' ? null : Number(e.target.value) })}
          sx={{ maxWidth: { sm: 260 }, width: '100%' }}
        >
          <MenuItem value="">All brands</MenuItem>
          {marketBrands.map((brand) => (
            <MenuItem key={brand.id} value={String(brand.id)}>
              {brand.label}
            </MenuItem>
          ))}
        </TextField>

        {/* TYPE CHIPS (44 px touch targets on phones) */}
        <Box role="group" aria-label="Categories" sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', py: 0.5 }}>
          {[{ id: null as number | null, label: 'All' }, ...marketTypes].map((cat) => {
            const selected = marketQuery.typeId === cat.id;
            return (
              <Chip
                key={cat.label}
                label={cat.label}
                onClick={() => setMarketQuery({ typeId: cat.id })}
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

      {!gridPending && !marketError && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography role="status" aria-live="polite" sx={{ ...mutedSx, fontSize: 'var(--ui-fs-sm)' }}>
            {marketCountLabel}
          </Typography>
          {marketNote && <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>{marketNote}</Typography>}
        </Box>
      )}

      {marketError && <InlineError message={marketError} onRetry={retryMarketplace} />}

      {/* PRODUCTS */}
      {gridPending ? (
        <CardGridSkeleton count={6} />
      ) : marketItems.length === 0 ? (
        marketError ? null : !filtersActive ? (
          <EmptyState
            icon={ShoppingBag}
            title="No listings yet"
            body="Items people list for sale show up here. You can save a draft to try the form."
            action={{ label: 'List an item', onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No products match"
            body="Try another word, type or brand."
            action={{ label: 'Clear filters', onClick: clearFilters }}
          />
        )
      ) : (
        <Grid container spacing={2}>
          {marketItems.map((item) => (
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
                        {usd.format(item.price)}
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
                      <Tag aria-hidden="true" className="w-[14px] h-[14px] shrink-0" strokeWidth={1.75} />
                      {item.seller}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {!item.id.startsWith('draft-') && (
                        <Button
                          size="small"
                          aria-label={`View ${item.title}`}
                          onClick={() => openMarketItem(item.id)}
                          sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, color: T.primary }}
                        >
                          View
                        </Button>
                      )}
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
                </Box>
              </Surface>
            </Grid>
          ))}
        </Grid>
      )}

      {marketHasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <AsyncButton
            variant="outlined"
            onClick={loadMoreMarket}
            sx={{ ...touchTargetSx, borderRadius: 'var(--ui-radius-full)', px: 3, textTransform: 'none', fontWeight: 600 }}
          >
            Load more
          </AsyncButton>
        </Box>
      )}

      {/* PRODUCT DETAIL (catalog item, fetched by id) */}
      <ResponsiveDialog
        open={Boolean(marketSelectedId)}
        onClose={closeMarketItem}
        title={marketDetail?.name ?? 'Product'}
        actions={
          <Button onClick={closeMarketItem} sx={{ ...touchTargetSx, textTransform: 'none', color: T.muted }}>Close</Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          {marketDetailLoading && <Typography role="status" sx={mutedSx}>Loading product…</Typography>}
          {marketDetailError && <InlineError message={marketDetailError} />}
          {marketDetail && !marketDetailLoading && (
            <>
              <img
                src={marketDetail.imageUrl}
                alt={marketDetail.name}
                className="w-full max-w-full h-56 object-cover"
                style={{ borderRadius: 'var(--ui-radius-sm)' }}
                referrerPolicy="no-referrer"
              />
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--ui-fs-lg)', color: T.text }}>
                {usd.format(marketDetail.price)}
              </Typography>
              <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text }}>Brand: {marketDetail.brand}</Typography>
              <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text }}>Type: {marketDetail.type}</Typography>
              <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: marketDetail.availableStock > 0 ? T.success : T.warning, fontWeight: 600 }}>
                {marketDetail.availableStock > 0 ? 'In stock' : 'Out of stock'}
              </Typography>
              {marketDetail.description && (
                <Typography sx={{ ...mutedSx, whiteSpace: 'pre-wrap' }}>{marketDetail.description}</Typography>
              )}
              <Button
                disabled
                variant="outlined"
                sx={{ ...touchTargetSx, alignSelf: 'flex-start', borderRadius: 'var(--ui-radius-full)', px: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Checkout unavailable in this demo
              </Button>
            </>
          )}
        </Box>
      </ResponsiveDialog>

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
