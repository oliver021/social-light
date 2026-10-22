import { UserProfile } from './types';

export const INITIAL_USER: UserProfile = {
  id: 'current-user-1',
  username: 'me',
  name: 'You',
  handle: '@me',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
  bio: '',
  coverPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=250&q=80',
  followersCount: 0,
  followingCount: 0,
  interests: []
};
