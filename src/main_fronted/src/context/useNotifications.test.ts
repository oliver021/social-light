import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import { mockApi } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';

describe('useNotifications loading flag', () => {
  it('is true before the first load and false once it succeeds', async () => {
    mockApi({ 'GET /api/notifications': [] });
    const { result } = renderHook(() => useNotifications({ myUserId: { current: ME } }));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadNotifications();
    });
    expect(result.current.loading).toBe(false);
  });

  it('becomes false when the server answers 500, and the list stays empty', async () => {
    mockApi({ 'GET /api/notifications': { status: 500, body: { title: 'boom' } } });
    const { result } = renderHook(() => useNotifications({ myUserId: { current: ME } }));
    await act(async () => {
      await result.current.loadNotifications();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.notifications).toEqual([]);
  });
});
