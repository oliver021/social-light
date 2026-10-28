import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvents, isEventFull, type EventItem } from './useEvents';
import { mockApi, type RecordedCall } from '../test/mockApi';

const ME = 'me-0000-0000-0000-000000000001';
const HOUR = 3600_000;
const soon = (h: number) => new Date(Date.now() + h * HOUR).toISOString();

const eventDto = (id: string, capacity: number | null = null) => ({
  id,
  organizerId: 'ana',
  title: 'Picnic',
  description: null,
  location: 'Park',
  startDate: soon(48),
  endDate: soon(50),
  capacity,
  visibility: 'public',
});

const isCall = (c: RecordedCall, method: string, path: string) => c.method === method && c.path === path;

function setup(routes: Record<string, unknown> = {}) {
  const showToast = vi.fn();
  const { calls } = mockApi({
    'GET /api/events': [eventDto('ev-1')],
    'GET /api/event-attendances': [{ id: 'a-1', eventId: 'ev-1', userId: ME, status: 'going' }],
    'GET /api/profiles/{userId}': { status: 404 },
    ...routes,
  });
  const hook = renderHook(() => useEvents({ myUserId: { current: ME }, showToast }));
  return { ...hook, calls, showToast };
}

describe('useEvents loading flag', () => {
  it('is true before the first load and false once the load succeeds', async () => {
    mockApi({ 'GET /api/events': [], 'GET /api/event-attendances': [] });
    const { result } = renderHook(() => useEvents({ myUserId: { current: ME }, showToast: vi.fn() }));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await result.current.loadEvents();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toEqual([]);
  });

  it('stops loading when the server refuses the list, and keeps the list empty', async () => {
    mockApi({
      'GET /api/events': { status: 500, body: { title: 'boom' } },
      'GET /api/event-attendances': [],
    });
    const { result } = renderHook(() => useEvents({ myUserId: { current: ME }, showToast: vi.fn() }));
    await act(async () => {
      await result.current.loadEvents();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.events).toEqual([]);
  });
});

describe('useEvents.loadEvents answers', () => {
  it('reads my answer, the attendees and the going count', async () => {
    const { result } = setup({
      'GET /api/event-attendances': [
        { id: 'a-1', eventId: 'ev-1', userId: ME, status: 'going' },
        { id: 'a-2', eventId: 'ev-1', userId: 'ben', status: 'interested' },
        { id: 'a-3', eventId: 'ev-1', userId: 'cy', status: 'going' },
      ],
    });
    await act(async () => {
      await result.current.loadEvents();
    });
    const ev = result.current.events[0];
    expect(ev.myRsvp).toBe('going');
    expect(ev.attending).toBe(true);
    expect(ev.attendeeCount).toBe(2);
    expect(ev.attendees.map((a) => a.status)).toEqual(['going', 'interested', 'going']);
  });
});

describe('useEvents.setRsvp', () => {
  it('going to interested deletes my row first, then creates the interested row', async () => {
    // The server keeps one answer per person: the mock reflects each write, so the reload agrees.
    let answer: string | null = 'going';
    const { result, calls } = setup({
      'GET /api/event-attendances': () => (answer ? [{ id: answer === 'going' ? 'a-1' : 'a-9', eventId: 'ev-1', userId: ME, status: answer }] : []),
      'DELETE /api/event-attendances/{id}': () => {
        answer = null;
        return { status: 204 };
      },
      'POST /api/event-attendances': (call: RecordedCall) => {
        answer = (call.body as { status: string }).status;
        return { status: 201, body: { id: 'a-9', eventId: 'ev-1', userId: ME, status: answer } };
      },
    });
    await act(async () => {
      await result.current.loadEvents();
    });
    await act(async () => {
      await result.current.setRsvp('ev-1', 'interested');
    });
    const order = calls.filter((c) => c.method !== 'GET' && c.path.startsWith('/api/event-attendances')).map((c) => `${c.method} ${c.path}`);
    expect(order.slice(0, 2)).toEqual(['DELETE /api/event-attendances/a-1', 'POST /api/event-attendances']);
    expect(calls.find((c) => isCall(c, 'POST', '/api/event-attendances'))?.body).toEqual({ eventId: 'ev-1', userId: ME, status: 'interested' });
    expect(result.current.events[0].myRsvp).toBe('interested');
  });

  it('clearing my answer only deletes my row', async () => {
    const { result, calls } = setup({});
    await act(async () => {
      await result.current.loadEvents();
    });
    await act(async () => {
      await result.current.setRsvp('ev-1', null);
    });
    expect(calls.some((c) => isCall(c, 'DELETE', '/api/event-attendances/a-1'))).toBe(true);
    expect(calls.some((c) => isCall(c, 'POST', '/api/event-attendances'))).toBe(false);
  });

  it('rolls the answer and count back and toasts when the new answer is refused', async () => {
    const { result, showToast } = setup({
      'DELETE /api/event-attendances/{id}': { status: 204 },
      'POST /api/event-attendances': { status: 403, body: { detail: 'Event is closed' } },
    });
    await act(async () => {
      await result.current.loadEvents();
    });
    await act(async () => {
      await result.current.setRsvp('ev-1', 'interested');
    });
    expect(showToast).toHaveBeenCalledWith('Your answer was not saved: Event is closed');
    expect(result.current.events[0].myRsvp).toBe('going');
    expect(result.current.events[0].attendeeCount).toBe(1);
  });
});

describe('useEvents.createEvent', () => {
  it('rejects with the server reason so the dialog can stay open', async () => {
    const { result } = setup({ 'POST /api/events': { status: 400, body: { detail: 'End date is before start date' } } });
    let error: unknown = null;
    await act(async () => {
      try {
        await result.current.createEvent('Picnic', '', '', soon(1), soon(0.5), null);
      } catch (e) {
        error = e;
      }
    });
    expect((error as Error).message).toBe('The event was not created: End date is before start date');
  });
});

describe('isEventFull', () => {
  const base = { capacity: 2, attendeeCount: 2 } as Pick<EventItem, 'capacity' | 'attendeeCount'>;
  it('is full when the going count reaches the capacity', () => {
    expect(isEventFull(base)).toBe(true);
    expect(isEventFull({ capacity: 2, attendeeCount: 1 })).toBe(false);
    expect(isEventFull({ capacity: null, attendeeCount: 50 })).toBe(false);
  });
});
