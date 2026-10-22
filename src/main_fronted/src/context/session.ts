import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { UserProfile } from '../types';
import { INITIAL_USER } from '../data';
import { getAccessToken } from '../api/gateway';
import { usePersistentState } from './usePersistentState';

/**
 * The small set of session primitives that are genuinely shared across domains:
 * the signed-in user, our own id, and the auth gate flags. They live here (state
 * only, no actions) so every domain hook can receive exactly the pieces it needs
 * without depending on the auth-action logic that drives them.
 */
export interface SessionState {
  currentUser: UserProfile;
  setCurrentUser: Dispatch<SetStateAction<UserProfile>>;
  /**
   * The signed-in user's id (= JWT `sub`). A ref (not state) because async data
   * enrichment reads it the moment a load resolves, without waiting for a render.
   */
  myUserId: MutableRefObject<string>;
  isAuthenticated: boolean;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  /** Gates the UI until the initial "is the stored token still valid?" probe resolves. */
  authReady: boolean;
  setAuthReady: Dispatch<SetStateAction<boolean>>;
}

export function useSessionState(): SessionState {
  // Authenticated iff we hold an access token (sessionStorage-backed in the api layer).
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAccessToken());
  const [authReady, setAuthReady] = useState<boolean>(() => !getAccessToken());
  const [currentUser, setCurrentUser] = usePersistentState<UserProfile>('nexus_user', () => INITIAL_USER);
  const myUserId = useRef<string>('');

  useEffect(() => {
    localStorage.setItem('nexus_authenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  return { currentUser, setCurrentUser, myUserId, isAuthenticated, setIsAuthenticated, authReady, setAuthReady };
}
