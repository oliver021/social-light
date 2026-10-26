import React, { useState } from 'react';
import { Button, Menu, MenuItem, Box } from '@mui/material';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { T } from '../ui/tokens';

const TOUCH_TARGET = { minHeight: 44, minWidth: 44 };
const PILL_BUTTON = { ...TOUCH_TARGET, borderRadius: 'var(--ui-radius-full)', px: 2, fontSize: 'var(--ui-fs-xs)' };

/**
 * The friendship control on another person's profile, driven by `relationTo`:
 * "Add friend" -> "Request sent" (menu: Cancel request) -> for an incoming request
 * "Accept" + "Decline" -> "Friends" (menu: Unfriend, with a confirm). Each label changes only
 * after the server accepts the step, because the operations resolve from the server reply.
 */
export const FriendButton: React.FC<{ userId: string; name: string }> = ({ userId, name }) => {
  const { relationTo, sendFriendRequest, acceptFriend, declineFriend, cancelFriendRequest, unfriend } = useApp();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [unfriendOpen, setUnfriendOpen] = useState(false);
  const relation = relationTo(userId);

  if (relation === 'friends') {
    return (
      <Box sx={{ display: 'contents' }}>
        <Button
          variant="contained"
          aria-haspopup="menu"
          aria-expanded={!!menu}
          aria-label={`Friends with ${name}. Open the friend menu`}
          onClick={(e) => setMenu(e.currentTarget)}
          sx={PILL_BUTTON}
        >
          Friends
        </Button>
        <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
          <MenuItem
            onClick={() => { setMenu(null); setUnfriendOpen(true); }}
            sx={{ minHeight: 44, color: T.danger }}
          >
            Unfriend
          </MenuItem>
        </Menu>
        <ConfirmDialog
          open={unfriendOpen}
          title={`Unfriend ${name}?`}
          body="You will no longer be friends. You can send a new friend request later."
          confirmLabel="Unfriend"
          destructive
          onConfirm={async () => { await unfriend(userId); }}
          onClose={() => setUnfriendOpen(false)}
        />
      </Box>
    );
  }

  if (relation === 'requested') {
    return (
      <>
        <Button
          variant="outlined"
          aria-haspopup="menu"
          aria-expanded={!!menu}
          aria-label={`Friend request to ${name} sent. Open the request menu`}
          onClick={(e) => setMenu(e.currentTarget)}
          sx={{ ...PILL_BUTTON, color: T.text, borderColor: T.borderStrong }}
        >
          Request sent
        </Button>
        <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
          <MenuItem
            onClick={() => { setMenu(null); cancelFriendRequest(userId).catch(() => {}); }}
            sx={{ minHeight: 44 }}
          >
            Cancel request
          </MenuItem>
        </Menu>
      </>
    );
  }

  if (relation === 'incoming') {
    return (
      <Box sx={{ display: 'contents' }}>
        <Button
          variant="contained"
          aria-label={`Accept friend request from ${name}`}
          onClick={() => { acceptFriend(userId).catch(() => {}); }}
          sx={PILL_BUTTON}
        >
          Accept
        </Button>
        <Button
          variant="outlined"
          aria-label={`Decline friend request from ${name}`}
          onClick={() => { declineFriend(userId).catch(() => {}); }}
          sx={{ ...PILL_BUTTON, color: T.text, borderColor: T.borderStrong }}
        >
          Decline
        </Button>
      </Box>
    );
  }

  return (
    <Button
      variant="outlined"
      aria-label={`Add ${name} as a friend`}
      onClick={() => { sendFriendRequest(userId).catch(() => {}); }}
      sx={{ ...PILL_BUTTON, color: T.primary, borderColor: T.primary }}
    >
      Add friend
    </Button>
  );
};
