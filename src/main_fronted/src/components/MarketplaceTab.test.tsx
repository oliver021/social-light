import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { MarketplaceTab } from './MarketplaceTab';
import type { MarketItem } from '../types';

const lamp: MarketItem = {
  id: 'cat-1',
  title: 'Desk lamp',
  description: 'Warm light, barely used',
  price: 25,
  category: 'Electronics',
  location: 'Austin, TX',
  imageUrl: 'https://example.test/lamp.png',
  seller: 'Ana',
  dateAdded: 'Today',
};

const sofa: MarketItem = {
  ...lamp,
  id: 'cat-2',
  title: 'Grey sofa',
  description: 'Three seats',
  price: 180,
  category: 'Furniture',
  imageUrl: '',
};

const draft: MarketItem = { ...lamp, id: 'draft-99', title: 'Old bike', description: 'Needs a chain', price: 40 };

describe('MarketplaceTab', () => {
  it('shows the page title as the only h1 and the list action', () => {
    renderWithProviders(<MarketplaceTab />, { context: { marketItems: [lamp] } });
    expect(screen.getByRole('heading', { level: 1, name: 'Marketplace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List an item' })).toBeInTheDocument();
  });

  it('shows the empty state with a way to list an item when there are no listings', async () => {
    const { user } = renderWithProviders(<MarketplaceTab />, { context: { marketItems: [] } });
    expect(screen.getByRole('heading', { name: 'No listings yet' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'List an item' })[0]);
    expect(screen.getByRole('dialog', { name: 'New listing' })).toBeInTheDocument();
  });

  it('renders each listing as a named article with a real alt text or a no-picture label', () => {
    renderWithProviders(<MarketplaceTab />, { context: { marketItems: [lamp, sofa] } });
    const lampCard = screen.getByRole('article', { name: 'Desk lamp' });
    expect(within(lampCard).getByRole('img', { name: 'Desk lamp' })).toHaveAttribute('alt', 'Desk lamp');
    expect(screen.getByRole('img', { name: 'Grey sofa: no picture' })).toBeInTheDocument();
  });

  it('marks local drafts and keeps the checkout control disabled and honestly named', () => {
    renderWithProviders(<MarketplaceTab />, { context: { marketItems: [draft] } });
    expect(screen.getByText('Draft, this device only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkout unavailable in this demo' })).toBeDisabled();
  });

  it('sends the chosen type to the query instead of filtering on the page', async () => {
    const setMarketQuery = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, {
      context: {
        marketItems: [lamp, sofa],
        marketTypes: [{ id: 1, label: 'Electronics' }, { id: 2, label: 'Furniture' }],
        setMarketQuery,
      },
    });
    await user.click(screen.getByRole('button', { name: 'Furniture' }));
    expect(setMarketQuery).toHaveBeenCalledWith({ typeId: 2 });
    // The page itself is not filtered client-side: both loaded products stay listed.
    expect(screen.getByRole('article', { name: 'Desk lamp' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Grey sofa' })).toBeInTheDocument();
  });

  it('shows the no-match state when a filter is active and Clear filters resets the query', async () => {
    const setMarketQuery = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, {
      context: {
        marketItems: [],
        marketQuery: { text: 'zzz', mode: 'smart', typeId: null, brandId: null },
        setMarketQuery,
      },
    });
    expect(screen.getByRole('heading', { name: 'No products match' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(setMarketQuery).toHaveBeenCalledWith({ text: '', typeId: null, brandId: null });
  });

  it('debounces the search text into the query after a pause', async () => {
    const setMarketQuery = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, { context: { marketItems: [lamp], setMarketQuery } });
    await user.type(screen.getByRole('textbox', { name: 'Search the marketplace' }), 'lamp');
    expect(setMarketQuery).not.toHaveBeenCalled();
    await waitFor(() => expect(setMarketQuery).toHaveBeenCalledWith({ text: 'lamp' }));
  });

  it('switches the search mode through a radio group and explains smart search', async () => {
    const setMarketQuery = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, { context: { marketItems: [lamp], setMarketQuery } });
    const group = screen.getByRole('radiogroup', { name: 'Search mode' });
    expect(within(group).getByRole('radio', { name: 'Smart search' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Finds related products, not just matching words.')).toBeInTheDocument();
    await user.click(within(group).getByRole('radio', { name: 'Name' }));
    expect(setMarketQuery).toHaveBeenCalledWith({ mode: 'name' });
  });

  it('shows the count label from the query and a Load more button only while more pages exist', async () => {
    const loadMoreMarket = vi.fn(async () => {});
    const { user } = renderWithProviders(<MarketplaceTab />, {
      context: { marketItems: [lamp], marketCountLabel: '101 products', marketHasMore: true, loadMoreMarket },
    });
    expect(screen.getByRole('status')).toHaveTextContent('101 products');
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMoreMarket).toHaveBeenCalledTimes(1);
  });

  it('hides Load more when every product is loaded', () => {
    renderWithProviders(<MarketplaceTab />, { context: { marketItems: [lamp], marketHasMore: false } });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('shows the server message on a failed load and retries through the context', async () => {
    const retryMarketplace = vi.fn(async () => {});
    const { user } = renderWithProviders(<MarketplaceTab />, {
      context: { marketItems: [], marketError: 'Could not load the marketplace: the server failed (HTTP 500).', retryMarketplace },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the marketplace: the server failed (HTTP 500).');
    expect(screen.queryByRole('heading', { name: 'No listings yet' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retryMarketplace).toHaveBeenCalledTimes(1);
  });

  it('opens the product detail for a catalog item and shows Out of stock for zero stock', async () => {
    const openMarketItem = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, {
      context: {
        marketItems: [lamp],
        openMarketItem,
        marketSelectedId: 'cat-1',
        marketDetail: { id: 'cat-1', name: 'Desk lamp', description: 'Warm light', price: 25, brand: 'Acme', type: 'Electronics', imageUrl: '/bff/api/catalog/items/cat-1/pic', availableStock: 0 },
      },
    });
    const dialog = screen.getByRole('dialog', { name: 'Desk lamp' });
    expect(within(dialog).getByText('Out of stock')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Checkout unavailable in this demo' })).toBeDisabled();
  });

  it('asks the hook to open the detail when a catalog card is viewed', async () => {
    const openMarketItem = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, { context: { marketItems: [lamp], openMarketItem } });
    await user.click(screen.getByRole('button', { name: 'View Desk lamp' }));
    expect(openMarketItem).toHaveBeenCalledWith('cat-1');
  });

  it('shows In stock when the product has stock', () => {
    renderWithProviders(<MarketplaceTab />, {
      context: {
        marketItems: [lamp],
        marketSelectedId: 'cat-1',
        marketDetail: { id: 'cat-1', name: 'Desk lamp', description: '', price: 25, brand: 'Acme', type: 'Electronics', imageUrl: '', availableStock: 4 },
      },
    });
    expect(screen.getByText('In stock')).toBeInTheDocument();
  });

  it('offers no product page for a local draft', () => {
    renderWithProviders(<MarketplaceTab />, { context: { marketItems: [draft] } });
    expect(screen.queryByRole('button', { name: 'View Old bike' })).not.toBeInTheDocument();
  });

  it('keeps Save draft disabled until a title and a price are entered', async () => {
    const { user } = renderWithProviders(<MarketplaceTab />, { context: { marketItems: [] } });
    await user.click(screen.getAllByRole('button', { name: 'List an item' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'New listing' });
    const save = within(dialog).getByRole('button', { name: 'Save draft' });
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Lamp');
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Price (USD)' }), '12');
    expect(save).toBeEnabled();
  });

  it('saves a draft through createMarketItem, notes it is local, and closes the dialog', async () => {
    const createMarketItem = vi.fn();
    const addNotification = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, {
      context: { marketItems: [], createMarketItem, addNotification },
    });
    await user.click(screen.getAllByRole('button', { name: 'List an item' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'New listing' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Lamp');
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Price (USD)' }), '12');
    await user.click(within(dialog).getByRole('button', { name: 'Save draft' }));

    expect(createMarketItem).toHaveBeenCalledWith('Lamp', '', 12, 'Electronics', 'Austin, TX', '');
    expect(addNotification).toHaveBeenCalledWith('mention', 'Marketplace', expect.stringContaining('not published yet'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New listing' })).not.toBeInTheDocument());
  });

  it('closes the new listing dialog on Cancel without saving', async () => {
    const createMarketItem = vi.fn();
    const { user } = renderWithProviders(<MarketplaceTab />, { context: { marketItems: [], createMarketItem } });
    await user.click(screen.getAllByRole('button', { name: 'List an item' })[0]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(createMarketItem).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New listing' })).not.toBeInTheDocument());
  });
});

describe('MarketplaceTab loading state', () => {
  it('shows placeholder cards while the first catalog load is pending', () => {
    renderWithProviders(<MarketplaceTab />, { context: { marketItems: [], marketplaceLoading: true } });
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('No listings yet')).not.toBeInTheDocument();
  });

  it('shows the empty state once the load has settled with no listings', () => {
    renderWithProviders(<MarketplaceTab />, { context: { marketItems: [], marketplaceLoading: false } });
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(screen.getByText('No listings yet')).toBeInTheDocument();
  });
});
