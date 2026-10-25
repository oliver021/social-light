import React, { useEffect, useState } from 'react';
import { Box, Button, Divider, IconButton, Typography } from '@mui/material';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getProfile, mediaUrl, messageOf } from '../../api/gateway';
import { defaultAvatar, withHandle } from '../../api/mappers';
import type { components as ProfileComponents } from '@sdk/profile';
import {
  EmptyState,
  InlineError,
  ListSkeleton,
  PageHeader,
  Surface,
  T,
  UserAvatar,
  mutedSx,
  sectionTitleSx,
  subtleSx,
} from '../ui';
import { ProfilePosts } from './ProfilePosts';

type ProfileDto = ProfileComponents['schemas']['ProfileDto'];

const TOUCH_TARGET = { minHeight: 44, minWidth: 44 };
const PILL_BUTTON = { ...TOUCH_TARGET, borderRadius: 'var(--ui-radius-full)', px: 2 };

/** "June 2026" from an ISO date, or '' when the date is missing or invalid. */
function joinedLabel(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ ...sectionTitleSx, fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{value}</Typography>
    <Typography sx={{ ...subtleSx, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', mt: 0.25 }}>{label}</Typography>
  </Box>
);

/**
 * Another person's profile: header, follow and message actions, counts, and their posts.
 * Everything shown comes from Profile (the person) and the follow list (the counts); nothing
 * is invented. A missing profile shows "not available" with a way back.
 */
export const PersonProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const { closeProfile, countsFor, isFollowing, followUser, unfollowUser, openChatWithUser, loadTimeline } = useApp();
  // undefined = loading, null = not found, otherwise the profile.
  const [profile, setProfile] = useState<ProfileDto | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProfile(undefined);
    setLoadError(null);
    getProfile(userId)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch((err) => { if (!cancelled) setLoadError(messageOf(err, 'Could not load this profile')); });
    return () => { cancelled = true; };
  }, [userId, attempt]);

  useEffect(() => {
    loadTimeline(userId).catch(() => {});
  }, [userId, loadTimeline]);

  const back = (
    <IconButton aria-label="Back" onClick={closeProfile} sx={{ ...TOUCH_TARGET, color: T.text }}>
      <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
    </IconButton>
  );

  if (loadError) {
    return (
      <Box id="profile-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
        <PageHeader title="Profile" actions={back} />
        <Surface as="section">
          <InlineError message={loadError} onRetry={() => setAttempt((n) => n + 1)} />
        </Surface>
      </Box>
    );
  }

  if (profile === undefined) {
    return (
      <Box id="profile-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
        <PageHeader title="Profile" actions={back} />
        <Surface as="section" aria-busy="true" aria-label="Loading profile">
          <ListSkeleton rows={2} />
        </Surface>
        <ProfilePosts userId={userId} />
      </Box>
    );
  }

  if (profile === null) {
    return (
      <Box id="profile-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
        <PageHeader title="Profile" actions={back} />
        <Surface as="section">
          <EmptyState
            title="This profile is not available"
            body="The person may have left, or the link is out of date."
            action={{ label: 'Back', onClick: closeProfile, ariaLabel: 'Back to the previous page' }}
          />
        </Surface>
      </Box>
    );
  }

  const name = profile.displayName || 'Member';
  const handle = withHandle(profile.handle);
  const avatar = mediaUrl(profile.avatarUrl) ?? defaultAvatar(userId);
  const counts = countsFor(userId);
  const followed = isFollowing(userId);
  const joined = joinedLabel(profile.createdAt);

  return (
    <Box id="profile-tab-page" sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)' }}>
      <PageHeader title="Profile" actions={back} />

      <Surface as="section" padding="none" sx={{ overflow: 'hidden', pb: 'var(--ui-card-pad)' }}>
        <Box sx={{ height: 120, width: '100%', bgcolor: T.primarySoft }} aria-hidden="true" />
        <Box
          sx={{
            px: 'var(--ui-card-pad)',
            mt: -6,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'flex-end' },
            justifyContent: 'space-between',
            gap: 2,
            minWidth: 0,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'flex-end' }, gap: 1.5, minWidth: 0 }}>
            <Box sx={{ border: `4px solid ${T.surface}`, borderRadius: 'var(--ui-radius-full)', display: 'inline-flex', lineHeight: 0, alignSelf: 'flex-start' }}>
              <UserAvatar name={name} src={avatar} size="xl" />
            </Box>
            <Box sx={{ minWidth: 0, pb: { md: 0.5 } }}>
              <Typography component="h2" sx={{ ...sectionTitleSx, fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 700, overflowWrap: 'anywhere' }}>
                {name}
              </Typography>
              {handle && <Typography sx={{ ...subtleSx, fontFamily: 'var(--font-mono)' }}>{handle}</Typography>}
              {profile.location && <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>{profile.location}</Typography>}
              {joined && <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-xs)' }}>{`Joined ${joined}`}</Typography>}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignSelf: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
            <Button
              variant={followed ? 'contained' : 'outlined'}
              aria-label={followed ? `Unfollow ${name}` : `Follow ${name}`}
              aria-pressed={followed}
              onClick={() => (followed ? unfollowUser(userId) : followUser(userId))}
              sx={{ ...PILL_BUTTON, fontSize: 'var(--ui-fs-xs)' }}
            >
              {followed ? 'Following' : 'Follow'}
            </Button>
            <Button
              variant="outlined"
              aria-label={`Message ${name}`}
              startIcon={<MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => openChatWithUser({ id: userId, name, avatar, handle })}
              sx={{ ...PILL_BUTTON, color: T.text, borderColor: T.borderStrong, fontSize: 'var(--ui-fs-xs)' }}
            >
              Message
            </Button>
          </Box>
        </Box>
      </Surface>

      <Surface as="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', textAlign: 'center', py: 1 }}>
          <Stat value={counts.followers} label="Followers" />
          <Divider orientation="vertical" flexItem />
          <Stat value={counts.following} label="Following" />
        </Box>
        {profile.bio && (
          <>
            <Divider />
            <Typography sx={{ ...mutedSx, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{profile.bio}</Typography>
          </>
        )}
      </Surface>

      <ProfilePosts userId={userId} />
    </Box>
  );
};
