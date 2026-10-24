import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Button, Card, Collapse, IconButton, TextField, Typography } from '@mui/material';
import { CalendarDays, MapPin, Plus, Check } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { cardSx, mutedSx, sectionTitleSx, touchTargetSx } from './ui/tokens';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// "Upcoming events" sidebar widget, backed by the generated Events module.
export const EventsWidget: React.FC = () => {
  const { events, createEvent, rsvpEvent } = useApp();
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
    <Card variant="outlined" component="section" aria-labelledby="upcoming-events-title" sx={cardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography id="upcoming-events-title" component="h2" sx={{ ...sectionTitleSx, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarDays aria-hidden="true" className="w-4 h-4 text-primary" />
          Upcoming events
        </Typography>
        <IconButton
          aria-label={open ? 'Close event form' : 'Add event'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          sx={{ ...touchTargetSx, color: 'var(--ui-primary)' }}
        >
          <Plus aria-hidden="true" className="w-4 h-4" />
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleCreate(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5, p: 1.5, bgcolor: 'var(--ui-page)', borderRadius: 2, border: '1px solid var(--ui-border)' }}>
          <TextField size="small" label="Event name" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField size="small" label="Place (optional)" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
          <TextField size="small" type="date" label="Date" slotProps={{ inputLabel: { shrink: true } }} value={date} onChange={(e) => setDate(e.target.value)} fullWidth />
          <Button type="submit" variant="contained" disabled={!title.trim()} sx={{ ...touchTargetSx, textTransform: 'none', fontWeight: 600 }}>
            Create event
          </Button>
        </Box>
      </Collapse>

      {events.length === 0 ? (
        <EmptyState
          compact
          title="No upcoming events"
          action={{ label: 'Create an event', onClick: () => setOpen(true) }}
        />
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {events.map((ev) => (
            <Box component="li" key={ev.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1.25, borderRadius: 2, border: '1px solid var(--ui-border)' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ui-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </Typography>
                <Box sx={{ ...mutedSx, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <span>{fmtDate(ev.startDate)}</span>
                  {ev.location && (
                    <span className="flex items-center gap-0.5 min-w-0 truncate">
                      <MapPin aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
                      {ev.location}
                    </span>
                  )}
                  <span>{ev.attendeeCount} going</span>
                </Box>
              </Box>
              <Button
                size="small"
                variant={ev.attending ? 'outlined' : 'contained'}
                aria-label={ev.attending ? `Going to ${ev.title}` : `I'm going to ${ev.title}`}
                aria-pressed={ev.attending}
                onClick={() => rsvpEvent(ev.id)}
                sx={{ ...touchTargetSx, minWidth: 96, px: 1.5, borderRadius: 999, textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}
              >
                {ev.attending ? <><Check aria-hidden="true" className="w-3 h-3 mr-1" />Going</> : "I'm going"}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
};
