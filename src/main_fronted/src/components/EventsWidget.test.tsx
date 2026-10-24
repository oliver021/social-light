import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { EventsWidget } from './EventsWidget';

const summer = {
  id: 'ev-1',
  organizerId: 'me-0000-0000-0000-000000000001',
  organizerName: 'Test User',
  title: 'Summer picnic',
  description: '',
  location: 'Park',
  startDate: '2026-11-01T18:00:00.000Z',
  endDate: '2026-11-01T20:00:00.000Z',
  capacity: null,
  attendeeCount: 2,
  attending: false,
};

describe('EventsWidget', () => {
  it('shows a skeleton while events are loading', () => {
    renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: true } });
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No upcoming events' })).not.toBeInTheDocument();
  });

  it('shows the empty state with a create action once loading has settled', () => {
    renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: false } });
    expect(screen.getByRole('heading', { name: 'No upcoming events' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create an event' })).toBeInTheDocument();
  });

  it('Create event stays disabled until a name is typed', async () => {
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: false } });
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    const dialog = screen.getByRole('dialog', { name: 'Create an event' });
    expect(within(dialog).getByRole('button', { name: 'Create event' })).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Event name' }), 'Summer picnic');
    expect(within(dialog).getByRole('button', { name: 'Create event' })).toBeEnabled();
  });

  it('submitting calls createEvent with the typed name and place, then closes the dialog', async () => {
    const createEvent = vi.fn();
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: false, createEvent } });
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    const dialog = screen.getByRole('dialog', { name: 'Create an event' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Event name' }), 'Summer picnic');
    await user.type(within(dialog).getByRole('textbox', { name: 'Place (optional)' }), 'Park');
    await user.click(within(dialog).getByRole('button', { name: 'Create event' }));
    expect(createEvent).toHaveBeenCalledWith('Summer picnic', '', 'Park', expect.any(String), expect.any(String), null);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('Close leaves the dialog without creating anything', async () => {
    const createEvent = vi.fn();
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: false, createEvent } });
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('"I\'m going" calls rsvpEvent with the event id', async () => {
    const rsvpEvent = vi.fn();
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [summer], eventsLoading: false, rsvpEvent } });
    await user.click(screen.getByRole('button', { name: "I'm going to Summer picnic" }));
    expect(rsvpEvent).toHaveBeenCalledWith('ev-1');
  });

  it('an attending event shows Going with the same name pattern', () => {
    renderWithProviders(<EventsWidget />, { context: { events: [{ ...summer, attending: true }], eventsLoading: false } });
    const button = screen.getByRole('button', { name: 'Going to Summer picnic' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});
