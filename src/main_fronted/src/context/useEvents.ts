import { useRef, useState, type MutableRefObject } from 'react';
import { eventsApi, getProfile } from '../api/gateway';

/** An event (generated Events module) joined with its organizer + this user's RSVP. */
export interface EventItem {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  capacity: number | null;
  attendeeCount: number;
  attending: boolean;
}

interface Deps {
  myUserId: MutableRefObject<string>;
}

/**
 * Events (generated Events module): CRUD over /api/events; RSVP through
 * /api/event-attendances (toggle going/not, mirroring the groups join pattern).
 * organizerId/userId aren't JWT-bound on this v0 module, so we pass our own id.
 */
export function useEvents({ myUserId }: Deps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  // True until the first load settles (success or failure), so the widget can show a
  // skeleton instead of an empty state. A refresh does not set it back.
  const [loading, setLoading] = useState(true);
  // Maps an eventId -> this user's attendance id, so un-RSVP can DELETE it.
  const myAttendanceIds = useRef<Map<string, string>>(new Map());

  const loadEvents = async () => {
    try {
      const [{ data: eventList }, { data: attendances }] = await Promise.all([
        eventsApi.GET('/api/events'),
        eventsApi.GET('/api/event-attendances'),
      ]);
      if (!eventList) return;
      const myId = myUserId.current;
      const counts = new Map<string, number>();
      myAttendanceIds.current.clear();
      for (const a of attendances ?? []) {
        counts.set(a.eventId, (counts.get(a.eventId) ?? 0) + 1);
        if (a.userId === myId) myAttendanceIds.current.set(a.eventId, a.id);
      }
      const organizerIds = [...new Set(eventList.map((e) => e.organizerId))];
      const profiles = await Promise.all(organizerIds.map((id) => getProfile(id).catch(() => null)));
      const profileById = new Map(organizerIds.map((id, i) => [id, profiles[i]]));
      setEvents(
        eventList.map((e) => ({
          id: e.id,
          organizerId: e.organizerId,
          organizerName: profileById.get(e.organizerId)?.displayName || 'Member',
          title: e.title,
          description: e.description ?? '',
          location: e.location ?? '',
          startDate: e.startDate,
          endDate: e.endDate,
          capacity: e.capacity == null ? null : Number(e.capacity),
          attendeeCount: counts.get(e.id) ?? 0,
          attending: myAttendanceIds.current.has(e.id),
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (
    title: string,
    description: string,
    location: string,
    startDate: string,
    endDate: string,
    capacity: number | null,
  ) => {
    const { data } = await eventsApi.POST('/api/events', {
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
    if (data) loadEvents().catch(() => {});
  };

  // Toggle RSVP. Optimistic flip of attending + count, reverting on failure.
  const rsvpEvent = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    const wasAttending = ev?.attending ?? false;
    const attendanceId = myAttendanceIds.current.get(eventId);
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, attending: !wasAttending, attendeeCount: Math.max(0, e.attendeeCount + (wasAttending ? -1 : 1)) }
          : e,
      ),
    );
    (async () => {
      try {
        if (wasAttending) {
          if (attendanceId) await eventsApi.DELETE('/api/event-attendances/{id}', { params: { path: { id: attendanceId } } });
          myAttendanceIds.current.delete(eventId);
        } else {
          const { data } = await eventsApi.POST('/api/event-attendances', {
            body: { eventId, userId: myUserId.current, status: 'going' },
          });
          if (data) myAttendanceIds.current.set(eventId, data.id);
        }
      } catch {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, attending: wasAttending, attendeeCount: Math.max(0, e.attendeeCount + (wasAttending ? 1 : -1)) }
              : e,
          ),
        );
      }
    })();
  };

  return { events, loading, loadEvents, createEvent, rsvpEvent };
}
