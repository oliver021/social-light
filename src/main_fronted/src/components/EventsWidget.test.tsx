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
  attendees: [],
  myRsvp: null,
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

  it('"I\'m going" sets a going answer for the event id', async () => {
    const setRsvp = vi.fn();
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [summer], eventsLoading: false, setRsvp } });
    await user.click(screen.getByRole('button', { name: "I'm going to Summer picnic" }));
    expect(setRsvp).toHaveBeenCalledWith('ev-1', 'going');
  });

  it('an attending event shows Going with the same name pattern', () => {
    renderWithProviders(<EventsWidget />, { context: { events: [{ ...summer, attending: true }], eventsLoading: false } });
    const button = screen.getByRole('button', { name: 'Going to Summer picnic' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('a refused create keeps the dialog open and shows the reason', async () => {
    const createEvent = vi.fn(async () => {
      throw new Error('The event was not created: Venue is booked');
    });
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: false, createEvent } });
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    const dialog = screen.getByRole('dialog', { name: 'Create an event' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Event name' }), 'Summer picnic');
    await user.click(within(dialog).getByRole('button', { name: 'Create event' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The event was not created: Venue is booked');
    expect(screen.getByRole('dialog', { name: 'Create an event' })).toBeInTheDocument();
  });

  it('a capacity below one is refused before anything is sent', async () => {
    const createEvent = vi.fn(async () => {});
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: false, createEvent } });
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    const dialog = screen.getByRole('dialog', { name: 'Create an event' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Event name' }), 'Quiz');
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Capacity (optional)' }), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Create event' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Capacity must be a whole number of 1 or more.');
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('an end date before the start date is refused with an inline error', async () => {
    const createEvent = vi.fn(async () => {});
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [], eventsLoading: false, createEvent } });
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    const dialog = screen.getByRole('dialog', { name: 'Create an event' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Event name' }), 'Quiz');
    await user.type(within(dialog).getByLabelText('Start date (optional)'), '2026-12-10');
    await user.type(within(dialog).getByLabelText('End date (optional)'), '2026-12-01');
    await user.click(within(dialog).getByRole('button', { name: 'Create event' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The end date cannot be before the start date.');
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('a full event shows "Full" and cannot be joined', () => {
    const full = { ...summer, capacity: 1, attendeeCount: 1 };
    renderWithProviders(<EventsWidget />, { context: { events: [full], eventsLoading: false } });
    expect(screen.getByRole('button', { name: 'Summer picnic is full' })).toBeDisabled();
  });

  it('See all events lists every event, past ones only when the switch is on', async () => {
    const past = { ...summer, id: 'ev-old', title: 'Old quiz', startDate: '2020-01-01T10:00:00Z', endDate: '2020-01-01T12:00:00Z' };
    const { user } = renderWithProviders(<EventsWidget />, { context: { events: [summer, past], eventsLoading: false } });
    await user.click(screen.getByRole('button', { name: 'See all events' }));
    const dialog = screen.getByRole('dialog', { name: 'All events' });
    expect(within(dialog).getByText('Summer picnic')).toBeInTheDocument();
    expect(within(dialog).queryByText('Old quiz')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('switch', { name: 'Show past events' }));
    expect(within(dialog).getByText('Old quiz')).toBeInTheDocument();
  });
});
