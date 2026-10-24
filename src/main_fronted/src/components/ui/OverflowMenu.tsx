import React, { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { T } from './tokens';

export interface OverflowItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

export interface OverflowMenuProps {
  /** Accessible name of the kebab button, e.g. "More actions for this post". */
  label: string;
  items: OverflowItem[];
}

/** The "..." menu for per-item actions. Renders nothing when every item is hidden. */
export const OverflowMenu: React.FC<OverflowMenuProps> = ({ label, items }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  const handleSelect = (item: OverflowItem) => {
    setAnchor(null);
    item.onSelect();
  };

  return (
    <>
      <IconButton
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ width: 44, height: 44, color: T.muted }}
      >
        <MoreHorizontal aria-hidden="true" className="w-5 h-5" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <MenuItem
              key={item.id}
              onClick={() => handleSelect(item)}
              sx={{ minHeight: 44, color: item.danger ? T.danger : T.text, gap: 1 }}
            >
              {Icon && (
                <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                  <Icon aria-hidden="true" className="w-4 h-4" />
                </ListItemIcon>
              )}
              <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.8125rem' } } }} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
