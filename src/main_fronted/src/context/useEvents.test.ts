import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvents } from './useEvents';
import { mockApi } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';

describe('useEvents loading flag', () => {
  it('is true before the first load and false once the load succeeds', async () => {
    mockApi({ 'GET /api/events': [], 'GET /api/event-attendances': [] });
    const { result } = renderHook(() => useEvents({ myUserId: { current: ME } }));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadEvents();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toEqual([]);
  });

  it('stops loading when the server refuses the list, and keeps the list empty', async () => {
    mockApi({
      'GET /api/events': { status: 500, body: { title: 'boom' } },
      'GET /api/event-attendances': [],
    });
    const { result } = renderHook(() => useEvents({ myUserId: { current: ME } }));
    await act(async () => {
      await result.current.loadEvents();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toEqual([]);
  });
});
