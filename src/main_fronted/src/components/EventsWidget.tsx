import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Card, Typography, Button, Collapse, TextField, IconButton } from '@mui/material';
import { CalendarDays, MapPin, Plus, Check } from 'lucide-react';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// "Upcoming Events" sidebar widget, backed by the generated Events module.
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
    <Card variant="outlined" className="p-4 border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950">
      <Box className="flex items-center justify-between mb-3">
        <Box className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-violet-500" />
          <Typography variant="subtitle2" className="font-display font-bold text-zinc-800 dark:text-zinc-200 text-sm">
            Upcoming Events
          </Typography>
        </Box>
        <IconButton size="small" aria-label={open ? "Close event form" : "Add event"} onClick={() => setOpen((o) => !o)} className="text-violet-500 w-11 h-11">
          <Plus className="w-4 h-4" />
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box className="flex flex-col gap-2 mb-3 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
          <TextField size="small" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField size="small" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
          <TextField size="small" type="date" value={date} onChange={(e) => setDate(e.target.value)} fullWidth />
          <Button size="small" variant="contained" onClick={handleCreate} className="bg-gradient-to-r from-violet-600 to-fuchsia-600">Create</Button>
        </Box>
      </Collapse>

      <Box className="flex flex-col gap-2">
        {events.length === 0 && (
          <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 block py-1">No events yet — create one.</Typography>
        )}
        {events.map((ev) => (
          <Box key={ev.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-zinc-100 dark:border-zinc-850">
            <Box className="min-w-0">
              <Typography variant="body2" className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs truncate">{ev.title}</Typography>
              <Box className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                <span>{fmtDate(ev.startDate)}</span>
                {ev.location && (<span className="flex items-center gap-0.5 truncate"><MapPin className="w-2.5 h-2.5" />{ev.location}</span>)}
                <span>{ev.attendeeCount} going</span>
              </Box>
            </Box>
            <Button
              size="small"
              variant={ev.attending ? 'outlined' : 'contained'}
              color={ev.attending ? 'inherit' : 'primary'}
              onClick={() => rsvpEvent(ev.id)}
              className={`text-xs min-w-0 px-2 ${ev.attending ? '' : 'bg-violet-600'}`}
            >
              {ev.attending ? <><Check className="w-3 h-3 mr-0.5" />Going</> : 'RSVP'}
            </Button>
          </Box>
        ))}
      </Box>
    </Card>
  );
};
