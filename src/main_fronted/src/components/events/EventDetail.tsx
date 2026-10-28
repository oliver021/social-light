import React from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar, AvatarGroup, Box, Button, Typography } from '@mui/material';
import { CalendarDays, MapPin } from 'lucide-react';
import { ResponsiveDialog } from '../ui/ResponsiveDialog';
import { UserLine } from '../ui/UserLine';
import { SectionHeader } from '../ui/SectionHeader';
import { T, mutedSx, touchTargetSx } from '../ui/tokens';
import { isEventFull, type EventItem, type RsvpStatus } from '../../context/useEvents';
import { messageOf } from '../../api/gateway';
import { downloadEventIcs } from './eventCalendar';

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'going', label: 'Going' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_going', label: 'Not going' },
];

/**
 * "Nov 1, 2026, 6:00 PM – Nov 1, 2026, 8:00 PM GMT+1": both ends in the viewer's time zone,
 * with the zone's name, so nobody has to guess which clock the times are on.
 */
export function formatEventRange(startIso: string, endIso: string, locale?: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const zone = new Intl.DateTimeFormat(locale, { timeZoneName: 'short' })
    .formatToParts(start)
    .find((p) => p.type === 'timeZoneName')?.value ?? '';
  return `${fmt.format(start)} – ${fmt.format(end)}${zone ? ` ${zone}` : ''}`;
}

interface EventDetailProps {
  /** The event to show, or null when the dialog is closed. */
  event: EventItem | null;
  onClose: () => void;
}

/** One event: when and where, who hosts it, my answer, who is coming, and a calendar file. */
export const EventDetail: React.FC<EventDetailProps> = ({ event, onClose }) => {
  const { setRsvp, openProfile, showToast } = useApp();

  const going = event?.attendees.filter((a) => a.status === 'going') ?? [];
  const interested = event?.attendees.filter((a) => a.status === 'interested') ?? [];
  const full = event ? isEventFull(event) : false;

  const addToCalendar = () => {
    if (!event) return;
    try {
      downloadEventIcs(event);
    } catch (err) {
      showToast(messageOf(err, 'The calendar file could not be made'));
    }
  };

  return (
    <ResponsiveDialog open={!!event} onClose={onClose} title={event?.title ?? 'Event'}>
      {event && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text, fontWeight: 600 }}>
            {formatEventRange(event.startDate, event.endDate)}
          </Typography>

          {event.location && (
            <Box sx={{ ...mutedSx, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 'var(--ui-fs-sm)' }}>
              <MapPin aria-hidden="true" size={14} strokeWidth={1.75} />
              <span>{event.location}</span>
            </Box>
          )}

          {event.description && (
            <Typography sx={{ fontSize: 'var(--ui-fs-sm)', color: T.text, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {event.description}
            </Typography>
          )}

          {event.organizerId && (
            <UserLine
              name={event.organizerName}
              meta="Organizer"
              size="sm"
              onOpen={() => { onClose(); openProfile(event.organizerId); }}
            />
          )}

          <Box role="radiogroup" aria-label="Your answer" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {OPTIONS.map((opt) => {
              const checked = event.myRsvp === opt.value;
              // A full event takes no new "going", unless I already am going.
              const blocked = opt.value === 'going' && full && !checked;
              return (
                <Button
                  key={opt.value}
                  role="radio"
                  aria-checked={checked}
                  aria-label={blocked ? 'Going, the event is full' : opt.label}
                  disabled={blocked}
                  onClick={() => setRsvp(event.id, checked ? null : opt.value)}
                  variant={checked ? 'contained' : 'outlined'}
                  sx={{ ...touchTargetSx, minWidth: 96, borderRadius: 'var(--ui-radius-full)', textTransform: 'none', fontWeight: 600 }}
                >
                  {blocked ? 'Full' : opt.label}
                </Button>
              );
            })}
          </Box>
          {full && <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>This event has reached its capacity.</Typography>}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <AvatarGroup max={5} aria-label={`${going.length} going`}>
              {going.map((a) => (
                <Avatar key={a.userId} alt={a.name} src={a.avatar} sx={{ width: 32, height: 32 }} />
              ))}
            </AvatarGroup>
            <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-sm)' }}>
              {`${going.length} going · ${interested.length} interested`}
              {event.capacity !== null && ` · ${event.capacity} spaces`}
            </Typography>
          </Box>

          {going.length > 0 && (
            <Box component="section" aria-label="Going">
              <SectionHeader title="Going" as="h3" />
              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {going.map((a) => (
                  <Box component="li" key={a.userId}>
                    <UserLine name={a.name} avatarSrc={a.avatar} size="sm" />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {interested.length > 0 && (
            <Box component="section" aria-label="Interested">
              <SectionHeader title="Interested" as="h3" />
              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {interested.map((a) => (
                  <Box component="li" key={a.userId}>
                    <UserLine name={a.name} avatarSrc={a.avatar} size="sm" />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box>
            <Button
              variant="text"
              startIcon={<CalendarDays aria-hidden="true" size={16} strokeWidth={1.75} />}
              onClick={addToCalendar}
              sx={{ ...touchTargetSx, color: T.primary, textTransform: 'none', fontWeight: 600, px: 0 }}
            >
              Add to calendar
            </Button>
          </Box>
        </Box>
      )}
    </ResponsiveDialog>
  );
};
