import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUiPreferences } from './useUiPreferences';

const ME = 'me-0000-0000-0000-000000000001';
const OTHER = 'other-0000-0000-0000-000000000002';

describe('useUiPreferences profile navigation', () => {
  it('opening my own id shows my profile (null), on the Profile tab', () => {
    const { result } = renderHook(() => useUiPreferences());
    act(() => result.current.openProfile(ME, ME));
    expect(result.current.viewedProfileId).toBeNull();
    expect(result.current.activeTab).toBe('profile');
  });

  it('opening another person sets their id and switches to the Profile tab', () => {
    const { result } = renderHook(() => useUiPreferences());
    act(() => result.current.setActiveTab('groups'));
    act(() => result.current.openProfile(OTHER, ME));
    expect(result.current.viewedProfileId).toBe(OTHER);
    expect(result.current.activeTab).toBe('profile');
  });

  it('closing a profile returns to the tab it was opened from', () => {
    const { result } = renderHook(() => useUiPreferences());
    act(() => result.current.setActiveTab('marketplace'));
    act(() => result.current.openProfile(OTHER, ME));
    act(() => result.current.closeProfile());
    expect(result.current.viewedProfileId).toBeNull();
    expect(result.current.activeTab).toBe('marketplace');
  });

  it('opening a profile from another profile keeps the original return tab', () => {
    const { result } = renderHook(() => useUiPreferences());
    act(() => result.current.setActiveTab('reels'));
    act(() => result.current.openProfile(OTHER, ME));
    act(() => result.current.openProfile('third-0000-0000-0000-000000000003', ME));
    act(() => result.current.closeProfile());
    expect(result.current.activeTab).toBe('reels');
  });

  it('selecting the Profile tab from navigation shows my own profile', () => {
    const { result } = renderHook(() => useUiPreferences());
    act(() => result.current.openProfile(OTHER, ME));
    act(() => result.current.setActiveTab('profile'));
    expect(result.current.viewedProfileId).toBeNull();
  });

  it('resetProfileView forgets the viewed profile and the return tab', () => {
    const { result } = renderHook(() => useUiPreferences());
    act(() => result.current.setActiveTab('groups'));
    act(() => result.current.openProfile(OTHER, ME));
    act(() => result.current.resetProfileView());
    expect(result.current.viewedProfileId).toBeNull();
    expect(result.current.profileReturnTab).toBe('home');
  });

  it('does not persist the viewed profile', () => {
    const { result } = renderHook(() => useUiPreferences());
    act(() => result.current.openProfile(OTHER, ME));
    const stored = Object.keys(localStorage).map((k) => `${k}=${localStorage.getItem(k)}`).join('\n');
    expect(stored).not.toContain(OTHER);
  });
});
