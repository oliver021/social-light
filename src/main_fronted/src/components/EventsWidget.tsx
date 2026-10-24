import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import { CalendarDays, MapPin, Plus, Check } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { ListSkeleton } from './ui/Skeletons';
import { ResponsiveDialog } from './ui/ResponsiveDialog';
import { SectionHeader } from './ui/SectionHeader';
import { Surface } from './ui/Surface';
import { T, mutedSx, touchTargetSx } from './ui/tokens';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

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

// "Upcoming events" sidebar widget, backed by the generated Events module.
export const EventsWidget: React.FC = () => {
  const { events, eventsLoading, createEvent, rsvpEvent } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;
    const start = date ? new Date(date).toISOString() : new Date(Date.now() + 86400000).toISOString();
    const end = new Date(new Date(start).getTime() + 2 * 3600000).toISOString();
    createEvent(title.trim(), '', location.trim(), start, end, null);
    setTitle(''); setLocation(''); setDate(''); setOpen(false);
  };

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

      {!eventsLoading && events.length === 0 && (
        <EmptyState
          compact
          icon={CalendarDays}
          title="No upcoming events"
          action={{ label: 'Create an event', onClick: () => setOpen(true) }}
        />
      )}

      {events.length > 0 && (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {events.map((ev) => (
            <Box
              component="li"
              key={ev.id}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1.25, borderRadius: 'var(--ui-radius-sm)', border: `1px solid ${T.border}` }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 'var(--ui-fs-sm)', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </Typography>
                <Box sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <span>{fmtDate(ev.startDate)}</span>
                  {ev.location && (
                    <span className="flex items-center gap-0.5 min-w-0 truncate">
                      <MapPin aria-hidden="true" size={12} strokeWidth={1.75} className="shrink-0" />
                      {ev.location}
                    </span>
                  )}
                  <span>{ev.attendeeCount} going</span>
                </Box>
              </Box>
              <Button
                size="small"
                variant="outlined"
                aria-label={ev.attending ? `Going to ${ev.title}` : `I'm going to ${ev.title}`}
                aria-pressed={ev.attending}
                onClick={() => rsvpEvent(ev.id)}
                sx={rsvpButtonSx(ev.attending)}
              >
                {ev.attending ? <><Check aria-hidden="true" size={12} strokeWidth={1.75} style={{ marginRight: 4 }} />Going</> : "I'm going"}
              </Button>
            </Box>
          ))}
        </Box>
      )}

      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create an event"
        actions={
          <Button
            type="submit"
            form="create-event-form"
            variant="contained"
            disabled={!title.trim()}
            sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', px: 2.5 }}
          >
            Create event
          </Button>
        }
      >
        <Box
          component="form"
          id="create-event-form"
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          <TextField size="small" label="Event name" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField size="small" label="Place (optional)" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
          <TextField size="small" type="date" label="Date" slotProps={{ inputLabel: { shrink: true } }} value={date} onChange={(e) => setDate(e.target.value)} fullWidth />
        </Box>
      </ResponsiveDialog>
    </Surface>
  );
};
