import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { SearchBox } from './SearchBox';
import type { MarketItem } from '../../types';

const lamp: MarketItem = {
  id: '11',
  title: 'Desk lamp',
  description: 'Warm',
  price: 25,
  category: 'Electronics',
  location: 'socialLight Store',
  imageUrl: '/bff/api/catalog/items/11/pic',
  seller: 'Acme',
  dateAdded: 'In stock',
};

describe('SearchBox market suggestions', () => {
  it('finds catalog products by name from the server, beyond the loaded page', async () => {
    const searchMarketItems = vi.fn(async () => [lamp]);
    const { user } = renderWithProviders(<SearchBox mobileOpen={false} onCloseMobile={() => {}} />, {
      context: { searchMarketItems },
    });
    await user.click(screen.getByRole('textbox', { name: 'Search people, posts and items' }));
    await user.type(screen.getByRole('textbox', { name: 'Search people, posts and items' }), 'des');
    await waitFor(() => expect(screen.getByText('Desk lamp')).toBeInTheDocument());
    expect(searchMarketItems).toHaveBeenCalledWith('des');
  });

  it('opens the product in the Marketplace tab when a suggestion is chosen', async () => {
    const openMarketItem = vi.fn();
    const setActiveTab = vi.fn();
    const { user } = renderWithProviders(<SearchBox mobileOpen={false} onCloseMobile={() => {}} />, {
      context: { searchMarketItems: vi.fn(async () => [lamp]), openMarketItem, setActiveTab },
    });
    const input = screen.getByRole('textbox', { name: 'Search people, posts and items' });
    await user.click(input);
    await user.type(input, 'des');
    await user.click(await screen.findByRole('button', { name: /Desk lamp/ }));
    expect(openMarketItem).toHaveBeenCalledWith('11');
    expect(setActiveTab).toHaveBeenCalledWith('marketplace');
  });

  it('reports a failed market search through the toast and shows no market rows', async () => {
    const showToast = vi.fn();
    const { user } = renderWithProviders(<SearchBox mobileOpen={false} onCloseMobile={() => {}} />, {
      context: {
        searchMarketItems: vi.fn(async () => {
          throw new Error('Could not search the marketplace: the server failed (HTTP 500).');
        }),
        showToast,
      },
    });
    const input = screen.getByRole('textbox', { name: 'Search people, posts and items' });
    await user.click(input);
    await user.type(input, 'des');
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Could not search the marketplace: the server failed (HTTP 500).', 'error'),
    );
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
  });
});
