import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { makeAppContext } from '../test/render';
import { useMarketplace } from './useMarketplace';
import { mockApi, type RecordedCall } from '../test/mockApi';

const TYPES = [
  { id: 1, type: 'Electronics' },
  { id: 2, type: 'Furniture' },
];
const BRANDS = [{ id: 3, brand: 'Acme' }];

const lampDto = { id: 11, name: 'Desk lamp', description: 'Warm', price: 25, catalogTypeId: 1, catalogBrandId: 3, availableStock: 4 };
const sofaDto = { id: 12, name: 'Grey sofa', description: 'Three seats', price: 180, catalogTypeId: 2, catalogBrandId: 3, availableStock: 0 };
const bikeDto = { id: 13, name: 'Bike', description: '', price: 90, catalogTypeId: 1, catalogBrandId: 3, availableStock: 1 };

const page = (pageIndex: number, count: number, data: unknown[]) => ({ pageIndex, pageSize: 24, count, data });

function setup() {
  const ctx = makeAppContext();
  return renderHook(() => useMarketplace({ currentUser: ctx.currentUser, addNotification: vi.fn() }));
}

/** The most recent request the hook sent (the path without /bff, and its query). */
function last(calls: RecordedCall[]): RecordedCall {
  const call = calls[calls.length - 1];
  if (!call) throw new Error('no request was sent');
  return call;
}

const EMPTY_ROUTES = {
  'GET /api/catalog/catalogtypes': TYPES,
  'GET /api/catalog/catalogbrands': BRANDS,
  'GET /api/catalog/items': page(0, 0, []),
  'GET /api/catalog/items/by/{name}': page(0, 0, []),
  'GET /api/catalog/items/withsemanticrelevance/{text}': page(0, 0, []),
  'GET /api/catalog/items/type/{typeId}/brand/{brandId}': page(0, 0, []),
  'GET /api/catalog/items/type/all/brand/{brandId}': page(0, 0, []),
  'GET /api/catalog/items/{id}': { ...lampDto },
};

describe('useMarketplace loading flag', () => {
  it('is true before the first load and false once it succeeds', async () => {
    mockApi({ 'GET /api/catalog/items': { data: [] }, 'GET /api/catalog/catalogtypes': [] });
    const { result } = renderHook(() => useMarketplace({ currentUser: makeAppContext().currentUser, addNotification: vi.fn() }));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadMarketplace();
    });
    expect(result.current.loading).toBe(false);
  });

  it('becomes false when the server answers 500, and the list stays empty', async () => {
    mockApi({ 'GET /api/catalog/items': { status: 500, body: { title: 'boom' } }, 'GET /api/catalog/catalogtypes': [] });
    const { result } = renderHook(() => useMarketplace({ currentUser: makeAppContext().currentUser, addNotification: vi.fn() }));
    await act(async () => {
      await result.current.loadMarketplace();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.marketItems).toEqual([]);
  });
});

describe('useMarketplace route selection', () => {
  const cases: Array<{ name: string; query: Parameters<ReturnType<typeof setup>['result']['current']['setMarketQuery']>[0]; path: string; expectNote?: string }> = [
    { name: 'no filter uses the items list', query: {}, path: '/api/catalog/items' },
    { name: 'smart text uses semantic relevance (encoded)', query: { text: 'running shoes', mode: 'smart' }, path: '/api/catalog/items/withsemanticrelevance/running%20shoes' },
    { name: 'name text uses starts-with name search', query: { text: 'lamp', mode: 'name' }, path: '/api/catalog/items/by/lamp' },
    { name: 'brand only uses type/all/brand', query: { brandId: 3 }, path: '/api/catalog/items/type/all/brand/3' },
    { name: 'brand and type use type/brand', query: { brandId: 3, typeId: 2 }, path: '/api/catalog/items/type/2/brand/3' },
    { name: 'type only uses the items list (no type route)', query: { typeId: 1 }, path: '/api/catalog/items' },
    { name: 'text and brand: text wins, brand applied on results', query: { text: 'lamp', mode: 'name', brandId: 3 }, path: '/api/catalog/items/by/lamp', expectNote: 'Filtered by brand on these results' },
  ];

  for (const c of cases) {
    it(`${c.name}: GET ${c.path} with PageIndex 0 and PageSize 24`, async () => {
      const { calls } = mockApi(EMPTY_ROUTES);
      const { result } = setup();
      await act(async () => {
        await result.current.loadMarketplace();
      });
      await act(async () => {
        result.current.setMarketQuery(c.query);
      });
      const call = last(calls);
      expect(call.method).toBe('GET');
      expect(call.path).toBe(c.path);
      expect(call.query.get('PageIndex')).toBe('0');
      expect(call.query.get('PageSize')).toBe('24');
      expect(call.query.get('api-version')).toBe('1.0');
      expect(result.current.marketNote).toBe(c.expectNote ?? null);
    });
  }

  it('never calls the basket or orders endpoints while browsing', async () => {
    const { calls } = mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items/{id}': { ...lampDto } });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    await act(async () => {
      result.current.setMarketQuery({ text: 'lamp', mode: 'name', brandId: 3, typeId: 1 });
    });
    await act(async () => {
      result.current.openMarketItem('11');
    });
    await act(async () => {
      result.current.closeMarketItem();
    });
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.some((c) => c.path.startsWith('/api/basket') || c.path.startsWith('/api/orders'))).toBe(false);
  });
});

describe('useMarketplace paging and queries', () => {
  it('loadMore appends the next page of the same query, de-duplicated, and hasMore follows the count', async () => {
    const { calls } = mockApi({
      ...EMPTY_ROUTES,
      'GET /api/catalog/items': ({ query }: RecordedCall) =>
        query.get('PageIndex') === '1' ? page(1, 3, [lampDto, sofaDto]) : page(0, 3, [lampDto, bikeDto]),
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    expect(result.current.marketItems.map((i) => i.title)).toEqual(['Desk lamp', 'Bike']);
    expect(result.current.marketHasMore).toBe(true);

    await act(async () => {
      await result.current.loadMoreMarket();
    });
    expect(last(calls).query.get('PageIndex')).toBe('1');
    expect(result.current.marketItems.map((i) => i.id)).toEqual(['11', '13', '12']);
    expect(result.current.marketHasMore).toBe(false);
  });

  it('setMarketQuery resets to page 0 and replaces the list', async () => {
    mockApi({
      ...EMPTY_ROUTES,
      'GET /api/catalog/items': page(0, 2, [lampDto, bikeDto]),
      'GET /api/catalog/items/by/{name}': page(0, 1, [sofaDto]),
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    expect(result.current.marketItems).toHaveLength(2);
    await act(async () => {
      result.current.setMarketQuery({ text: 'sofa', mode: 'name' });
    });
    expect(result.current.marketItems.map((i) => i.title)).toEqual(['Grey sofa']);
    expect(result.current.marketTotal).toBe(1);
    expect(result.current.marketHasMore).toBe(false);
  });

  it('type only filters the loaded items and says so in the count label', async () => {
    mockApi({
      ...EMPTY_ROUTES,
      'GET /api/catalog/items': page(0, 2, [lampDto, sofaDto]),
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    await act(async () => {
      result.current.setMarketQuery({ typeId: 2 });
    });
    expect(result.current.marketItems.map((i) => i.title)).toEqual(['Grey sofa']);
    expect(result.current.marketCountLabel).toBe('Showing 1 of the 2 loaded items');
  });

  it('brand on a text search filters the results on the client and labels it', async () => {
    mockApi({
      ...EMPTY_ROUTES,
      'GET /api/catalog/items/by/{name}': page(0, 2, [lampDto, { ...sofaDto, catalogBrandId: 9 }]),
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    await act(async () => {
      result.current.setMarketQuery({ text: 'a', mode: 'name', brandId: 3 });
    });
    expect(result.current.marketItems.map((i) => i.title)).toEqual(['Desk lamp']);
    expect(result.current.marketNote).toBe('Filtered by brand on these results');
  });

  it('keeps drafts on top only while no filter is active', async () => {
    mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items': page(0, 1, [lampDto]) });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    act(() => {
      result.current.createMarketItem('Old bike', 'Needs a chain', 40, 'General', 'Austin, TX', '');
    });
    expect(result.current.marketItems.map((i) => i.title)).toEqual(['Old bike', 'Desk lamp']);
    await act(async () => {
      result.current.setMarketQuery({ text: 'lamp', mode: 'name' });
    });
    expect(result.current.marketItems.map((i) => i.title)).not.toContain('Old bike');
  });

  it('remembers the last search mode in localStorage, and nothing else new', async () => {
    mockApi(EMPTY_ROUTES);
    const { result } = setup();
    await act(async () => {
      result.current.setMarketQuery({ mode: 'name' });
    });
    expect(localStorage.getItem('nexus_market_mode')).toBe('name');
    expect(result.current.marketQuery.mode).toBe('name');
  });
});

describe('useMarketplace failures keep honest state', () => {
  it('a failed loadMore keeps the loaded products and reports the server message', async () => {
    mockApi({
      ...EMPTY_ROUTES,
      'GET /api/catalog/items': ({ query }: RecordedCall) =>
        query.get('PageIndex') === '1' ? { status: 500, body: { detail: 'catalog is busy' } } : page(0, 2, [lampDto]),
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    await act(async () => {
      await result.current.loadMoreMarket();
    });
    expect(result.current.marketItems.map((i) => i.title)).toEqual(['Desk lamp']);
    expect(result.current.marketError).toContain('catalog is busy');
  });

  it('a failed page-0 query empties the list and reports the message', async () => {
    mockApi({
      ...EMPTY_ROUTES,
      'GET /api/catalog/items/by/{name}': { status: 500, body: { title: 'search down' } },
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    await act(async () => {
      result.current.setMarketQuery({ text: 'lamp', mode: 'name' });
    });
    expect(result.current.marketItems).toEqual([]);
    expect(result.current.marketError).toMatch(/search down/);
  });
});

describe('useMarketplace detail and navbar search', () => {
  it('getItem fetches GET /api/catalog/items/{id} and maps stock', async () => {
    const { calls } = mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items/{id}': { ...sofaDto } });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    let detail: unknown;
    await act(async () => {
      detail = await result.current.getItem('12');
    });
    expect(last(calls).path).toBe('/api/catalog/items/12');
    expect(last(calls).query.get('api-version')).toBe('1.0');
    expect(detail).toMatchObject({ id: '12', name: 'Grey sofa', price: 180, type: 'Furniture', brand: 'Acme', availableStock: 0 });
  });

  it('openMarketItem sets the selected detail and closeMarketItem clears it', async () => {
    mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items/{id}': { ...lampDto, availableStock: 4 } });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    await act(async () => {
      result.current.openMarketItem('11');
    });
    expect(result.current.marketSelectedId).toBe('11');
    expect(result.current.marketDetail).toMatchObject({ name: 'Desk lamp', availableStock: 4 });
    act(() => {
      result.current.closeMarketItem();
    });
    expect(result.current.marketSelectedId).toBeNull();
    expect(result.current.marketDetail).toBeNull();
  });

  it('a failed detail load shows the server message and no detail', async () => {
    mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items/{id}': { status: 404, body: { detail: 'Item 99 not found' } } });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    await act(async () => {
      result.current.openMarketItem('99');
    });
    expect(result.current.marketDetail).toBeNull();
    expect(result.current.marketDetailError).toContain('Item 99 not found');
  });

  it('a local draft opens no product page', async () => {
    const { calls } = mockApi(EMPTY_ROUTES);
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    act(() => {
      result.current.createMarketItem('Lamp', '', 5, 'General', 'Austin, TX', '');
    });
    const draftId = result.current.marketItems[0].id;
    act(() => {
      result.current.openMarketItem(draftId);
    });
    expect(result.current.marketDetailError).toMatch(/this device only/);
    expect(calls.some((c) => c.path.startsWith('/api/catalog/items/draft'))).toBe(false);
  });

  it('searchMarketItems calls by/{name} with PageSize 5 and maps the matches', async () => {
    const { calls } = mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items/by/{name}': page(0, 1, [lampDto]) });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    let found: Array<{ title: string }> = [];
    await act(async () => {
      found = await result.current.searchMarketItems('des');
    });
    expect(last(calls).path).toBe('/api/catalog/items/by/des');
    expect(last(calls).query.get('PageSize')).toBe('5');
    expect(found.map((i) => i.title)).toEqual(['Desk lamp']);
  });

  it('searchMarketItems rejects with the server message on failure', async () => {
    mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items/by/{name}': { status: 500, body: { title: 'search down' } } });
    const { result } = setup();
    await expect(result.current.searchMarketItems('des')).rejects.toThrow(/search down|Could not search/);
  });
});

describe('useMarketplace drafts and account reset', () => {
  it('reset forgets drafts, the loaded catalog and the detail', async () => {
    mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items': page(0, 1, [lampDto]) });
    const { result } = setup();
    await act(async () => {
      await result.current.loadMarketplace();
    });
    act(() => {
      result.current.createMarketItem('Lamp', '', 5, 'General', 'Austin, TX', '');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.marketItems).toEqual([]);
    expect(result.current.marketTotal).toBe(0);
    expect(localStorage.getItem('nexus_market_items')).toBe('[]');
  });
});

describe('useMarketplace checkout scope', () => {
  it('buyMarketItem removes the card locally, says no order was placed, and calls no backend', async () => {
    const { calls } = mockApi({ ...EMPTY_ROUTES, 'GET /api/catalog/items': page(0, 1, [lampDto]) });
    const addNotification = vi.fn();
    const { result } = renderHook(() => useMarketplace({ currentUser: makeAppContext().currentUser, addNotification }));
    await act(async () => {
      await result.current.loadMarketplace();
    });
    const callsBefore = calls.length;
    act(() => {
      result.current.buyMarketItem('11');
    });
    expect(result.current.marketItems).toEqual([]);
    expect(addNotification).toHaveBeenCalledWith('mention', 'Marketplace', expect.stringContaining('no order was placed'));
    expect(calls.length).toBe(callsBefore);
    expect(calls.some((c) => c.path.startsWith('/api/basket') || c.path.startsWith('/api/orders'))).toBe(false);
  });
});
