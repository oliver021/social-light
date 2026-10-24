import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { makeAppContext } from '../test/render';
import { useMarketplace } from './useMarketplace';
import { mockApi } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';

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
