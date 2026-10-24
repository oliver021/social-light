import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar, Box, Divider, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { LogOut, User } from 'lucide-react';
import { TAB_ID } from '../layout/tabs';

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
        <IconButton onClick={handleOpen} aria-label="Account menu" className="w-11 h-11 p-0 border-2 border-transparent hover:border-primary/50 rounded-full">
          <Avatar 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-8 h-8"
          />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            className: 'mt-2 border border-zinc-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950 p-1 shadow-2xl'
          }
        }}
      >
        <Box className="px-3 py-2">
          <Typography variant="body2" className="font-semibold text-zinc-850 dark:text-zinc-100">
            {currentUser.name}
          </Typography>
          <Typography variant="caption" className="font-mono text-zinc-600 dark:text-zinc-400 block text-xs">
            {currentUser.handle}
          </Typography>
        </Box>
        <Divider className="my-1" />
        <MenuItem onClick={() => { handleClose(); setActiveTab(TAB_ID.profile); }} className="gap-2 text-xs rounded-lg text-zinc-700 dark:text-zinc-300">
          <User className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" /> My profile
        </MenuItem>
        <MenuItem onClick={handleLogoutClick} className="gap-2 text-xs text-rose-600 rounded-lg dark:text-rose-400">
          <LogOut className="w-3.5 h-3.5" /> Log out
        </MenuItem>
      </Menu>
    </Box>
  );
};
