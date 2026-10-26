import { describe, it, expect } from 'vitest';
import { buildEventIcs } from './eventCalendar';

const event = {
  id: 'ev-42',
  title: 'Picnic, games; and cake',
  description: 'Bring a blanket\nand a hat',
  location: 'Park, north gate',
  startDate: '2026-11-01T18:00:00.000Z',
  endDate: '2026-11-01T20:00:00.000Z',
};
const NOW = new Date('2026-10-26T08:00:00.000Z');

describe('buildEventIcs', () => {
  it('writes a VEVENT with the UTC start and end, the summary, and the event id as UID', () => {
    const ics = buildEventIcs(event, NOW);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261101T180000Z');
    expect(ics).toContain('DTEND:20261101T200000Z');
    expect(ics).toContain('DTSTAMP:20261026T080000Z');
    expect(ics).toContain('UID:ev-42@sociallight');
    expect(ics).toContain('SUMMARY:Picnic\\, games\\; and cake');
    expect(ics).toMatch(/END:VEVENT\r\nEND:VCALENDAR\r\n$/);
  });

  it('escapes line breaks in the description and keeps the location', () => {
    const ics = buildEventIcs(event, NOW);
    expect(ics).toContain('DESCRIPTION:Bring a blanket\\nand a hat');
    expect(ics).toContain('LOCATION:Park\\, north gate');
  });

  it('escapes semicolons, commas and backslashes in LOCATION and DESCRIPTION', () => {
    const ics = buildEventIcs(
      { ...event, location: 'Hall A; east wing', description: 'Tea; coffee, and a \\ slash' },
      NOW,
    );
    expect(ics).toContain('LOCATION:Hall A\\; east wing');
    expect(ics).toContain('DESCRIPTION:Tea\\; coffee\\, and a \\\\ slash');
  });

  it('leaves out an empty location and description', () => {
    const ics = buildEventIcs({ ...event, description: '', location: '' }, NOW);
    expect(ics).not.toContain('LOCATION:');
    expect(ics).not.toContain('DESCRIPTION:');
  });

  it('folds lines longer than 75 characters', () => {
    const ics = buildEventIcs({ ...event, title: 'x'.repeat(120) }, NOW);
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
    expect(ics).toContain('\r\n ');
  });
});
