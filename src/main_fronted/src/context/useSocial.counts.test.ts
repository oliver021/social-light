import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocial } from './useSocial';
import { mockApi } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';
const BEN = 'ben-0000-0000-0000-000000000003';

describe('useSocial counts and follow state', () => {
  it('countsFor counts followers and following from the follow list', async () => {
    mockApi({
      'GET /api/profiles': [],
      'GET /api/follows': [
        { id: 'f1', followerId: ME, followingId: ANA, status: 'active', createdAt: '' },
        { id: 'f2', followerId: BEN, followingId: ME, status: 'active', createdAt: '' },
        { id: 'f3', followerId: BEN, followingId: ANA, status: 'active', createdAt: '' },
      ],
    });
    const setCurrentUser = vi.fn();
    const { result } = renderHook(() =>
      useSocial({ myUserId: { current: ME }, setCurrentUser, loadFeed: vi.fn(async () => {}), notify: vi.fn(), showToast: vi.fn() }),
    );
    await act(async () => {
      await result.current.loadPeople();
    });

    expect(result.current.countsFor(ANA)).toEqual({ followers: 2, following: 0 });
    expect(result.current.countsFor(BEN)).toEqual({ followers: 0, following: 2 });
    expect(result.current.countsFor('nobody')).toEqual({ followers: 0, following: 0 });
  });

  it('isFollowing reflects my follow edges and resets on reset()', async () => {
    mockApi({
      'GET /api/profiles': [],
      'GET /api/follows': [{ id: 'f1', followerId: ME, followingId: ANA, status: 'active', createdAt: '' }],
    });
    const { result } = renderHook(() =>
      useSocial({ myUserId: { current: ME }, setCurrentUser: vi.fn(), loadFeed: vi.fn(async () => {}), notify: vi.fn(), showToast: vi.fn() }),
    );
    await act(async () => {
      await result.current.loadPeople();
    });
    expect(result.current.isFollowing(ANA)).toBe(true);
    expect(result.current.isFollowing(BEN)).toBe(false);

    act(() => result.current.reset());
    expect(result.current.isFollowing(ANA)).toBe(false);
    expect(result.current.countsFor(ANA)).toEqual({ followers: 0, following: 0 });
  });
});
