import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocial } from './useSocial';
import { mockApi } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';

function setup() {
  return renderHook(() =>
    useSocial({
      myUserId: { current: ME },
      setCurrentUser: vi.fn(),
      loadFeed: vi.fn(async () => {}),
      notify: vi.fn(),
      showToast: vi.fn(),
    }),
  );
}

describe('useSocial people loading flag', () => {
  it('is true before the first load and false once the people list has loaded', async () => {
    mockApi({ 'GET /api/profiles': [], 'GET /api/follows': [] });
    const { result } = setup();
    expect(result.current.peopleLoading).toBe(true);
    await act(async () => {
      await result.current.loadPeople();
    });
    expect(result.current.peopleLoading).toBe(false);
    expect(result.current.people).toEqual([]);
  });

  it('stops loading when the server refuses the profiles, and shows no people', async () => {
    mockApi({
      'GET /api/profiles': { status: 500, body: { title: 'boom' } },
      'GET /api/follows': [],
    });
    const { result } = setup();
    await act(async () => {
      await result.current.loadPeople();
    });
    expect(result.current.peopleLoading).toBe(false);
    expect(result.current.people).toEqual([]);
  });
});
