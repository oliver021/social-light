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

  it('filters by category and shows the no-match state with Clear filters', async () => {
    const { user } = renderWithProviders(<MarketplaceTab />, {
      context: { marketItems: [lamp, sofa], marketCategories: ['Electronics', 'Furniture'] },
    });
    await user.click(screen.getByRole('button', { name: 'Furniture' }));
    expect(screen.queryByRole('article', { name: 'Desk lamp' })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Grey sofa' })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search items' }), 'zzz');
    expect(screen.getByRole('heading', { name: 'No items match your search' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('article', { name: 'Grey sofa' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Desk lamp' })).toBeInTheDocument();
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
