# M7 — Marketplace: the full catalog and semantic search

**Goal:** show the whole Catalog (today `PageSize: 50` hides half of the 101 items),
use its brand filter, item detail, name search and the pgvector **semantic search**
(`withsemanticrelevance/{text}`) that is the most interesting thing the store has.

All paths relative to `src/main_fronted/src/`. Main files: `context/useMarketplace.ts`,
`components/MarketplaceTab.tsx`.

**Scope guard (CLAUDE.md):** checkout and cart writes stay undone. Do not call
`/api/basket` or `/api/orders`, and do not change `buyMarketItem`'s honest copy.
Listing creation stays a local draft.

## Endpoints (all `GET`, all need `api-version: '1.0'` in `query`)

| Path | Query | Returns |
|---|---|---|
| `/api/catalog/items` | `PageSize`, `PageIndex` | `PaginatedItemsOfCatalogItem` (`pageIndex, pageSize, count, data`) |
| `/api/catalog/items/by/{name}` | `PageSize`, `PageIndex` | same, name starts-with |
| `/api/catalog/items/withsemanticrelevance/{text}` | `PageSize`, `PageIndex` | same, ordered by vector distance (falls back to name search when the AI is off) |
| `/api/catalog/items/type/{typeId}/brand/{brandId}` | `PageSize`, `PageIndex` | same |
| `/api/catalog/items/type/all/brand/{brandId}` | `PageSize`, `PageIndex` | same |
| `/api/catalog/items/{id}` | — | `CatalogItem` |
| `/api/catalog/catalogtypes`, `/api/catalog/catalogbrands` | — | lists |

There is no "type only" route. Call `type/{typeId}/brand/{brandId}` when both are
chosen and `type/all/brand/{brandId}` for brand only. For type only, use `items` and
filter by `catalogTypeId` across the pages loaded so far, and say so in the UI:
"Showing {n} of the loaded items", with a "Load more" button. Never filter silently.

## 1. Hook

- State: `query: { text: string; mode: 'smart' | 'name'; typeId: number | null; brandId: number | null }`,
  `page: number`, `pageSize: 24`, `total: number`, `items`, `loading`, `error`.
- `loadMarketplace()` loads types and brands once, then page 0 for the current query.
- `loadMore()` fetches `PageIndex: page + 1` of the **same** query and appends
  (deduplicate by id). `hasMore = items.length < total`.
- `setQuery(partial)` resets to page 0. Text search is debounced 350 ms in the
  component, not in the hook.
- Route selection exactly as the table above: text + smart → semantic, text + name →
  `by/{name}`, brand (± type) → brand routes, else `items`. Text and brand at once:
  text wins, brand filter applied client-side on the text results with the label
  "Filtered by brand on these results".
- `getItem(id)` for the detail view.
- Drafts (`draft-*` ids) stay on top only when no text/brand/type filter is active.
- Persist nothing new in localStorage except the last `mode`.

## 2. UI

- Search field at the top of the tab ("Search the marketplace…") with a segmented
  control "Smart search" / "Name" (`role="radiogroup"`). Under it, a one-line hint for
  Smart: "Finds related products, not just matching words."
- Filters: type chips (existing), brand `Select` ("All brands").
- Result count: "{total} products" (or "Showing {n} of the loaded items" for type-only).
- Grid with `CardGridSkeleton` on first load, "Load more" `AsyncButton` while `hasMore`;
  `EmptyState` "No products match" with "Clear filters".
- Item detail: clicking a card opens `ResponsiveDialog` with the picture
  (`catalogPicUrl`), name, brand, type, price, description and stock state
  (`availableStock > 0` → "In stock", else "Out of stock"); the disabled checkout button
  with the existing honest text.
- Prices with `Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })`.

## 3. Navbar search

The global search box's "items" group uses `name` search through the hook
(`by/{name}`, `PageSize: 5`) instead of filtering the loaded list, so items beyond the
first page are found. Selecting one opens the Marketplace tab with the detail dialog.

## 4. Tests

- Route selection for each combination (text smart/name, brand, brand+type, type only,
  none): assert the exact path and `PageIndex`/`PageSize` query.
- `loadMore` appends page 1 and dedupes; `hasMore` false when `items.length === count`.
- `setQuery` resets to page 0 and replaces the items.
- Type-only shows the "loaded items" label.
- Detail dialog fetches `GET /api/catalog/items/{id}` and shows "Out of stock" for stock 0.
- No call to `/api/basket` or `/api/orders` in any test run (assert on `calls`).

Live smoke (`e2e-web/marketplace.smoke.spec.ts`): load more until 101 products are
shown; smart search "running shoes" returns results; open one item.

## Acceptance

- [ ] All 101 seeded products are reachable.
- [ ] Smart search, name search and brand filtering use the server routes.
- [ ] Checkout scope unchanged.
- [ ] All tests pass; all gates green.
