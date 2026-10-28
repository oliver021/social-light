import { createTheme, type Theme } from '@mui/material/styles';

// The only TypeScript file that holds colour values (with src/index.css). Keys mirror the
// --ui-* custom properties in index.css; theme.test.ts fails if the two drift apart.
export const TOKENS = {
  light: {
    page: '#f6f7f9',
    surface: '#ffffff',
    surface2: '#f1f2f4',
    surface3: '#e7e8eb',
    border: '#e3e4e8',
    borderStrong: '#c9cbd1',
    text: '#16171a',
    muted: '#555862',
    subtle: '#6e717b',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    onPrimary: '#ffffff',
    primarySoft: '#e8f0fe',
    accent: '#7c3aed',
    accentSoft: '#f1ebfe',
    success: '#047857',
    successSoft: '#e7f6ef',
    warning: '#b45309',
    warningSoft: '#fdf4e3',
    danger: '#c62828',
    dangerSoft: '#fdecec',
    focus: '#2563eb',
    onMedia: '#fafafa',
    onMediaMuted: '#d4d4d8',
  },
  dark: {
    page: '#0a0a0b',
    surface: '#121214',
    surface2: '#1b1b1f',
    surface3: '#26262b',
    border: '#2a2a30',
    borderStrong: '#3a3a42',
    text: '#ececef',
    muted: '#a3a5ad',
    subtle: '#8a8c95',
    primary: '#60a5fa',
    primaryHover: '#93c5fd',
    onPrimary: '#0a0a0b',
    primarySoft: '#172554',
    accent: '#a78bfa',
    accentSoft: '#2e1065',
    success: '#34d399',
    successSoft: '#052e22',
    warning: '#fbbf24',
    warningSoft: '#2d1d05',
    danger: '#f87171',
    dangerSoft: '#3a0d0d',
    focus: '#93c5fd',
    onMedia: '#fafafa',
    onMediaMuted: '#d4d4d8',
  },
} as const;

const v = (name: string) => `var(--ui-${name})`;

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const c = TOKENS[mode];
  return createTheme({
    // Same breakpoints as Tailwind (sm 640, md 768). Without this, MUI's md (900px) and
    // Tailwind's md (768px) disagree, so the sidebar and the bottom nav clashed at 768.
    breakpoints: { values: { xs: 0, sm: 640, md: 768, lg: 1200, xl: 1536 } },
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.onPrimary },
      secondary: { main: c.accent },
      error: { main: c.danger },
      success: { main: c.success },
      warning: { main: c.warning },
      background: { default: c.page, paper: c.surface },
      text: { primary: c.text, secondary: c.muted },
      divider: c.border,
    },
    typography: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      body1: { fontSize: '15px' },
      body2: { fontSize: '13px' },
      caption: { fontSize: '12px' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: v('radius-sm'),
            minHeight: 36,
            fontWeight: 600,
          },
          sizeLarge: { minHeight: 44 },
        },
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: { '&:hover': { backgroundColor: v('primary-hover') } },
          },
        ],
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': { boxShadow: `0 0 0 2px ${v('focus')}` },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
            border: `1px solid ${v('border')}`,
            borderRadius: v('radius'),
            transition: `box-shadow ${v('dur')} ${v('ease')}, border-color ${v('dur')} ${v('ease')}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', boxShadow: 'none' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: v('radius-lg'),
            boxShadow: v('shadow-3'),
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: v('radius-sm'),
            border: `1px solid ${v('border')}`,
            boxShadow: v('shadow-2'),
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: v('radius-sm'),
            border: `1px solid ${v('border')}`,
            boxShadow: v('shadow-2'),
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: v('fs-xs') },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: v('radius-full'), fontWeight: 500 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: v('surface-2'),
            borderRadius: v('radius-sm'),
            '& .MuiOutlinedInput-notchedOutline': { borderColor: v('border') },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: v('primary') },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
        },
      },
    },
  });
}
