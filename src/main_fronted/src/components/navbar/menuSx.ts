import { T } from '../ui/tokens';

/** The paper of every navbar popover and menu: a card-sized panel, token colours, no MUI gradient. */
export const popoverPaperSx = {
  mt: 1,
  width: 320,
  maxWidth: 'calc(100vw - 16px)',
  maxHeight: 384,
  p: 1,
  borderRadius: 'var(--ui-radius)',
  bgcolor: T.surface,
  color: T.text,
  border: `1px solid ${T.border}`,
  boxShadow: 'var(--ui-shadow-2)',
  backgroundImage: 'none',
  overflowY: 'auto',
};

/** A row inside a popover or menu: a 44px target with hover, pressed and focus states. */
export const menuRowSx = {
  borderRadius: 'var(--ui-radius-sm)',
  minHeight: 44,
  gap: 1,
  px: 1,
  py: 0.75,
  transition: `background-color var(--ui-dur) var(--ui-ease)`,
  '&:hover': { bgcolor: T.surface2 },
  '&:active': { bgcolor: T.surface3 },
  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: -2 },
};

/** The round, 44px icon button of the navbar (theme toggle, bell, messenger). */
export const navIconButtonSx = {
  width: 44,
  height: 44,
  p: 0,
  color: T.muted,
  '&:hover': { bgcolor: T.surface2 },
  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
};

/** The count badge on a navbar icon: token colours, mono figures. */
export const badgeSx = (tone: 'danger' | 'primary') => ({
  '& .MuiBadge-badge': {
    bgcolor: tone === 'danger' ? T.danger : T.primary,
    color: T.onPrimary,
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--ui-fs-xs)',
    height: 18,
    minWidth: 18,
    px: 0.5,
  },
});
