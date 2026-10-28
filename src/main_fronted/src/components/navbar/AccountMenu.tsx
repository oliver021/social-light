import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Divider, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { LogOut, User } from 'lucide-react';
import { TAB_ID } from '../layout/tabs';
import { T, UserAvatar } from '../ui';
import { menuRowSx, popoverPaperSx } from './menuSx';

/** The avatar shortcut and its account menu (My profile, Log out). */
export const AccountMenu: React.FC = () => {
  const { currentUser, isAuthenticated, logout, setActiveTab } = useApp();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleClose();
    logout();
  };

  if (!isAuthenticated) return null;

  return (
    <Box>
      <Tooltip title="Account">
        <IconButton
          onClick={handleOpen}
          aria-label="Account menu"
          sx={{
            width: 44,
            height: 44,
            p: 0,
            border: '2px solid transparent',
            borderRadius: 'var(--ui-radius-full)',
            '&:hover': { borderColor: `color-mix(in srgb, ${T.primary} 50%, transparent)` },
            '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
          }}
        >
          <UserAvatar name={currentUser.name} src={currentUser.avatar} size="sm" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { ...popoverPaperSx, width: 240 } } }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography sx={{ fontSize: 'var(--ui-fs-sm)', fontWeight: 600, color: T.text }}>{currentUser.name}</Typography>
          <Typography sx={{ fontSize: 'var(--ui-fs-xs)', color: T.subtle, fontFamily: 'var(--font-mono)' }}>
            {currentUser.handle}
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            handleClose();
            setActiveTab(TAB_ID.profile);
          }}
          sx={{ ...menuRowSx, color: T.text }}
        >
          <User size={18} strokeWidth={1.75} aria-hidden="true" />
          My profile
        </MenuItem>
        <MenuItem onClick={handleLogoutClick} sx={{ ...menuRowSx, color: T.danger }}>
          <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
          Log out
        </MenuItem>
      </Menu>
    </Box>
  );
};
