import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useApp } from '../../context/AppContext';
import { unMediaUrl } from '../../api/gateway';
import { EmptyState } from '../ui/EmptyState';
import { ResponsiveDialog } from '../ui/ResponsiveDialog';
import { SectionHeader } from '../ui/SectionHeader';
import { UserLine } from '../ui/UserLine';
import { sectionTitleSx, touchTargetSx } from '../ui/tokens';

/** "Mar 3, 2026", or '' for a missing or invalid date. */
function untilLabel(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const actionSx = { ...touchTargetSx, px: 1.5, textTransform: 'none', fontWeight: 600, borderRadius: 'var(--ui-radius-full)', flexShrink: 0 };

/**
 * Settings for what I see: blocked people (Unblock), muted or snoozed people (Unmute) and hidden
 * posts (Show again). All three are reversible here. Every list has an empty state.
 */
export const PrivacyDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { blockedUsers, mutedUsers, hiddenPosts, personView, unblockUser, removePreference, openProfile } = useApp();

  return (
    <ResponsiveDialog open={open} onClose={onClose} title="Privacy">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <Box component="section" aria-label="Blocked people" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <SectionHeader as="h3" title="Blocked people" />
          {blockedUsers.length === 0 ? (
            <EmptyState compact title="No blocked people" body="People you block show up here." />
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {blockedUsers.map((entry) => {
                const view = personView(entry.userId);
                return (
                  <Box component="li" key={entry.blockId} sx={{ minWidth: 0 }}>
                    <UserLine
                      name={view.name}
                      handle={view.handle}
                      avatarSrc={unMediaUrl(view.avatar)}
                      onOpen={() => openProfile(entry.userId)}
                      trailing={
                        <Button
                          variant="outlined"
                          aria-label={`Unblock ${view.name}`}
                          onClick={() => { unblockUser(entry.userId).catch(() => {}); }}
                          sx={actionSx}
                        >
                          Unblock
                        </Button>
                      }
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <Box component="section" aria-label="Muted and snoozed people" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <SectionHeader as="h3" title="Muted and snoozed" />
          {mutedUsers.length === 0 ? (
            <EmptyState compact title="No muted people" body="Muted and snoozed people show up here." />
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {mutedUsers.map((entry) => {
                const view = personView(entry.userId);
                const until = untilLabel(entry.expiresAt);
                const meta = entry.preferenceType === 'snooze' && until ? `Snoozed until ${until}` : 'Muted';
                return (
                  <Box component="li" key={entry.preferenceId} sx={{ minWidth: 0 }}>
                    <UserLine
                      name={view.name}
                      handle={view.handle}
                      avatarSrc={unMediaUrl(view.avatar)}
                      meta={meta}
                      onOpen={() => openProfile(entry.userId)}
                      trailing={
                        <Button
                          variant="outlined"
                          aria-label={`Unmute ${view.name}`}
                          onClick={() => { removePreference(entry.preferenceId).catch(() => {}); }}
                          sx={actionSx}
                        >
                          Unmute
                        </Button>
                      }
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <Box component="section" aria-label="Hidden posts" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <SectionHeader as="h3" title="Hidden posts" />
          {hiddenPosts.length === 0 ? (
            <EmptyState compact title="No hidden posts" body="Posts you hide from your feed show up here." />
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {hiddenPosts.map((entry, index) => (
                <Box
                  component="li"
                  key={entry.preferenceId}
                  sx={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}
                >
                  <Typography sx={{ ...sectionTitleSx, fontSize: '0.8125rem', minWidth: 0 }}>{`Hidden post ${index + 1}`}</Typography>
                  <Button
                    variant="outlined"
                    aria-label={`Show hidden post ${index + 1} again`}
                    onClick={() => { removePreference(entry.preferenceId).catch(() => {}); }}
                    sx={actionSx}
                  >
                    Show again
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </ResponsiveDialog>
  );
};
