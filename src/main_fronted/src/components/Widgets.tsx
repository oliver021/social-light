import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Avatar, Box, Button, Card, Skeleton, Typography } from '@mui/material';
import { UserPlus } from 'lucide-react';
import { EventsWidget } from './EventsWidget';
import { useSettled } from './ui/useSettled';
import { cardSx, mutedSx, sectionTitleSx, touchTargetSx } from './ui/tokens';

/** Dispatched by the feed's empty state: every visible copy of the people list expands and scrolls into view. */
export const SHOW_PEOPLE_EVENT = 'socialight:show-people';

const PREVIEW_COUNT = 5;

export const Widgets: React.FC = () => {
  // Real people to discover + follow come from the backend (Profile discovery +
  // SocialGraph). Following someone fans their posts into the home feed.
  const { currentUser, openChatWithUser, people, followUser, unfollowUser } = useApp();
  const [expanded, setExpanded] = useState(false);
  const settled = useSettled();
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

  const handleFollowClick = (userId: string, name: string, followed: boolean) => {
    if (followed) {
      unfollowUser(userId);
    } else {
      followUser(userId);
    }
  };

  return (
    <Box ref={rootRef} className="flex flex-col gap-4">
      <Card variant="outlined" component="section" aria-labelledby="people-you-may-know" sx={cardSx}>
        <Typography id="people-you-may-know" component="h2" sx={{ ...sectionTitleSx, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <UserPlus aria-hidden="true" className="w-4 h-4 text-emerald-500" />
          People you may know
        </Typography>

        {!settled && others.length === 0 && (
          <Box aria-busy="true" aria-label="Loading people" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 44 }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="45%" />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {settled && others.length === 0 && (
          <Typography sx={mutedSx}>No suggestions yet. New people will show up here.</Typography>
        )}

        {others.length > 0 && (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {visible.map((person) => (
              <Box component="li" key={person.userId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
                <Box
                  component="button"
                  type="button"
                  aria-label={`Message ${person.name}`}
                  onClick={() => openChatWithUser({ id: person.userId, name: person.name, avatar: person.avatar, handle: person.handle })}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1,
                    background: 'none', border: 0, p: 0, m: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer',
                    minHeight: 44,
                    '&:hover .person-name': { color: 'var(--color-violet-500)' },
                  }}
                >
                  <Avatar src={person.avatar} alt={person.name} sx={{ width: 36, height: 36 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography className="person-name" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ui-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {person.name}
                    </Typography>
                    <Typography sx={{ ...mutedSx, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {person.handle}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant={person.followed ? 'outlined' : 'contained'}
                  aria-label={person.followed ? `Unfollow ${person.name}` : `Follow ${person.name}`}
                  aria-pressed={person.followed}
                  onClick={() => handleFollowClick(person.userId, person.name, person.followed)}
                  sx={{ ...touchTargetSx, px: 1.5, borderRadius: 999, textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}
                >
                  {person.followed ? 'Following' : 'Follow'}
                </Button>
              </Box>
            ))}
          </Box>
        )}

        {others.length > PREVIEW_COUNT && (
          <Button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            sx={{ ...touchTargetSx, mt: 1, width: '100%', textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
          >
            {expanded ? 'Show fewer' : `See all (${hiddenCount + PREVIEW_COUNT})`}
          </Button>
        )}
      </Card>

      <EventsWidget />
    </Box>
  );
};
