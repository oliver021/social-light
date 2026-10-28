import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, BottomNavigation, BottomNavigationAction, Divider, Drawer, Paper, Typography } from '@mui/material';
import { Zap } from 'lucide-react';
import { Navbar } from '../Navbar';
import { Sidebar } from '../Sidebar';
import { Widgets } from '../Widgets';
import { FeedsTab } from '../FeedsTab';
import { GroupsTab } from '../GroupsTab';
import { OrganizationsTab } from '../OrganizationsTab';
import { MarketplaceTab } from '../MarketplaceTab';
import { ReelsTab } from '../ReelsTab';
import { ProfileTab } from '../ProfileTab';
import { Messenger } from '../Messenger';
import { T, focusRingSx } from '../ui/tokens';
import { TABS, TAB_ID, tabDef } from './tabs';

// The logged-in page structure. Columns by width (CSS grid, not MUI Grid):
//   < 768            one column; the right rail (Widgets) sits below the main column
//   768-1199         240px rail + main; the rail holds Sidebar and Widgets
//   >= 1200, feed    264px rail | main (max 640px) | 320px right rail
//   >= 1200, wide    264px rail | main spanning main and right (no right rail)
// The rails are sticky from 768px up. Messenger stays mounted outside the grid.

const skipLinkSx = {
  position: 'absolute',
  left: 8,
  top: 8,
  zIndex: 1300,
  px: 2,
  py: 1,
  borderRadius: 'var(--ui-radius-sm)',
  bgcolor: T.surface,
  color: T.text,
  border: `1px solid ${T.border}`,
  fontWeight: 600,
  transform: 'translateY(-200%)',
  '&:focus': { transform: 'none' },
  ...focusRingSx,
} as const;

export const AppShell: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const wide = tabDef(activeTab).layout === 'wide';

  const renderTab = () => {
    switch (activeTab) {
      case TAB_ID.groups:
        return <GroupsTab />;
      case TAB_ID.organizations:
        return <OrganizationsTab />;
      case TAB_ID.marketplace:
        return <MarketplaceTab />;
      case TAB_ID.reels:
        return <ReelsTab />;
      case TAB_ID.profile:
        return <ProfileTab />;
      case TAB_ID.home:
      default:
        return <FeedsTab />;
    }
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100dvh', bgcolor: T.page, color: T.text, pb: { xs: 'calc(var(--ui-bottomnav-h) + env(safe-area-inset-bottom))', md: 0 }, transition: 'background-color 300ms' }}>
      <Box component="a" href="#main" sx={skipLinkSx}>
        Skip to content
      </Box>

      <Navbar onToggleMobileDrawer={() => setDrawerOpen((open) => !open)} />

      {/* Phone drawer: the same sidebar, opened from the navbar */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { md: 'none' } }}
        slotProps={{ paper: { sx: { width: 256, p: 2, bgcolor: T.surface, borderRight: `1px solid ${T.border}` } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
            <Box className="p-1 brand-gradient rounded-sm text-white shrink-0">
              <Zap aria-hidden="true" className="w-4 h-4 fill-current" strokeWidth={1.75} />
            </Box>
            <Typography variant="body2" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--ui-fs-sm)' }}>
              socialLight
            </Typography>
          </Box>
          <Divider />
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, lg: 3 }, py: { xs: 2, lg: 2.5 } }}>
        <Box
          sx={{
            display: 'grid',
            alignItems: 'start',
            gap: { xs: 'var(--ui-gap)', lg: 3 },
            gridTemplateColumns: {
              xs: 'minmax(0,1fr)',
              md: '240px minmax(0,1fr)',
              lg: wide ? '264px minmax(0,1fr)' : '264px minmax(0,640px) 320px',
            },
            gridTemplateAreas: {
              xs: '"main" "right"',
              md: '"left main"',
              lg: wide ? '"left main"' : '"left main right"',
            },
            justifyContent: { lg: 'center' },
          }}
        >
          {/* LEFT RAIL (tablet and up). On tablets the widgets sit under the sidebar. */}
          <Box
            component="aside"
            aria-label="Profile and menu"
            sx={{
              gridArea: 'left',
              display: { xs: 'none', md: 'block' },
              minWidth: 0,
              position: { xs: 'static', md: 'sticky' },
              top: 'calc(var(--ui-header-h) + 16px)',
              maxHeight: { md: 'calc(100dvh - var(--ui-header-h) - 32px)' },
              overflowY: { md: 'auto' },
            }}
          >
            <Sidebar />
            <Box sx={{ display: { xs: 'none', md: 'block', lg: 'none' }, mt: 2 }}>
              <Widgets />
            </Box>
          </Box>

          {/* MAIN COLUMN */}
          <Box
            component="main"
            id="main"
            tabIndex={-1}
            sx={{ gridArea: 'main', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap)', minHeight: '70dvh', outline: 'none' }}
          >
            {renderTab()}
          </Box>

          {/* RIGHT RAIL (phones, and desktop feed tabs). Tablets get the widgets in the left rail. */}
          <Box
            component="aside"
            aria-label="Suggestions and events"
            sx={{
              gridArea: 'right',
              minWidth: 0,
              display: { xs: 'block', md: 'none', lg: wide ? 'none' : 'block' },
              position: { xs: 'static', lg: 'sticky' },
              top: 'calc(var(--ui-header-h) + 16px)',
              maxHeight: { lg: 'calc(100dvh - var(--ui-header-h) - 32px)' },
              overflowY: { lg: 'auto' },
            }}
          >
            <Widgets />
          </Box>
        </Box>
      </Box>

      {/* BOTTOM NAVIGATION (phones only) */}
      <Paper
        elevation={4}
        component="nav"
        aria-label="Mobile navigation"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: { xs: 'block', md: 'none' },
          pb: 'env(safe-area-inset-bottom)',
          borderTop: `1px solid ${T.border}`,
          bgcolor: `color-mix(in srgb, ${T.surface} 95%, transparent)`,
        }}
      >
        <BottomNavigation
          value={activeTab}
          onChange={(_event, newValue) => setActiveTab(newValue)}
          showLabels
          sx={{
            bgcolor: 'transparent',
            height: 'var(--ui-bottomnav-h)',
            // MUI's own styles beat Tailwind utilities here, so the tabs are sized via sx.
            '& .MuiBottomNavigationAction-root': { minWidth: 0, maxWidth: 'none', px: 0.5, minHeight: 44 },
          }}
        >
          {TABS.filter((tab) => tab.inBottomNav).map((tab) => (
            <BottomNavigationAction
              key={tab.id}
              value={tab.id}
              label={<span className="text-xs font-medium">{tab.shortLabel}</span>}
              icon={<tab.icon aria-hidden="true" strokeWidth={1.75} className="w-5 h-5 text-muted" />}
            />
          ))}
        </BottomNavigation>
      </Paper>

      {/* FACEBOOK-STYLE CHAT MODULE (outside the grid) */}
      <Messenger />
    </Box>
  );
};
