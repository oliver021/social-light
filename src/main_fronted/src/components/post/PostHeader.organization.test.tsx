import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostHeader } from './PostHeader';
import { makePost } from './fixtures';

const post = makePost({
  id: 'p-org',
  authorId: 'ana',
  organizationId: 'o-1',
  organizationName: 'Makers',
});

describe('PostHeader organization link (M11)', () => {
  it('shows the organization after the author and opens that organization', async () => {
    const openOrganization = vi.fn();
    const { user } = renderWithProviders(<PostHeader post={post} />, { context: { openOrganization } });
    await user.click(screen.getByRole('button', { name: 'Open organization Makers' }));
    expect(openOrganization).toHaveBeenCalledWith('o-1');
    expect(screen.getByText('› Makers')).toBeInTheDocument();
  });

  it('a post outside any organization shows no organization link', () => {
    renderWithProviders(<PostHeader post={makePost({ id: 'p-plain' })} />);
    expect(screen.queryByRole('button', { name: /Open organization/ })).not.toBeInTheDocument();
  });

  it('a community post does not show an organization link', () => {
    renderWithProviders(<PostHeader post={makePost({ groupId: 'g-1', groupName: 'Design Systems' })} />);
    expect(screen.queryByRole('button', { name: /Open organization/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open community Design Systems' })).toBeInTheDocument();
  });
});
