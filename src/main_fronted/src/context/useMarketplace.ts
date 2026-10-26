import { useCallback, useMemo, useRef, useState } from 'react';
import { UserProfile, MarketItem, NotificationItem } from '../types';
import { catalogApi, catalogPicUrl, describeApiError, messageOf } from '../api/gateway';
import { catalogItemToMarketItem } from '../api/mappers';
import { usePersistentState, readStored, writeStored } from './usePersistentState';
import type { components as CatalogComponents } from '@sdk/catalog';

type CatalogItemDto = CatalogComponents['schemas']['CatalogItem'];

interface Deps {
  currentUser: UserProfile;
  addNotification: (type: NotificationItem['type'], actorName: string, text: string, postId?: string) => void;
}

/** Products per page (the Catalog's PageSize). */
export const MARKET_PAGE_SIZE = 24;
const API_VERSION = '1.0';
const MODE_KEY = 'nexus_market_mode';

/** `smart` = pgvector semantic search, `name` = starts-with name search. */
export type MarketSearchMode = 'smart' | 'name';

export interface MarketQuery {
  text: string;
  mode: MarketSearchMode;
  typeId: number | null;
  brandId: number | null;
}

/** A catalog type or brand, as a chip or a select option. */
export interface CatalogOption {
  id: number;
  label: string;
}

/** The detail view of one catalog product (GET /api/catalog/items/{id}). */
export interface MarketDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  type: string;
  imageUrl: string;
  availableStock: number;
}

/** A loaded product keeps its raw type and brand ids for the client-side filters. */
type LoadedItem = MarketItem & { typeId: number | null; brandId: number | null };

const isDraft = (item: MarketItem) => item.id.startsWith('draft-');
const isCatalogId = (id: string) => /^\d+$/.test(id);

function sameQuery(a: MarketQuery, b: MarketQuery): boolean {
  return a.text === b.text && a.mode === b.mode && a.typeId === b.typeId && a.brandId === b.brandId;
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Route selection (the Catalog has no "type only" route):
 * text + smart -> withsemanticrelevance, text + name -> by/{name},
 * brand + type -> type/{t}/brand/{b}, brand only -> type/all/brand/{b},
 * otherwise -> items. Text wins over brand and type; those are then applied client-side.
 */
type Fetched =
  | { ok: true; count: number; items: CatalogItemDto[]; message?: undefined }
  | { ok: false; message: string; count?: undefined; items?: undefined };

async function fetchPage(q: MarketQuery, pageIndex: number): Promise<Fetched> {
  const text = q.text.trim();
  const common = { 'api-version': API_VERSION, PageSize: MARKET_PAGE_SIZE, PageIndex: pageIndex };
  const fallback = 'Could not load the marketplace';
  try {
    const res =
      text && q.mode === 'smart'
        ? await catalogApi.GET('/api/catalog/items/withsemanticrelevance/{text}', { params: { path: { text }, query: common } })
        : text
          ? await catalogApi.GET('/api/catalog/items/by/{name}', { params: { path: { name: text }, query: common } })
          : q.brandId !== null && q.typeId !== null
            ? await catalogApi.GET('/api/catalog/items/type/{typeId}/brand/{brandId}', {
                params: { path: { typeId: q.typeId, brandId: q.brandId }, query: common },
              })
            : q.brandId !== null
              ? await catalogApi.GET('/api/catalog/items/type/all/brand/{brandId}', {
                  params: { path: { brandId: q.brandId }, query: common },
                })
              : await catalogApi.GET('/api/catalog/items', { params: { query: common } });

    if (res.error !== undefined || !res.data) {
      return { ok: false, message: describeApiError(res.error, res.response, fallback) };
    }
    return { ok: true, count: Number(res.data.count ?? 0), items: res.data.data ?? [] };
  } catch (err) {
    return { ok: false, message: messageOf(err, fallback) };
  }
}

/** Whether the route applies the type / brand filter on the loaded items instead of the server. */
function clientFilters(q: MarketQuery) {
  const textRoute = q.text.trim() !== '';
  const brandRouteServer = !textRoute && q.brandId !== null;
  return {
    clientType: q.typeId !== null && !brandRouteServer,
    clientBrand: textRoute && q.brandId !== null,
  };
}

/**
 * The marketplace, backed by the eShop Catalog (reused as the Marketplace module).
 *
 * SCOPE (memory: project-marketplace-scope): only CONTENT is wired/e2e-tested — browsing,
 * search, brand filter and product detail call `/api/catalog/*` through the BFF. Payment and
 * checkout are DELIBERATELY left undone: `buyMarketItem` stays a client-only mock and
 * `createMarketItem` saves a local draft. Neither calls /api/basket or /api/orders.
 */
export function useMarketplace({ currentUser, addNotification }: Deps) {
  // Local drafts only (listings are not published). Catalog items are never persisted.
  const [storedDrafts, setDrafts] = usePersistentState<MarketItem[]>('nexus_market_items', () => []);
  const drafts = useMemo(() => storedDrafts.filter(isDraft), [storedDrafts]);

  const [types, setTypes] = useState<CatalogOption[]>([]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const optionsRef = useRef<{ types: CatalogOption[]; brands: CatalogOption[]; loaded: boolean }>({ types: [], brands: [], loaded: false });

  const [query, setQueryState] = useState<MarketQuery>(() => ({
    text: '',
    mode: readStored(MODE_KEY) === 'name' ? 'name' : 'smart',
    typeId: null,
    brandId: null,
  }));
  const queryRef = useRef(query);

  const [loaded, setLoaded] = useState<LoadedItem[]>([]);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Every page-0 request gets a number; a response for an older query is ignored.
  const requestRef = useRef(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MarketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequestRef = useRef(0);

  const typeLabel = (typeId: number | null) => optionsRef.current.types.find((t) => t.id === typeId)?.label ?? 'General';
  const brandLabel = (brandId: number | null) => optionsRef.current.brands.find((b) => b.id === brandId)?.label;

  // Types and brands are read once; a failure leaves them unloaded so the next load retries.
  const loadOptions = async () => {
    if (optionsRef.current.loaded) return;
    try {
      const [typesRes, brandsRes] = await Promise.all([
        catalogApi.GET('/api/catalog/catalogtypes', { params: { query: { 'api-version': API_VERSION } } }),
        catalogApi.GET('/api/catalog/catalogbrands', { params: { query: { 'api-version': API_VERSION } } }),
      ]);
      if (typesRes.error !== undefined || brandsRes.error !== undefined || !typesRes.data || !brandsRes.data) return;
      const nextTypes = typesRes.data.map((t) => ({ id: Number(t.id), label: t.type })).filter((t) => t.label);
      const nextBrands = brandsRes.data.map((b) => ({ id: Number(b.id), label: b.brand })).filter((b) => b.label);
      optionsRef.current = { types: nextTypes, brands: nextBrands, loaded: true };
      setTypes(nextTypes);
      setBrands(nextBrands);
    } catch {
      /* names fall back to the defaults; the next load retries */
    }
  };

  // Page 0 of a query replaces the list. Only the newest request may write.
  const runFirstPage = useCallback(async (q: MarketQuery) => {
    const seq = ++requestRef.current;
    setLoading(true);
    const res = await fetchPage(q, 0);
    if (seq !== requestRef.current) return;
    pageRef.current = 0;
    if (res.ok) {
      setLoaded(res.items.map((dto) => toLoadedWith(dto, optionsRef.current)));
      setTotal(res.count);
      setError(null);
    } else {
      setLoaded([]);
      setTotal(0);
      setError(res.message);
    }
    setLoading(false);
  }, []);

  // First load: names once, then page 0 of the current query.
  const loadMarketplace = useCallback(async () => {
    try {
      await loadOptions();
      await runFirstPage(queryRef.current);
    } finally {
      setLoading(false);
    }
  }, [runFirstPage]);

  // Change the query: reset to page 0 and replace the list.
  const setMarketQuery = useCallback(
    (partial: Partial<MarketQuery>) => {
      const next: MarketQuery = { ...queryRef.current, ...partial };
      if (sameQuery(next, queryRef.current)) return;
      if (next.mode !== queryRef.current.mode) writeStored(MODE_KEY, next.mode);
      queryRef.current = next;
      setQueryState(next);
      void runFirstPage(next);
    },
    [runFirstPage],
  );

  // Next page of the same query, appended and de-duplicated by id.
  const loadMoreMarket = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const seq = requestRef.current;
    const q = queryRef.current;
    const next = pageRef.current + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const res = await fetchPage(q, next);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (seq !== requestRef.current) return;
    if (!res.ok) {
      setError(res.message);
      return;
    }
    pageRef.current = next;
    setTotal(res.count);
    setError(null);
    setLoaded((prev) => {
      const seen = new Set(prev.map((i) => i.id));
      return [...prev, ...res.items.map((dto) => toLoadedWith(dto, optionsRef.current)).filter((i) => !seen.has(i.id))];
    });
  }, []);

  // Name suggestions for the navbar search: the first 5 products whose name starts with the text.
  const searchMarketItems = useCallback(async (text: string): Promise<MarketItem[]> => {
    const name = text.trim();
    if (!name) return [];
    const res = await catalogApi.GET('/api/catalog/items/by/{name}', {
      params: { path: { name }, query: { 'api-version': API_VERSION, PageSize: 5, PageIndex: 0 } },
    });
    if (res.error !== undefined || !res.data) {
      throw new Error(describeApiError(res.error, res.response, 'Could not search the marketplace'));
    }
    return (res.data.data ?? []).map((dto) => toLoadedWith(dto, optionsRef.current));
  }, []);

  // Detail of one product. Rejects with a readable message; never returns a guessed record.
  const getItem = useCallback(async (id: string): Promise<MarketDetail> => {
    const res = await catalogApi.GET('/api/catalog/items/{id}', {
      params: { path: { id: Number(id) }, query: { 'api-version': API_VERSION } },
    });
    if (res.error !== undefined || !res.data) {
      throw new Error(describeApiError(res.error, res.response, 'Could not load this product'));
    }
    const dto = res.data;
    const typeId = toNumberOrNull(dto.catalogTypeId);
    const brandId = toNumberOrNull(dto.catalogBrandId);
    return {
      id: String(dto.id ?? id),
      name: dto.name,
      description: dto.description ?? '',
      price: Number(dto.price ?? 0),
      brand: dto.catalogBrand?.brand ?? brandLabel(brandId) ?? 'socialLight Store',
      type: dto.catalogType?.type ?? typeLabel(typeId),
      imageUrl: catalogPicUrl(dto.id ?? id),
      availableStock: Number(dto.availableStock ?? 0),
    };
  }, []);

  const loadDetail = async (id: string) => {
    const seq = ++detailRequestRef.current;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const d = await getItem(id);
      if (seq === detailRequestRef.current) setDetail(d);
    } catch (err) {
      if (seq === detailRequestRef.current) setDetailError(messageOf(err, 'Could not load this product'));
    } finally {
      if (seq === detailRequestRef.current) setDetailLoading(false);
    }
  };

  // Opens the detail dialog for a catalog product. Drafts exist only on this device.
  const openMarketItem = (id: string) => {
    setSelectedId(id);
    if (!isCatalogId(id)) {
      detailRequestRef.current++;
      setDetail(null);
      setDetailLoading(false);
      setDetailError('This listing is saved on this device only, so it has no product page.');
      return;
    }
    void loadDetail(id);
  };

  const closeMarketItem = () => {
    detailRequestRef.current++;
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  // PAYMENT — intentionally undone (see scope note). Client-only mock: removes the card
  // locally and fakes a confirmation; the Basket/Ordering checkout is NOT called (it
  // throws by design). Do not wire this to the backend without resuming the payment work.
  const buyMarketItem = (itemId: string) => {
    setDrafts((prev) => prev.filter((i) => i.id !== itemId));
    setLoaded((prev) => prev.filter((i) => i.id !== itemId));
    // Honest copy: nothing was ordered, the item is only removed from this list.
    addNotification('mention', 'Marketplace', `Removed item #${itemId} from your list. Checkout is not available yet, so no order was placed.`);
  };

  // Listing creation: NOT connected to the catalog. POST /api/catalog/items exists but is
  // an unauthenticated, global catalog write, so a listing saved here is a LOCAL DRAFT in
  // this browser only. `imageUrl` is the display url (or '' for no picture).
  const createMarketItem = (title: string, description: string, price: number, category: string, location: string, imageUrl: string) => {
    const newItem: MarketItem = {
      id: `draft-${Date.now()}`,
      title,
      description,
      price,
      category,
      location,
      imageUrl,
      seller: currentUser.name,
      dateAdded: 'Today',
    };
    setDrafts((prev) => [newItem, ...prev.filter(isDraft)]);
  };

  // Forget the previous account's catalog view, drafts and detail (called on account change).
  const reset = () => {
    setDrafts([]);
    requestRef.current++;
    detailRequestRef.current++;
    optionsRef.current = { types: [], brands: [], loaded: false };
    setTypes([]);
    setBrands([]);
    setLoaded([]);
    setTotal(0);
    pageRef.current = 0;
    setError(null);
    setLoading(true);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    queryRef.current = { ...queryRef.current, text: '', typeId: null, brandId: null };
    setQueryState(queryRef.current);
  };

  // Visible list: client-side type / brand filters where the route cannot apply them.
  const filtersActive = query.text.trim() !== '' || query.typeId !== null || query.brandId !== null;
  const { clientType, clientBrand } = clientFilters(query);
  const visibleLoaded = useMemo(
    () =>
      loaded.filter(
        (i) => (!clientType || i.typeId === query.typeId) && (!clientBrand || i.brandId === query.brandId),
      ),
    [loaded, clientType, clientBrand, query.typeId, query.brandId],
  );
  const clientFiltered = clientType || clientBrand;
  const marketItems: MarketItem[] = filtersActive ? visibleLoaded : [...drafts, ...visibleLoaded];
  const marketCountLabel = clientFiltered
    ? `Showing ${visibleLoaded.length} of the ${loaded.length} loaded items`
    : `${total} products`;
  const marketNote = clientBrand ? 'Filtered by brand on these results' : null;
  const marketHasMore = loaded.length < total;

  const marketTypes = types;
  const marketBrands = brands;
  const marketCategories = useMemo(() => types.map((t) => t.label), [types]);

  return {
    marketItems,
    marketCategories,
    marketTypes,
    marketBrands,
    marketQuery: query,
    setMarketQuery,
    marketTotal: total,
    marketCountLabel,
    marketNote,
    marketHasMore,
    marketLoadingMore: loadingMore,
    loadMoreMarket,
    marketError: error,
    loading,
    loadMarketplace,
    retryMarketplace: loadMarketplace,
    searchMarketItems,
    marketSelectedId: selectedId,
    openMarketItem,
    closeMarketItem,
    marketDetail: detail,
    marketDetailLoading: detailLoading,
    marketDetailError: detailError,
    getItem,
    buyMarketItem,
    createMarketItem,
    reset,
  };
}

/** Maps a catalog product with the option lists passed in (the hook's refs, read at call time). */
function toLoadedWith(dto: CatalogItemDto, options: { types: CatalogOption[]; brands: CatalogOption[] }): LoadedItem {
  const typeId = toNumberOrNull(dto.catalogTypeId);
  const brandId = toNumberOrNull(dto.catalogBrandId);
  const typeName = options.types.find((t) => t.id === typeId)?.label ?? 'General';
  const brandName = options.brands.find((b) => b.id === brandId)?.label;
  const base = catalogItemToMarketItem(dto, catalogPicUrl(dto.id ?? ''), dto.catalogType?.type ?? typeName);
  return { ...base, seller: brandName ?? base.seller, typeId, brandId };
}
