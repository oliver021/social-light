import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Sun, Moon, Search, Zap, Menu as MenuIcon } from 'lucide-react';
import { SearchBox } from './navbar/SearchBox';
import { MessengerMenu } from './navbar/MessengerMenu';
import { NotificationsMenu } from './navbar/NotificationsMenu';
import { AccountMenu } from './navbar/AccountMenu';
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
        transition: 'background-color 350ms',
      }}
    >
      <Toolbar
        className="justify-between px-3 sm:px-4 flex-wrap sm:flex-nowrap gap-y-2"
        sx={{ minHeight: 'var(--ui-header-h)', '@media (min-width:600px)': { minHeight: 'var(--ui-header-h)' } }}
      >
        {/* LOGO */}
        <Box className="flex items-center gap-2 sm:gap-3 min-w-0">
          <IconButton
            color="inherit"
            aria-label="Open navigation menu"
            edge="start"
            onClick={onToggleMobileDrawer}
            className="md:hidden w-11 h-11 p-0"
          >
            <MenuIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </IconButton>

          <Box
            role="button"
            tabIndex={0}
            aria-label="socialLight home"
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => setActiveTab(TAB_ID.home)}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab(TAB_ID.home); }}
          >
            <Box className="p-1.5 brand-gradient rounded-xl flex items-center justify-center text-white shadow-lg">
              <Zap className="w-5 h-5 fill-current animate-bounce" />
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
            color="inherit"
            aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
            aria-expanded={mobileSearchOpen}
            className="sm:hidden w-11 h-11 p-0 text-zinc-600 dark:text-zinc-400"
          >
            <Search className="w-5 h-5" />
          </IconButton>

          {/* DARK TOGGLE */}
          <IconButton
            onClick={() => setDarkMode(!darkMode)}
            color="inherit"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-zinc-600 dark:text-zinc-400 w-11 h-11 p-0"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-600" />}
          </IconButton>

          <MessengerMenu />
          <NotificationsMenu />
          <AccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
