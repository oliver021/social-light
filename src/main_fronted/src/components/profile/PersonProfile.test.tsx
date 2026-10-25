import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { mockApi } from '../../test/mockApi';
import { clearProfileCache } from '../../api/gateway';
import { PersonProfile } from './PersonProfile';
import { ProfileTab } from '../ProfileTab';
import type { Post } from '../../types';

const ME = 'me-0000-0000-0000-000000000001';
const ANA = 'ana-0000-0000-0000-000000000002';

const anaProfile = {
  userId: ANA,
  displayName: 'Ana Ruiz',
  handle: 'ana',
  bio: 'Photographer',
  avatarUrl: null,
  location: null,
  createdAt: '2025-03-10T10:00:00Z',
  updatedAt: '2025-03-10T10:00:00Z',
};

const anaPost: Post = {
  id: 'p-ana',
  type: 'text',
  authorId: ANA,
  author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
  content: 'Sunset from the pier',
  createdAt: 'recently',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  sharesCount: 0,
};

beforeEach(() => {
  // Profiles are cached per session; each test starts from an empty cache.
  clearProfileCache();
});

describe('PersonProfile', () => {
  it('shows the name, handle, bio and the follower and following counts', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { countsFor: vi.fn(() => ({ followers: 4, following: 2 })) },
    });

    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Ruiz' })).toBeInTheDocument();
    expect(screen.getByText('@ana')).toBeInTheDocument();
    expect(screen.getByText('Photographer')).toBeInTheDocument();
    expect(screen.getByText('Followers').previousSibling).toHaveTextContent('4');
    expect(screen.getByText('Following').previousSibling).toHaveTextContent('2');
  });

  it('Follow calls followUser with that person id', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    const { user, ctx } = renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { isFollowing: vi.fn(() => false) },
    });

    await user.click(await screen.findByRole('button', { name: 'Follow Ana Ruiz' }));
    expect(ctx.followUser).toHaveBeenCalledWith(ANA);
    expect(ctx.unfollowUser).not.toHaveBeenCalled();
  });

  it('shows Following when I already follow them and Unfollow unfollows', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    const { user, ctx } = renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { isFollowing: vi.fn(() => true) },
    });

    await user.click(await screen.findByRole('button', { name: 'Unfollow Ana Ruiz' }));
    expect(ctx.unfollowUser).toHaveBeenCalledWith(ANA);
  });

  it('Message opens a chat with that person id', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    const { user, ctx } = renderWithProviders(<PersonProfile userId={ANA} />);

    await user.click(await screen.findByRole('button', { name: 'Message Ana Ruiz' }));
    expect(ctx.openChatWithUser).toHaveBeenCalledWith(expect.objectContaining({ id: ANA, name: 'Ana Ruiz', handle: '@ana' }));
  });

  it('Back calls closeProfile', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    const { user, ctx } = renderWithProviders(<PersonProfile userId={ANA} />);

    await user.click(await screen.findByRole('button', { name: 'Back' }));
    expect(ctx.closeProfile).toHaveBeenCalledTimes(1);
  });

  it('loads that person\'s timeline on open', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    const { ctx } = renderWithProviders(<PersonProfile userId={ANA} />);

    await waitFor(() => expect(ctx.loadTimeline).toHaveBeenCalledWith(ANA));
  });

  it('shows their posts from the timeline', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { timeline: { userId: ANA, posts: [anaPost], loading: false, error: null } },
    });

    // Wait for the loaded layout first: the loading layout is replaced once the profile arrives.
    await screen.findByRole('heading', { level: 2, name: 'Ana Ruiz' });
    const section = screen.getByRole('region', { name: 'Posts' });
    expect(within(section).getByText('Sunset from the pier')).toBeInTheDocument();
  });

  it('shows "not available" with a Back action when the profile does not exist', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: { status: 404, body: { title: 'not found' } } });
    const { user, ctx } = renderWithProviders(<PersonProfile userId={ANA} />);

    expect(await screen.findByRole('heading', { name: 'This profile is not available' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to the previous page' }));
    expect(ctx.closeProfile).toHaveBeenCalled();
  });

  it('shows the network error with a retry when the profile cannot be reached', async () => {
    // A route that throws makes fetch reject, like a dropped connection.
    mockApi({ [`GET /api/profiles/${ANA}`]: () => { throw new TypeError('Failed to fetch'); } });
    renderWithProviders(<PersonProfile userId={ANA} />);

    expect(await screen.findByText(/Could not load this profile: network error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('ProfileTab routing', () => {
  it('shows another person\'s profile when one is viewed', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    renderWithProviders(<ProfileTab />, {
      context: {
        viewedProfileId: ANA,
        currentUser: { id: ME, username: 'me', name: 'Test User', handle: '@me', avatar: '', bio: '', coverPhoto: '', followersCount: 0, followingCount: 0, interests: [] },
      },
    });

    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Ruiz' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Interests' })).not.toBeInTheDocument();
  });

  it('loads my own timeline on my profile', async () => {
    const { ctx } = renderWithProviders(<ProfileTab />, {
      context: { viewedProfileId: null },
    });
    await waitFor(() => expect(ctx.loadTimeline).toHaveBeenCalledWith('me-0000-0000-0000-000000000001'));
  });
});
