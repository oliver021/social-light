import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Button } from '@mui/material';
import { unMediaUrl } from '../api/gateway';
import { EventsWidget } from './EventsWidget';
import { EmptyState } from './ui/EmptyState';
import { ListSkeleton } from './ui/Skeletons';
import { SectionHeader } from './ui/SectionHeader';
import { Surface } from './ui/Surface';
import { UserLine } from './ui/UserLine';
import { T, touchTargetSx } from './ui/tokens';

/** Dispatched by the feed's empty state: every visible copy of the people list expands and scrolls into view. */
export const SHOW_PEOPLE_EVENT = 'socialight:show-people';

const PREVIEW_COUNT = 5;

/** Follow is a pill. Not followed: outlined primary. Followed: a quiet filled state, so a card has one filled control at most. */
const followButtonSx = (followed: boolean) => ({
  ...touchTargetSx,
  px: 1.5,
  borderRadius: 'var(--ui-radius-full)',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: 'var(--ui-fs-sm)',
  flexShrink: 0,
  boxShadow: 'none',
  ...(followed
    ? { bgcolor: T.surface3, color: T.text, '&:hover': { bgcolor: T.border, boxShadow: 'none' } }
    : { color: T.primary, borderColor: T.primary, '&:hover': { bgcolor: T.primarySoft } }),
});

export const Widgets: React.FC = () => {
  // Real people to discover + follow come from the backend (Profile discovery +
  // SocialGraph). Following someone fans their posts into the home feed.
  const { currentUser, openProfile, people, peopleLoading, followUser, unfollowUser } = useApp();
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Two copies of this widget are mounted (tablet and desktop layouts); only the visible one reacts.
  useEffect(() => {
    const onShow = () => {
      const el = rootRef.current;
      if (!el || el.offsetParent === null) return;
      setExpanded(true);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener(SHOW_PEOPLE_EVENT, onShow);
    return () => window.removeEventListener(SHOW_PEOPLE_EVENT, onShow);
  }, []);

  // Never suggest the signed-in user to themselves.
  const others = people.filter((p) => p.userId !== currentUser.id);
  const visible = expanded ? others : others.slice(0, PREVIEW_COUNT);
  const hiddenCount = others.length - PREVIEW_COUNT;

  const handleFollowClick = (userId: string, followed: boolean) => {
    if (followed) {
      unfollowUser(userId);
    } else {
      followUser(userId);
    }
  };

  return (
    <Box ref={rootRef} className="flex flex-col gap-4">
      <Surface as="section" aria-label="People you may know">
        <Box sx={{ mb: 1.5 }}>
          <SectionHeader title="People you may know" />
        </Box>

        {peopleLoading && others.length === 0 && <ListSkeleton rows={3} />}

        {!peopleLoading && others.length === 0 && (
          <EmptyState compact title="No suggestions yet" body="New people will show up here." />
        )}

        {others.length > 0 && (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {visible.map((person) => (
              <Box component="li" key={person.userId} sx={{ minWidth: 0 }}>
                <UserLine
                  name={person.name}
                  handle={person.handle}
                  avatarSrc={unMediaUrl(person.avatar)}
                  onOpen={() => openProfile(person.userId)}
                  trailing={
                    <Button
                      size="small"
                      variant={person.followed ? 'contained' : 'outlined'}
                      aria-label={person.followed ? `Unfollow ${person.name}` : `Follow ${person.name}`}
                      aria-pressed={person.followed}
                      onClick={() => handleFollowClick(person.userId, person.followed)}
                      sx={followButtonSx(person.followed)}
                    >
                      {person.followed ? 'Following' : 'Follow'}
                    </Button>
                  }
                />
              </Box>
            ))}
          </Box>
        )}

        {others.length > PREVIEW_COUNT && (
          <Button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            sx={{ ...touchTargetSx, mt: 1, width: '100%', textTransform: 'none', fontWeight: 600, fontSize: 'var(--ui-fs-sm)' }}
          >
            {expanded ? 'Show fewer' : `See all (${hiddenCount + PREVIEW_COUNT})`}
          </Button>
        )}
      </Surface>

      <EventsWidget />
    </Box>
  );
};
