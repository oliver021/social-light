import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { mockApi } from '../../test/mockApi';
import { ProfileShares } from './ProfileShares';

const ME = 'me-0000-0000-0000-000000000001';

const postDto = (id: string, authorId: string, body: string) => ({
  id,
  authorId,
  contentType: 'text',
  visibility: 'public',
  status: 'published',
  body,
  location: null,
  scheduledAt: null,
  publishedAt: '2026-10-24T10:00:00Z',
  archivedAt: null,
});

describe('ProfileShares', () => {
  it('lists my shares with their message and the original post read-only, in server order', async () => {
    mockApi({
      'GET /api/shares': [
        { id: 's-1', sharerId: ME, targetType: 'Post', targetId: 'p-1', commentary: 'Look at this' },
        { id: 's-2', sharerId: 'someone-else', targetType: 'Post', targetId: 'p-2', commentary: 'Not mine' },
        { id: 's-3', sharerId: ME, targetType: 'Post', targetId: 'p-gone', commentary: null },
      ],
      'GET /api/posts/{id}': (call) => (call.path.endsWith('/p-1')
        ? postDto('p-1', 'author-9', 'The original text')
        : { status: 404 }),
      'GET /api/profiles/{userId}': { userId: 'author-9', displayName: 'Ana', handle: 'ana', avatarUrl: null, bio: null },
      'GET /api/post-medias': [],
    });
    renderWithProviders(<ProfileShares userId={ME} />);

    expect(await screen.findByText('Look at this')).toBeInTheDocument();
    expect(screen.getByText('The original text')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Post by Ana' })).toBeInTheDocument();
    expect(screen.queryByText('Not mine')).toBeNull();
    expect(screen.getByText('This post is no longer available')).toBeInTheDocument();
    // The read-only copy has no reaction bar or comment box.
    const card = screen.getByRole('article', { name: 'Post by Ana' });
    expect(within(card).queryByRole('button', { name: 'Comment' })).toBeNull();
    expect(within(card).queryByRole('button', { name: /More actions/ })).toBeNull();
  });

  it('shows the empty state when nothing is shared', async () => {
    mockApi({ 'GET /api/shares': [], 'GET /api/post-medias': [] });
    renderWithProviders(<ProfileShares userId={ME} />);
    expect(await screen.findByText('Nothing shared yet')).toBeInTheDocument();
  });

  it('shows the server message with a retry when the shares cannot be read', async () => {
    mockApi({ 'GET /api/shares': { status: 500, body: { title: 'boom' } } });
    const { user } = renderWithProviders(<ProfileShares userId={ME} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load shared posts');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
