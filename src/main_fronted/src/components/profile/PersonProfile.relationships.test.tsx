import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { mockApi } from '../../test/mockApi';
import { clearProfileCache } from '../../api/gateway';
import { PersonProfile } from './PersonProfile';

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

beforeEach(() => {
  clearProfileCache();
});

describe('PersonProfile: friendship and blocks', () => {
  it('shows the friendship control for the person (Add friend when not connected)', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { relationTo: vi.fn(() => 'none' as const) },
    });
    expect(await screen.findByRole('button', { name: 'Add Ana Ruiz as a friend' })).toBeInTheDocument();
  });

  it('shows Accept and Decline for an incoming request', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { relationTo: vi.fn(() => 'incoming' as const) },
    });
    expect(await screen.findByRole('button', { name: 'Accept friend request from Ana Ruiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline friend request from Ana Ruiz' })).toBeInTheDocument();
  });

  it('on my own profile there is no friend control and no block action', async () => {
    mockApi({ [`GET /api/profiles/${ME}`]: { ...anaProfile, userId: ME, displayName: 'Test User' } });
    renderWithProviders(<PersonProfile userId={ME} />);
    await screen.findByRole('heading', { level: 2, name: 'Test User' });
    expect(screen.queryByRole('button', { name: /as a friend/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions for Test User' })).not.toBeInTheDocument();
  });

  it('Block from the profile menu asks first, then blocks that person', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    const { user, ctx } = renderWithProviders(<PersonProfile userId={ANA} />);

    await user.click(await screen.findByRole('button', { name: 'More actions for Ana Ruiz' }));
    await user.click(screen.getByRole('menuitem', { name: 'Block Ana Ruiz' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent("They won't be told.");
    expect(dialog).not.toHaveTextContent("can't see you");

    await user.click(within(dialog).getByRole('button', { name: 'Block' }));
    expect(ctx.blockUser).toHaveBeenCalledWith(ANA);
  });

  it('a blocked person gets a minimal header with Unblock and no posts or follow button', async () => {
    mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
    const { user, ctx } = renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { isBlocked: vi.fn(() => true) },
    });

    expect(await screen.findByText('You blocked Ana Ruiz. Their posts, comments and messages are hidden from you.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Posts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow Ana Ruiz' })).not.toBeInTheDocument();
    expect(ctx.loadTimeline).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Unblock Ana Ruiz' }));
    expect(ctx.unblockUser).toHaveBeenCalledWith(ANA);
  });
});
