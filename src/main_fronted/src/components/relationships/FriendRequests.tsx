import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { useApp } from '../../context/AppContext';
import { unMediaUrl } from '../../api/gateway';
import { ResponsiveDialog } from '../ui/ResponsiveDialog';
import { SectionHeader } from '../ui/SectionHeader';
import { Surface } from '../ui/Surface';
import { UserLine } from '../ui/UserLine';
import { T, touchTargetSx } from '../ui/tokens';
import type { IncomingRequest } from '../../context/useRelationships';

const PREVIEW_COUNT = 3;

/** One pending request: the person (opens their profile), Accept and Decline. */
const RequestRow: React.FC<{ request: IncomingRequest }> = ({ request }) => {
  const { acceptFriend, declineFriend, openProfile } = useApp();
  return (
    <UserLine
      name={request.name}
      handle={request.handle}
      avatarSrc={unMediaUrl(request.avatar)}
      onOpen={() => openProfile(request.userId)}
      trailing={
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Button
            size="small"
            variant="contained"
            aria-label={`Accept friend request from ${request.name}`}
            onClick={() => { acceptFriend(request.userId).catch(() => {}); }}
            sx={{ ...touchTargetSx, px: 1.5, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)' }}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="outlined"
            aria-label={`Decline friend request from ${request.name}`}
            onClick={() => { declineFriend(request.userId).catch(() => {}); }}
            sx={{ ...touchTargetSx, px: 1.5, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', color: T.text, borderColor: T.borderStrong }}
          >
            Decline
          </Button>
        </Box>
      }
    />
  );
};

/**
 * Friend requests sent to me, above the People widget. Hidden when there are none. Shows three
 * rows; "See all" opens the full list in a dialog.
 */
export const FriendRequestsCard: React.FC = () => {
  const { incomingRequests } = useApp();
  const [allOpen, setAllOpen] = useState(false);
  if (incomingRequests.length === 0) return null;
  const shown = incomingRequests.slice(0, PREVIEW_COUNT);

  return (
    <Surface as="section" aria-label="Friend requests">
      <Box sx={{ mb: 1.5 }}>
        <SectionHeader title="Friend requests" />
      </Box>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {shown.map((request) => (
          <Box component="li" key={request.userId} sx={{ minWidth: 0 }}>
            <RequestRow request={request} />
          </Box>
        ))}
      </Box>
      {incomingRequests.length > PREVIEW_COUNT && (
        <Button
          onClick={() => setAllOpen(true)}
          aria-label={`See all ${incomingRequests.length} friend requests`}
          sx={{ ...touchTargetSx, mt: 1, width: '100%', textTransform: 'none', fontWeight: 600, fontSize: 'var(--ui-fs-sm)' }}
        >
          See all ({incomingRequests.length})
        </Button>
      )}
      <ResponsiveDialog open={allOpen} onClose={() => setAllOpen(false)} title="Friend requests">
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
          {incomingRequests.map((request) => (
            <Box component="li" key={request.userId} sx={{ minWidth: 0 }}>
              <RequestRow request={request} />
            </Box>
          ))}
        </Box>
      </ResponsiveDialog>
    </Surface>
  );
};
