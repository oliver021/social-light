import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { EventsWidget } from './EventsWidget';
import type { EventItem } from '../context/AppContext';

const ME = 'me-0000-0000-0000-000000000001';
const base = {
  description: '',
  location: '',
  startDate: '2026-11-01T18:00:00Z',
  endDate: '2026-11-01T20:00:00Z',
  capacity: null,
  attendeeCount: 0,
  attending: false,
};
const events: EventItem[] = [
  { ...base, id: 'e-1', organizerId: ME, organizerName: 'Test User', title: 'Board game night' },
  { ...base, id: 'e-2', organizerId: 'other-user', organizerName: 'Ana Ruiz', title: 'Hiking' },
];

describe('EventsWidget ownership', () => {
  it('lets only the organizer open the cancel menu', () => {
    renderWithProviders(<EventsWidget />, { context: { events } });
    expect(screen.getByRole('button', { name: 'More actions for Board game night' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions for Hiking' })).not.toBeInTheDocument();
  });

  it('Cancel event asks first, then calls deleteEvent with the event id', async () => {
    const deleteEvent = vi.fn(async () => {});
    const { user } = renderWithProviders(<EventsWidget />, { context: { events, deleteEvent } });
    await user.click(screen.getByRole('button', { name: 'More actions for Board game night' }));
    await user.click(screen.getByRole('menuitem', { name: 'Cancel event' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Cancel this event?' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel event' }));
    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('e-1'));
  });
});
