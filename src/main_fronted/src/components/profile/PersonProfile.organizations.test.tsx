import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { mockApi } from '../../test/mockApi';
import { clearProfileCache } from '../../api/gateway';
import { PersonProfile } from './PersonProfile';
import type { Organization } from '../../context/useOrganizations';

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

const org = (id: string, name: string): Organization => ({
  id,
  ownerId: ANA,
  name,
  description: '',
  logo: undefined,
  verified: false,
  memberCount: 2,
  myMembershipId: null,
  myRole: null,
  isOwner: false,
});

beforeEach(() => {
  clearProfileCache();
  mockApi({ [`GET /api/profiles/${ANA}`]: anaProfile });
});

describe('PersonProfile organizations line', () => {
  it('lists the organizations the person belongs to, and each one opens its page', async () => {
    const openOrganization = vi.fn();
    const organizationsOf = vi.fn(() => [org('o-photo', 'Photo Walks'), org('o-film', 'Film Club')]);
    const { user } = renderWithProviders(<PersonProfile userId={ANA} />, {
      context: { organizationsOf, openOrganization },
    });

    const section = await screen.findByRole('region', { name: 'Organizations' });
    expect(organizationsOf).toHaveBeenCalledWith(ANA);
    expect(within(section).getByRole('button', { name: 'Open organization Photo Walks' })).toBeInTheDocument();
    await user.click(within(section).getByRole('button', { name: 'Open organization Film Club' }));
    expect(openOrganization).toHaveBeenCalledWith('o-film');
  });

  it('does not show an Organizations line when the person belongs to none', async () => {
    renderWithProviders(<PersonProfile userId={ANA} />, { context: { organizationsOf: () => [] } });
    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Ruiz' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Organizations' })).not.toBeInTheDocument();
  });
});
