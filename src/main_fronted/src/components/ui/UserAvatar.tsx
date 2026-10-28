import React from 'react';
import { Avatar, ButtonBase } from '@mui/material';
import { mediaUrl } from '../../api/gateway';
import { T } from './tokens';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const PX: Record<UserAvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96 };
/** Minimum touch target when the avatar is itself a button (WCAG 2.5.5). */
const TOUCH = 44;

export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]);
  return letters.join('').toUpperCase() || '?';
}

export interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: UserAvatarSize;
  onClick?: () => void;
}

/**
 * A person's avatar. With no image it shows initials on the primary-soft token. With
 * onClick it becomes a button named "Open {name}'s profile" with a 44px target.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ name, src, size = 'md', onClick }) => {
  const px = PX[size];
  const url = mediaUrl(src ?? undefined);
  const avatar = (
    <Avatar
      src={url}
      alt={name}
      sx={{
        width: px,
        height: px,
        flexShrink: 0,
        bgcolor: T.primarySoft,
        color: T.primary,
        fontSize: px < 40 ? '0.6875rem' : '0.875rem',
      }}
    >
      {initialsOf(name)}
    </Avatar>
  );
  if (!onClick) return avatar;
  const target = Math.max(px, TOUCH);
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={`Open ${name}'s profile`}
      sx={{ width: target, height: target, borderRadius: '50%', flexShrink: 0, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 } }}
    >
      {avatar}
    </ButtonBase>
  );
};
