import { useEffect } from 'react';
import { login as apiLogin, register as apiRegister } from '../api/auth';
import { profileApi, setAccessToken, getAccessToken, clearProfileCache } from '../api/gateway';
import { profileToUser } from '../api/mappers';
import { type SessionState, tokenSubject } from './session';
import { OWNER_KEY, readStored, writeStored } from './usePersistentState';

interface Loaders {
  loadFeed: () => Promise<void>;
  loadPeople: () => Promise<void>;
  loadGroups: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadStories: () => Promise<void>;
  loadReels: () => Promise<void>;
  loadEvents: () => Promise<void>;
  /** Marketplace CONTENT (eShop Catalog); payment is intentionally undone. */
  loadMarketplace: () => Promise<void>;
  /** Tear down the chat hub + peer maps (from useChat) on logout. */
  teardownChat: () => void;
  /**
   * Clear every cached per-user value (storage and in-memory state) and seed the
   * current-user view with `ownerId` (null on logout). Provided by the app composition.
   */
  resetUserData: (ownerId: string | null) => void;
}

/**
 * Session lifecycle (Phase 0): the real Identity flow plus the orchestration of the
 * per-domain loaders. It owns `loadCurrentUser` (which sets our id + profile) and
 * sequences the rest on login / register / cold boot. The domain loaders are injected
 * so the dependency is one-directional and explicit.
 *
 * Cached data belongs to one account. Before any of it is shown for a user, the cache
 * owner (`nexus_owner`) must match that user; otherwise the previous account's data is
 * cleared first.
 */
export function useAuth(session: SessionState, loaders: Loaders) {
  const { setCurrentUser, myUserId, setIsAuthenticated, setAuthReady } = session;
  const { loadFeed, loadPeople, loadGroups, loadNotifications, loadStories, loadReels, loadEvents, loadMarketplace, teardownChat, resetUserData } = loaders;

  // Make sure the cache belongs to `userId`: if it belongs to someone else, wipe it first.
  const claimOwner = (userId: string) => {
    if (readStored(OWNER_KEY) === userId) return;
    resetUserData(userId);
    writeStored(OWNER_KEY, userId);
  };

  // Pull the signed-in user's profile (auto-created on signup by the UserRegistered
  // event) and fold it into the view model, keeping UI-only fields. Sets myUserId
  // synchronously so engagement enrichment can match the current user's own reactions.
  const loadCurrentUser = async () => {
    const { data } = await profileApi.GET('/api/profiles/me');
    if (!data) return;
    claimOwner(data.userId);
    myUserId.current = data.userId;
    setCurrentUser((prev) => profileToUser(data, prev));
  };

  // Hydrate every domain after we hold a valid session: id+profile first (awaited,
  // since enrichment needs the id), then the feed, then the rest in the background.
  const hydrate = async () => {
    // Know whose session this is before any cached data is shown or loaded.
    const sub = tokenSubject(getAccessToken());
    if (sub) {
      claimOwner(sub);
      myUserId.current = sub;
    }
    await loadCurrentUser();
    await loadFeed();
    loadPeople().catch(() => {});
    loadGroups().catch(() => {});
    loadNotifications().catch(() => {});
    loadStories().catch(() => {});
    loadReels().catch(() => {});
    loadEvents().catch(() => {});
    loadMarketplace().catch(() => {});
  };

  const login = async (email: string, password: string) => {
    const token = await apiLogin(email, password);
    setAccessToken(token);
    setIsAuthenticated(true);
    await hydrate();
  };

  const register = async (email: string, password: string, displayName: string) => {
    await apiRegister(email, password, displayName);
    await login(email, password);
    // The profile is auto-created asynchronously by the UserRegistered event, which can
    // race these first reads. PUT it explicitly (idempotent upsert) so the name is set
    // deterministically, then refresh, so the feed/greeting show the real user at once.
    await profileApi.PUT('/api/profiles/me', {
      body: { displayName, bio: null, avatarUrl: null, location: null, handle: null },
    });
    await loadCurrentUser();
    await loadFeed();
  };

  const logout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
    clearProfileCache();
    teardownChat();
    resetUserData(null);
  };

  // On mount with a stored token, confirm the session is still valid (profile fetch)
  // and hydrate; a 401/failure clears the token and drops to the login screen.
  useEffect(() => {
    if (!getAccessToken()) return;
    (async () => {
      try {
        await hydrate();
        setIsAuthenticated(true);
      } catch {
        setAccessToken(null);
        setIsAuthenticated(false);
        resetUserData(null);
      } finally {
        setAuthReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { login, register, logout };
}
