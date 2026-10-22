import { UserProfile, MarketItem, NotificationItem } from '../types';
import { catalogApi, catalogPicUrl } from '../api/gateway';
import { catalogItemToMarketItem } from '../api/mappers';
import { usePersistentState } from './usePersistentState';

interface Deps {
  currentUser: UserProfile;
  addNotification: (type: NotificationItem['type'], actorName: string, text: string, postId?: string) => void;
}

/**
 * The marketplace, backed by the eShop Catalog (reused as the Marketplace module).
 *
 * SCOPE (memory: project-marketplace-scope): only CONTENT is wired/e2e-tested —
 * `loadMarketplace` pulls real products from `GET /api/catalog/items` through the BFF.
 * Payment/checkout is DELIBERATELY left undone for this project: the backend cart
 * writes (Basket) and order creation (Ordering) throw NotImplementedException, so
 * `buyMarketItem` stays a client-only mock and `createMarketItem` saves a local draft; neither calls the backend.
 */
export function useMarketplace({ currentUser, addNotification }: Deps) {
  const [marketItems, setMarketItems] = usePersistentState<MarketItem[]>('nexus_market_items', () => []);
  // Real catalog category names (chips), derived from /catalogtypes on load.
  const [marketCategories, setMarketCategories] = usePersistentState<string[]>('nexus_market_categories', () => []);

  // CONTENT (live): fetch the real catalog + its types, resolve each item's category
  // (the list response leaves catalogType null), and surface the type list as chips.
  const loadMarketplace = async () => {
    const [itemsRes, typesRes] = await Promise.all([
      catalogApi.GET('/api/catalog/items', { params: { query: { 'api-version': '1.0', PageSize: 50 } } }),
      catalogApi.GET('/api/catalog/catalogtypes', { params: { query: { 'api-version': '1.0' } } }),
    ]);

    const types = typesRes.data ?? [];
    const typeName = new Map<number, string>(types.map((t) => [Number(t.id), t.type]));
    setMarketCategories(types.map((t) => t.type).filter(Boolean));

    const items = itemsRes.data?.data;
    if (!items) return;
    const catalogItems = items.map((item) =>
      catalogItemToMarketItem(item, catalogPicUrl(item.id ?? ''), typeName.get(Number(item.catalogTypeId)) ?? 'General'),
    );
    // Keep the local drafts (not in the catalog) on top of the live catalog content.
    setMarketItems((prev) => [...prev.filter((i) => i.id.startsWith('draft-')), ...catalogItems]);
  };

  // PAYMENT — intentionally undone (see scope note). Client-only mock: removes the card
  // locally and fakes a confirmation; the Basket/Ordering checkout is NOT called (it
  // throws by design). Do not wire this to the backend without resuming the payment work.
  const buyMarketItem = (itemId: string) => {
    setMarketItems((prevItems) => prevItems.filter((i) => i.id !== itemId));
    addNotification('mention', 'Market Dispatcher', `successfully processed your reservation order for item #${itemId}. Meet client in localized workspace.`);
  };

  // Listing creation: NOT connected to the catalog. POST /api/catalog/items exists but is
  // an unauthenticated, global catalog write (no owner, no picture storage, needs brand/type
  // ids and an AI embedding call), so a listing saved here is a LOCAL DRAFT in this browser
  // only. `imageUrl` is the display url (or '' for no picture).
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
      dateAdded: 'Today'
    };
    setMarketItems((prev) => [newItem, ...prev]);
  };

  return { marketItems, marketCategories, loadMarketplace, buyMarketItem, createMarketItem };
}
