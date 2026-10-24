import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGroups } from './useGroups';
import { mockApi } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';

describe('useGroups loading flag', () => {
  it('is true before the first load and false once it succeeds', async () => {
    mockApi({ 'GET /api/groups': [], 'GET /api/group-members': [] });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn() }));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadGroups();
    });
    expect(result.current.loading).toBe(false);
  });

  it('becomes false when the server answers 500, and the list stays empty', async () => {
    mockApi({ 'GET /api/groups': { status: 500, body: { title: 'boom' } }, 'GET /api/group-members': [] });
    const { result } = renderHook(() => useGroups({ myUserId: { current: ME }, showToast: vi.fn() }));
    await act(async () => {
      await result.current.loadGroups();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.groups).toEqual([]);
  });
});
