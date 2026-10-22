import { type Dispatch, type SetStateAction } from 'react';
import { UserProfile } from '../types';
import { profileApi } from '../api/gateway';
import { profileToUser, userToUpdateRequest } from '../api/mappers';

interface Deps {
  currentUser: UserProfile;
  setCurrentUser: Dispatch<SetStateAction<UserProfile>>;
}

/**
 * Editing the signed-in user's own profile (Phase 2). Persists to the Profile API
 * (owner bound from the JWT, never the body), then reflects the saved DTO back.
 */
export function useProfile({ currentUser, setCurrentUser }: Deps) {
  const updateProfile = async (updated: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...updated }));
    const next = { ...currentUser, ...updated };
    const { data } = await profileApi.PUT('/api/profiles/me', { body: userToUpdateRequest(next) });
    if (data) setCurrentUser((prev) => profileToUser(data, prev));
  };

  return { updateProfile };
}
