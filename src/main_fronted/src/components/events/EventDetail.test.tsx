import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { EventDetail, formatEventRange } from './EventDetail';
import type { EventItem } from '../../context/useEvents';

const base: EventItem = {
  id: 'ev-1',
  organizerId: 'ana',
  organizerName: 'Ana Ruiz',
  title: 'Summer picnic',
  description: 'Bring a blanket',
  location: 'Park',
  startDate: '2026-11-01T18:00:00.000Z',
  endDate: '2026-11-01T20:00:00.000Z',
  capacity: null,
  attendees: [],
  myRsvp: null,
  attendeeCount: 0,
  attending: false,
};

describe('EventDetail RSVP', () => {
  it('sets interested when I pick it', async () => {
    const setRsvp = vi.fn(async () => {});
    const { user } = renderWithProviders(<EventDetail event={base} onClose={vi.fn()} />, { context: { setRsvp } });
    const group = screen.getByRole('radiogroup', { name: 'Your answer' });
    await user.click(within(group).getByRole('radio', { name: 'Interested' }));
    expect(setRsvp).toHaveBeenCalledWith('ev-1', 'interested');
  });

  it('picking my current answer again clears it', async () => {
    const setRsvp = vi.fn(async () => {});
    const { user } = renderWithProviders(
      <EventDetail event={{ ...base, myRsvp: 'going', attending: true, attendeeCount: 1 }} onClose={vi.fn()} />,
      { context: { setRsvp } },
    );
    await user.click(screen.getByRole('radio', { name: 'Going' }));
    expect(setRsvp).toHaveBeenCalledWith('ev-1', null);
  });

  it('a full event disables Going with the label "Full", unless I am already going', () => {
    const full = { ...base, capacity: 1, attendeeCount: 1, attendees: [{ userId: 'ben', name: 'Ben', avatar: '', status: 'going' as const }] };
    const { unmount } = renderWithProviders(<EventDetail event={full} onClose={vi.fn()} />);
    const going = screen.getByRole('radio', { name: 'Going, the event is full' });
    expect(going).toBeDisabled();
    expect(going).toHaveTextContent('Full');
    expect(screen.getByRole('radio', { name: 'Interested' })).toBeEnabled();
    unmount();
    renderWithProviders(<EventDetail event={{ ...full, myRsvp: 'going', attending: true }} onClose={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Going' })).toBeEnabled();
  });

  it('lists who is going and who is interested, with the counts', () => {
    const ev = {
      ...base,
      attendees: [
        { userId: 'ben', name: 'Ben Park', avatar: '', status: 'going' as const },
        { userId: 'cy', name: 'Cy Lee', avatar: '', status: 'interested' as const },
      ],
      attendeeCount: 1,
    };
    renderWithProviders(<EventDetail event={ev} onClose={vi.fn()} />);
    expect(screen.getByText('1 going · 1 interested')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Going' })).getByText('Ben Park')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Interested' })).getByText('Cy Lee')).toBeInTheDocument();
  });

  it('Add to calendar builds an .ics file through an object URL', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:test');
    const revokeObjectURL = vi.fn();
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL, click: HTMLAnchorElement.prototype.click };
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    // jsdom cannot follow a download link; the download itself is what is under test.
    HTMLAnchorElement.prototype.click = vi.fn();
    try {
      const { user } = renderWithProviders(<EventDetail event={base} onClose={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'Add to calendar' }));
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('text/calendar;charset=utf-8');
    } finally {
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
      HTMLAnchorElement.prototype.click = original.click;
    }
  });
});

describe('formatEventRange', () => {
  it('shows both ends and the zone name', () => {
    const text = formatEventRange('2026-11-01T18:00:00.000Z', '2026-11-01T20:00:00.000Z', 'en-US');
    expect(text).toContain('–');
    expect(text).toMatch(/\w+ \d{1,2}, 2026/);
  });

  it('is empty for a date it cannot read', () => {
    expect(formatEventRange('not a date', '2026-11-01T20:00:00.000Z')).toBe('');
  });
});
