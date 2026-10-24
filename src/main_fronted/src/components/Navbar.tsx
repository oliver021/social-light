import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Sun, Moon, Search, Zap, Menu as MenuIcon } from 'lucide-react';
import { SearchBox } from './navbar/SearchBox';
import { MessengerMenu } from './navbar/MessengerMenu';
import { NotificationsMenu } from './navbar/NotificationsMenu';
import { AccountMenu } from './navbar/AccountMenu';
import { navIconButtonSx } from './navbar/menuSx';
import { TAB_ID } from './layout/tabs';
import { T } from './ui/tokens';

interface NavbarProps {
  onToggleMobileDrawer: () => void;
}

/**
 * The top bar: logo, search, theme toggle, messenger, notifications and account. The bar is
 * sticky, a header-height strip with a 90% surface and a light blur.
 */
export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileDrawer }) => {
  const { darkMode, setDarkMode, setActiveTab } = useApp();
  // Phones: the search bar is hidden until the search icon is tapped (second row).
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      id="nexus-navbar"
      sx={{
        top: 0,
        minHeight: 'var(--ui-header-h)',
        bgcolor: `color-mix(in srgb, ${T.surface} 90%, transparent)`,
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${T.border}`,
        color: T.text,
        transition: `background-color var(--ui-dur) var(--ui-ease)`,
      }}
    >
      <Toolbar
        className="justify-between px-3 sm:px-4 flex-wrap sm:flex-nowrap gap-y-2"
        sx={{ minHeight: 'var(--ui-header-h)', '@media (min-width:600px)': { minHeight: 'var(--ui-header-h)' } }}
      >
        {/* LOGO */}
        <Box className="flex items-center gap-2 sm:gap-3 min-w-0">
          <IconButton
            aria-label="Open navigation menu"
            edge="start"
            onClick={onToggleMobileDrawer}
            sx={{
              ...navIconButtonSx,
              color: T.text,
              display: { xs: 'inline-flex', md: 'none' },
            }}
          >
            <MenuIcon size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>

          <Box
            role="button"
            tabIndex={0}
            aria-label="socialLight home"
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => setActiveTab(TAB_ID.home)}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab(TAB_ID.home); }}
          >
            <Box className="p-1.5 brand-gradient rounded-sm flex items-center justify-center text-on-primary shadow-2">
              <Zap size={20} strokeWidth={1.75} aria-hidden="true" className="fill-current animate-bounce" />
            </Box>
            <Typography variant="h6" className="hidden min-[480px]:block font-display font-bold text-transparent bg-clip-text brand-gradient tracking-tight leading-none text-xl whitespace-nowrap shrink-0">
              socialLight
            </Typography>
          </Box>
        </Box>

        {/* SEARCH BAR (HIDES ON MOBILE) WITH AUTOCOMPLETE */}
        <SearchBox mobileOpen={mobileSearchOpen} onCloseMobile={() => setMobileSearchOpen(false)} />

        {/* CONTROLS */}
        <Box className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* MOBILE SEARCH TOGGLE (desktop shows the search bar inline) */}
          <IconButton
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
            aria-expanded={mobileSearchOpen}
            sx={{ ...navIconButtonSx, display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <Search size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>

          {/* DARK TOGGLE */}
          <IconButton
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            sx={navIconButtonSx}
          >
            {darkMode ? (
              <Sun size={20} strokeWidth={1.75} aria-hidden="true" className="text-warning" />
            ) : (
              <Moon size={20} strokeWidth={1.75} aria-hidden="true" />
            )}
          </IconButton>

          <MessengerMenu />
          <NotificationsMenu />
          <AccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
