import { useRef, useState, type MutableRefObject } from 'react';
import { eventsApi, getProfile, describeApiError, messageOf } from '../api/gateway';
import { defaultAvatar } from '../api/mappers';
import { type ToastSeverity } from './useToast';

/** The three answers a member can give to an event. */
export type RsvpStatus = 'going' | 'interested' | 'not_going';

const RSVP_STATUSES: RsvpStatus[] = ['going', 'interested', 'not_going'];
const isRsvpStatus = (s: string): s is RsvpStatus => (RSVP_STATUSES as string[]).includes(s);

/** One member's answer to an event, with the profile resolved. */
export interface Attendee {
  userId: string;
  name: string;
  avatar: string;
  status: RsvpStatus;
}

/** An event (generated Events module) joined with its organizer, attendees and this user's RSVP. */
export interface EventItem {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  /** Maximum number going, or null for no limit. Shown honestly; the server does not enforce it. */
  capacity: number | null;
  /** Everyone who answered, resolved to names. */
  attendees: Attendee[];
  /** My answer, or null when I have not answered. */
  myRsvp: RsvpStatus | null;
  /** Number going. */
  attendeeCount: number;
  /** True when my answer is going. */
  attending: boolean;
}

interface Deps {
  myUserId: MutableRefObject<string>;
  showToast: (message: string, severity?: ToastSeverity) => void;
}

/** Whether an event has no room left for one more "going" (capacity reached). */
export function isEventFull(event: Pick<EventItem, 'capacity' | 'attendeeCount'>): boolean {
  return event.capacity !== null && event.attendeeCount >= event.capacity;
}

/** The event as it looks after my answer changes from `previous` to `next` (counts follow). */
function withMyRsvp(event: EventItem, next: RsvpStatus | null): EventItem {
  const wasGoing = event.myRsvp === 'going';
  const nowGoing = next === 'going';
  return {
    ...event,
    myRsvp: next,
    attending: nowGoing,
    attendeeCount: Math.max(0, event.attendeeCount + (nowGoing ? 1 : 0) - (wasGoing ? 1 : 0)),
  };
}

/**
 * Events (generated Events module): CRUD over /api/events; RSVP through /api/event-attendances.
 * There is no PUT on attendances, so changing an answer deletes my row and creates the new one.
 * organizerId/userId aren't JWT-bound on this v0 module, so we pass our own id.
 */
export function useEvents({ myUserId, showToast }: Deps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  // True until the first load settles (success or failure), so the widget can show a
  // skeleton instead of an empty state. A refresh does not set it back.
  const [loading, setLoading] = useState(true);
  // Maps an eventId -> this user's attendance id, so changing an answer can DELETE it.
  const myAttendanceIds = useRef<Map<string, string>>(new Map());

  const loadEvents = async () => {
    try {
      const [{ data: eventList }, { data: attendances }] = await Promise.all([
        eventsApi.GET('/api/events'),
        eventsApi.GET('/api/event-attendances'),
      ]);
      if (!eventList) return;
      const myId = myUserId.current;
      myAttendanceIds.current.clear();
      const rows = (attendances ?? []).filter((a) => isRsvpStatus(a.status));
      for (const a of rows) {
        if (a.userId === myId) myAttendanceIds.current.set(a.eventId, a.id);
      }
      const personIds = [...new Set([...eventList.map((e) => e.organizerId), ...rows.map((a) => a.userId)])];
      const profiles = await Promise.all(personIds.map((id) => getProfile(id).catch(() => null)));
      const profileById = new Map(personIds.map((id, i) => [id, profiles[i]]));
      setEvents(
        eventList.map((e) => {
          const answers = rows.filter((a) => a.eventId === e.id);
          const attendees: Attendee[] = answers.map((a) => {
            const p = profileById.get(a.userId);
            return {
              userId: a.userId,
              name: p?.displayName || 'Member',
              avatar: p?.avatarUrl ?? defaultAvatar(a.userId),
              status: a.status as RsvpStatus,
            };
          });
          const myRsvp = (answers.find((a) => a.userId === myId)?.status as RsvpStatus | undefined) ?? null;
          const going = attendees.filter((a) => a.status === 'going').length;
          return {
            id: e.id,
            organizerId: e.organizerId,
            organizerName: profileById.get(e.organizerId)?.displayName || 'Member',
            title: e.title,
            description: e.description ?? '',
            location: e.location ?? '',
            startDate: e.startDate,
            endDate: e.endDate,
            capacity: e.capacity == null ? null : Number(e.capacity),
            attendees,
            myRsvp,
            attendeeCount: going,
            attending: myRsvp === 'going',
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  // Create an event. Rejects with a readable message so the dialog stays open; reloads the
  // list on success.
  const createEvent = async (
    title: string,
    description: string,
    location: string,
    startDate: string,
    endDate: string,
    capacity: number | null,
  ): Promise<void> => {
    let result;
    try {
      result = await eventsApi.POST('/api/events', {
        body: {
          organizerId: myUserId.current,
          title,
          description: description || null,
          location: location || null,
          startDate,
          endDate,
          capacity,
          visibility: 'public',
        },
      });
    } catch (err) {
      throw new Error(messageOf(err, 'The event was not created'));
    }
    if (!result.response.ok || !result.data) {
      throw new Error(describeApiError(result.error, result.response, 'The event was not created'));
    }
    loadEvents().catch(() => {});
  };

  // Set my answer: going, interested, not going, or null to clear it. The change is optimistic.
  // It is made in two steps (delete my old row, then create the new one), so a failure part way
  // is reconciled by reloading. On failure the answer and counts roll back and a toast says why.
  const setRsvp = async (eventId: string, status: RsvpStatus | null): Promise<void> => {
    const current = events.find((e) => e.id === eventId);
    if (!current) return;
    const previous = current.myRsvp;
    if (previous === status) return;
    const previousAttendanceId = myAttendanceIds.current.get(eventId);

    setEvents((prev) => prev.map((e) => (e.id === eventId ? withMyRsvp(e, status) : e)));
    try {
      if (previousAttendanceId) {
        const { error, response } = await eventsApi.DELETE('/api/event-attendances/{id}', { params: { path: { id: previousAttendanceId } } });
        if (!response.ok) throw new Error(describeApiError(error, response, 'Your answer was not changed'));
        myAttendanceIds.current.delete(eventId);
      }
      if (status) {
        const { data, error, response } = await eventsApi.POST('/api/event-attendances', {
          body: { eventId, userId: myUserId.current, status },
        });
        if (!response.ok || !data) throw new Error(describeApiError(error, response, 'Your answer was not saved'));
        myAttendanceIds.current.set(eventId, data.id);
      }
      loadEvents().catch(() => {});
    } catch (err) {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? withMyRsvp(e, previous) : e)));
      showToast(messageOf(err, 'Your answer was not saved'));
      // A step may have landed before the failure: re-read the server's truth.
      loadEvents().catch(() => {});
    }
  };

  // Cancel my event. On success it leaves the list and my own RSVP row is removed
  // best-effort (same module). Rejects with a readable message so the dialog stays open.
  const deleteEvent = async (eventId: string): Promise<void> => {
    const { error, response } = await eventsApi.DELETE('/api/events/{id}', { params: { path: { id: eventId } } });
    if (!response.ok) throw new Error(describeApiError(error, response, 'The event was not deleted'));
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    const attendanceId = myAttendanceIds.current.get(eventId);
    myAttendanceIds.current.delete(eventId);
    if (attendanceId) {
      eventsApi.DELETE('/api/event-attendances/{id}', { params: { path: { id: attendanceId } } }).catch(() => {});
    }
  };

  // Forget the previous account's events and answers (used when the signed-in user changes).
  const reset = () => {
    myAttendanceIds.current.clear();
    setEvents([]);
  };

  return { events, loading, loadEvents, createEvent, setRsvp, deleteEvent, reset };
}
