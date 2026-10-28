import React, { useState } from 'react';
import { useApp, isEventFull, type EventItem } from '../context/AppContext';
import { Box, Button, ButtonBase, FormControlLabel, IconButton, Switch, TextField, Typography } from '@mui/material';
import { CalendarDays, CalendarX, MapPin, Plus, Check } from 'lucide-react';
import { messageOf } from '../api/gateway';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState } from './ui/EmptyState';
import { OverflowMenu } from './ui/OverflowMenu';
import { ListSkeleton } from './ui/Skeletons';
import { ResponsiveDialog } from './ui/ResponsiveDialog';
import { SectionHeader } from './ui/SectionHeader';
import { Surface } from './ui/Surface';
import { T, mutedSx, touchTargetSx } from './ui/tokens';
import { EventDetail } from './events/EventDetail';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** A local calendar day as YYYY-MM-DD (the value a date input uses). */
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const byStart = (a: EventItem, b: EventItem) => Date.parse(a.startDate) - Date.parse(b.startDate);
const isPast = (e: EventItem, now: number) => Date.parse(e.endDate) < now;

/** RSVP is a pill with two states: "I'm going" is outlined, "Going" is a quiet filled state. */
const rsvpButtonSx = (attending: boolean) => ({
  ...touchTargetSx,
  minWidth: 96,
  px: 1.5,
  borderRadius: 'var(--ui-radius-full)',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: 'var(--ui-fs-sm)',
  flexShrink: 0,
  boxShadow: 'none',
  ...(attending
    ? { bgcolor: T.surface3, color: T.text, '&:hover': { bgcolor: T.border, boxShadow: 'none' } }
    : { color: T.primary, borderColor: T.primary, '&:hover': { bgcolor: T.primarySoft } }),
});

const UPCOMING_ON_WIDGET = 3;

// "Upcoming events" sidebar widget, backed by the generated Events module.
export const EventsWidget: React.FC = () => {
  const { currentUser, events, eventsLoading, createEvent, setRsvp, deleteEvent, showToast, openProfile } = useApp();
  const [open, setOpen] = useState(false);
  // The event whose cancellation is waiting for confirmation.
  const [cancelTarget, setCancelTarget] = useState<EventItem | null>(null);
  // The event open in the detail dialog (by id, so it follows RSVP changes).
  const [detailId, setDetailId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const now = Date.now();
  const upcoming = events.filter((e) => !isPast(e, now)).sort(byStart);
  const detail = events.find((e) => e.id === detailId) ?? null;

  const resetForm = () => {
    setTitle(''); setLocation(''); setDate(''); setEndDate(''); setCapacity(''); setFormError(null);
  };

  const handleCreate = async () => {
    const name = title.trim();
    if (!name || creating) return;
    setFormError(null);
    const cap = capacity.trim() === '' ? null : Number(capacity);
    if (cap !== null && (!Number.isInteger(cap) || cap < 1)) {
      setFormError('Capacity must be a whole number of 1 or more.');
      return;
    }
    const startDay = date || dayKey(new Date(Date.now() + 86400000));
    if (endDate && endDate < startDay) {
      setFormError('The end date cannot be before the start date.');
      return;
    }
    const start = new Date(`${startDay}T00:00`);
    const end = endDate ? new Date(`${endDate}T23:59`) : new Date(start.getTime() + 2 * 3600000);
    setCreating(true);
    try {
      await createEvent(name, '', location.trim(), start.toISOString(), end.toISOString(), cap);
      resetForm();
      setOpen(false);
    } catch (err) {
      setFormError(messageOf(err, 'The event was not created'));
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    if (creating) return;
    resetForm();
    setOpen(false);
  };

  const listed = (showPast ? [...events] : events.filter((e) => !isPast(e, now))).sort(byStart);

  return (
    <Surface as="section" aria-label="Upcoming events">
      <Box sx={{ mb: 1.5 }}>
        <SectionHeader
          title="Upcoming events"
          action={
            <IconButton aria-label="Add event" aria-haspopup="dialog" onClick={() => setOpen(true)} sx={{ ...touchTargetSx, color: T.primary }}>
              <Plus aria-hidden="true" size={18} strokeWidth={1.75} />
            </IconButton>
          }
        />
      </Box>

      {eventsLoading && events.length === 0 && <ListSkeleton rows={2} />}

      {!eventsLoading && upcoming.length === 0 && (
        <EmptyState
          compact
          icon={CalendarDays}
          title="No upcoming events"
          action={{ label: 'Create an event', onClick: () => setOpen(true) }}
        />
      )}

      {upcoming.length > 0 && (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {upcoming.slice(0, UPCOMING_ON_WIDGET).map((ev) => {
            const blocked = !ev.attending && isEventFull(ev);
            return (
              <Box
                component="li"
                key={ev.id}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1.25, borderRadius: 'var(--ui-radius-sm)', border: `1px solid ${T.border}` }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <ButtonBase
                    onClick={() => setDetailId(ev.id)}
                    aria-label={`Event details for ${ev.title}`}
                    sx={{ font: 'inherit', color: T.text, maxWidth: '100%', justifyContent: 'flex-start', borderRadius: 'var(--ui-radius-sm)', '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
                  >
                    <Typography component="span" sx={{ fontSize: 'var(--ui-fs-sm)', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.title}
                    </Typography>
                  </ButtonBase>
                  <Box sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <span>{fmtDate(ev.startDate)}</span>
                    {ev.location && (
                      <span className="flex items-center gap-0.5 min-w-0 truncate">
                        <MapPin aria-hidden="true" size={12} strokeWidth={1.75} className="shrink-0" />
                        {ev.location}
                      </span>
                    )}
                    <span>{ev.capacity !== null ? `${ev.attendeeCount} of ${ev.capacity} going` : `${ev.attendeeCount} going`}</span>
                    {ev.organizerId && (
                      <ButtonBase
                        onClick={() => openProfile(ev.organizerId)}
                        aria-label={`Open ${ev.organizerName}'s profile`}
                        sx={{ font: 'inherit', color: 'inherit', borderRadius: 'var(--ui-radius-sm)', minHeight: 24, '&:hover': { textDecoration: 'underline' }, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
                      >
                        {`Hosted by ${ev.organizerName}`}
                      </ButtonBase>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={blocked}
                    aria-label={ev.attending ? `Going to ${ev.title}` : blocked ? `${ev.title} is full` : `I'm going to ${ev.title}`}
                    aria-pressed={ev.attending}
                    onClick={() => setRsvp(ev.id, ev.attending ? null : 'going')}
                    sx={rsvpButtonSx(ev.attending)}
                  >
                    {ev.attending ? <><Check aria-hidden="true" size={12} strokeWidth={1.75} style={{ marginRight: 4 }} />Going</> : blocked ? 'Full' : "I'm going"}
                  </Button>
                  {/* Owner rule: only the organizer can cancel the event. */}
                  {!!ev.organizerId && ev.organizerId === currentUser.id && (
                    <OverflowMenu
                      label={`More actions for ${ev.title}`}
                      items={[{ id: 'cancel', label: 'Cancel event', icon: CalendarX, danger: true, onSelect: () => setCancelTarget(ev) }]}
                    />
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {events.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Button onClick={() => setListOpen(true)} sx={{ ...touchTargetSx, color: T.primary, textTransform: 'none', fontWeight: 600, px: 0 }}>
            See all events
          </Button>
        </Box>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel this event?"
        body="People who said they are going will no longer see it."
        confirmLabel="Cancel event"
        destructive
        onConfirm={async () => {
          if (!cancelTarget) return;
          await deleteEvent(cancelTarget.id);
          showToast('Event cancelled', 'success');
        }}
        onClose={() => setCancelTarget(null)}
      />

      <EventDetail event={detail} onClose={() => setDetailId(null)} />

      <ResponsiveDialog open={listOpen} onClose={() => setListOpen(false)} title="All events">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
          <FormControlLabel
            control={<Switch checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />}
            label="Show past events"
          />
          {listed.length === 0 && <EmptyState compact title="No events to show" />}
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {listed.map((ev) => (
              <Box component="li" key={ev.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: 'var(--ui-radius-sm)', border: `1px solid ${T.border}` }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 'var(--ui-fs-sm)', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.title}
                  </Typography>
                  <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>
                    {`${fmtDate(ev.startDate)}${isPast(ev, now) ? ' · Past' : ''} · ${ev.attendeeCount} going`}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setDetailId(ev.id)} aria-label={`Open ${ev.title}`} sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600 }}>
                  Open
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={open}
        onClose={closeCreate}
        title="Create an event"
        actions={
          <Button
            type="submit"
            form="create-event-form"
            variant="contained"
            disabled={!title.trim() || creating}
            sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', px: 2.5 }}
          >
            {creating ? 'Creating…' : 'Create event'}
          </Button>
        }
      >
        <Box
          component="form"
          id="create-event-form"
          noValidate
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          {formError && <Typography role="alert" sx={{ color: T.danger, fontSize: 'var(--ui-fs-sm)' }}>{formError}</Typography>}
          <TextField size="small" label="Event name" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth disabled={creating} />
          <TextField size="small" label="Place (optional)" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth disabled={creating} />
          <TextField size="small" type="date" label="Start date (optional)" slotProps={{ inputLabel: { shrink: true } }} value={date} onChange={(e) => setDate(e.target.value)} fullWidth disabled={creating} />
          <TextField size="small" type="date" label="End date (optional)" slotProps={{ inputLabel: { shrink: true } }} value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth disabled={creating} />
          <TextField size="small" type="number" label="Capacity (optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} fullWidth disabled={creating} slotProps={{ htmlInput: { min: 1, step: 1 } }} />
        </Box>
      </ResponsiveDialog>
    </Surface>
  );
};
