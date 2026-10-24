import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReels } from './useReels';
import { mockApi } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';

describe('useReels loading flag', () => {
  it('is true before the first load and false once it succeeds', async () => {
    mockApi({ 'GET /api/reels': [] });
    const { result } = renderHook(() => useReels({ myUserId: { current: ME } }));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadReels();
    });
    expect(result.current.loading).toBe(false);
  });

  it('becomes false when the server answers 500, and the list stays empty', async () => {
    mockApi({ 'GET /api/reels': { status: 500, body: { title: 'boom' } } });
    const { result } = renderHook(() => useReels({ myUserId: { current: ME } }));
    await act(async () => {
      await result.current.loadReels();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.reels).toEqual([]);
  });
});
