import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { UserAvatar, type UserAvatarSize } from './UserAvatar';
import { mutedSx, sectionTitleSx } from './tokens';

export interface UserLineProps {
  name: string;
  handle?: string;
  avatarSrc?: string | null;
  /** Shown after the handle, e.g. a relative time. */
  meta?: React.ReactNode;
  /** When set, the name becomes a button that opens the person. */
  onOpen?: () => void;
  trailing?: React.ReactNode;
  size?: UserAvatarSize;
}

/** Avatar, name, and "@handle · meta" on one line. Used by post headers, comments and people rows. */
export const UserLine: React.FC<UserLineProps> = ({ name, handle, avatarSrc, meta, onOpen, trailing, size = 'md' }) => {
  const nameNode = onOpen ? (
    <ButtonBase
      onClick={onOpen}
      title={`Chat with ${name}`}
      sx={{ ...sectionTitleSx, fontSize: '0.8125rem', maxWidth: '100%', justifyContent: 'flex-start', textAlign: 'left', borderRadius: 1, minHeight: 24, '&:hover': { textDecoration: 'underline' }, '&.Mui-focusVisible': { outline: '2px solid var(--ui-focus)' } }}
    >
      <Box component="span" sx={{ overflowWrap: 'anywhere' }}>{name}</Box>
    </ButtonBase>
  ) : (
    <Typography sx={{ ...sectionTitleSx, fontSize: '0.8125rem', overflowWrap: 'anywhere' }}>{name}</Typography>
  );

  const hasMeta = !!handle || (meta !== undefined && meta !== null && meta !== '');

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <UserAvatar name={name} src={avatarSrc} size={size} />
        <Box sx={{ minWidth: 0 }}>
          {nameNode}
          {hasMeta && (
            <Typography noWrap sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)', fontFamily: 'var(--font-mono)' }}>
              {[handle, meta].filter((part) => part !== undefined && part !== null && part !== '').map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && ' · '}
                  {part}
                </React.Fragment>
              ))}
            </Typography>
          )}
        </Box>
      </Box>
      {trailing && <Box sx={{ flexShrink: 0 }}>{trailing}</Box>}
    </Box>
  );
};
