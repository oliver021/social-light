import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { Widgets } from './Widgets';

const ME = 'me-0000-0000-0000-000000000001';

const ana = { userId: 'u-ana', name: 'Ana Ruiz', handle: '@ana', avatar: '', bio: '', followed: false };
const bo = { userId: 'u-bo', name: 'Bo Lin', handle: '@bo', avatar: '', bio: '', followed: true, followId: 'f-1' };

describe('Widgets: people you may know', () => {
  it('shows a skeleton while the people list is loading', () => {
    renderWithProviders(<Widgets />, { context: { people: [], peopleLoading: true } });
    expect(screen.getByLabelText('Loading')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { name: 'No suggestions yet' })).not.toBeInTheDocument();
  });

  it('shows the empty state once loading has settled with no people', () => {
    renderWithProviders(<Widgets />, { context: { people: [], peopleLoading: false } });
    expect(screen.getByRole('heading', { name: 'No suggestions yet' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
  });

  it('names each follow button after the person and never suggests the signed-in user', () => {
    const me = { userId: ME, name: 'Test User', handle: '@testuser', avatar: '', bio: '', followed: false };
    renderWithProviders(<Widgets />, { context: { people: [ana, me], peopleLoading: false } });
    expect(screen.getByRole('button', { name: 'Follow Ana Ruiz' })).toBeInTheDocument();
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });

  it('Follow calls followUser with the person id', async () => {
    const followUser = vi.fn();
    const { user } = renderWithProviders(<Widgets />, { context: { people: [ana], peopleLoading: false, followUser } });
    await user.click(screen.getByRole('button', { name: 'Follow Ana Ruiz' }));
    expect(followUser).toHaveBeenCalledWith('u-ana');
  });

  it('a followed person shows Following and Unfollow calls unfollowUser', async () => {
    const unfollowUser = vi.fn();
    const { user } = renderWithProviders(<Widgets />, { context: { people: [bo], peopleLoading: false, unfollowUser } });
    const button = screen.getByRole('button', { name: 'Unfollow Bo Lin' });
    expect(button).toHaveTextContent('Following');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(unfollowUser).toHaveBeenCalledWith('u-bo');
  });

  it('clicking a name opens that person\'s profile', async () => {
    const openProfile = vi.fn();
    const { user } = renderWithProviders(<Widgets />, { context: { people: [ana], peopleLoading: false, openProfile } });
    await user.click(screen.getByRole('button', { name: 'Ana Ruiz' }));
    expect(openProfile).toHaveBeenCalledWith('u-ana');
  });

  it('shows at most five people until "See all" is pressed', async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ ...ana, userId: `u-${i}`, name: `Person ${i}` }));
    const { user } = renderWithProviders(<Widgets />, { context: { people: many, peopleLoading: false } });
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: 'See all (7)' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
  });
});
