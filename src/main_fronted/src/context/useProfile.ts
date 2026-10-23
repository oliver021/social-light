import { type Dispatch, type SetStateAction } from 'react';
import { UserProfile } from '../types';
import { profileApi, describeApiError } from '../api/gateway';
import { profileToUser, userToUpdateRequest } from '../api/mappers';

interface Deps {
  currentUser: UserProfile;
  setCurrentUser: Dispatch<SetStateAction<UserProfile>>;
}

/** Fields the Profile API stores. Anything else (interests) is local to this browser. */
const SERVER_FIELDS: (keyof UserProfile)[] = ['name', 'bio', 'username', 'handle', 'avatar'];

/**
 * Editing the signed-in user's own profile. Server fields are saved with a PUT; the
 * promise resolves only after a 2xx and rejects with a readable message otherwise, so the
 * caller can keep the dialog open and show the error. The local view is updated from the
 * saved DTO, never before the server has accepted it.
 */
export function useProfile({ currentUser, setCurrentUser }: Deps) {
  const updateProfile = async (updated: Partial<UserProfile>): Promise<void> => {
    const touchesServer = SERVER_FIELDS.some((k) => k in updated);
    if (!touchesServer) {
      setCurrentUser((prev) => ({ ...prev, ...updated }));
      return;
    }

    const body = userToUpdateRequest({ ...currentUser, ...updated });
    if (!body.displayName) throw new Error('Enter a display name.');

    const { data, error, response } = await profileApi.PUT('/api/profiles/me', { body });
    if (!response.ok) {
      throw new Error(describeApiError(error, response, 'Your profile was not saved'));
    }
    if (data) setCurrentUser((prev) => profileToUser(data, prev));
  };

  return { updateProfile };
}
