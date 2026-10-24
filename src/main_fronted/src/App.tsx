import React, { useMemo, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Widgets } from './components/Widgets';
import { FeedsTab } from './components/FeedsTab';
import { GroupsTab } from './components/GroupsTab';
import { MarketplaceTab } from './components/MarketplaceTab';
import { ReelsTab } from './components/ReelsTab';
import { ProfileTab } from './components/ProfileTab';
import { Messenger } from './components/Messenger';
import { AuthScreen } from './components/AuthScreen';

// MUI components
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from './components/ui/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { 
  Box, 
  Container, 
  Grid, 
  Drawer, 
  BottomNavigation, 
  BottomNavigationAction, 
  Paper,
  Typography,
  Divider
} from '@mui/material';
import { 
  Home, 
  Users2, 
  ShoppingBag, 
  Clapperboard,
  User,
  Sparkles,
  Zap
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { darkMode, activeTab, setActiveTab, isAuthenticated } = useApp();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // One MUI theme, built from the design tokens (components/ui/theme.ts).
  const theme = useMemo(() => buildTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const handleToggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  // Login gate: until there's a valid session, show the auth screen (themed).
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthScreen />
      </ThemeProvider>
    );
  }

  const renderActiveGridTab = () => {
    switch (activeTab) {
      case 'home':
        return <FeedsTab />;
      case 'groups':
        return <GroupsTab />;
      case 'marketplace':
        return <MarketplaceTab />;
      case 'reels':
        return <ReelsTab />;
      case 'profile':
        return <ProfileTab />;
      default:
        return <FeedsTab />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950/60 pb-16 md:pb-0 transition-colors duration-300">
        
        {/* TOP INTERACTIVE CORES DATABASE NAVBAR */}
        <Navbar onToggleMobileDrawer={handleToggleMobileDrawer} />

        {/* RESPONSIVE DESKTOP DRAWERS */}
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          className="md:hidden"
          slotProps={{
            paper: {
              className: 'w-64 p-4 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800'
            }
          }}
        >
          <Box className="flex flex-col gap-4">
            <Box className="flex items-center gap-2 mb-2 pr-2">
              <Box className="p-1 brand-gradient rounded text-white shrink-0">
                <Zap className="w-4 h-4 fill-current" />
              </Box>
              <Typography variant="body2" className="font-display font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-[13px]">
                socialLight
              </Typography>
            </Box>

            <Divider />

            {/* SIDEBAR NAVIGATION ITEMS REPLICATOR FOR DRAWER */}
            <Sidebar />
          </Box>
        </Drawer>

        {/* CORE GRID WRAPPER */}
        <Container maxWidth="lg" className="py-5" id="major-contentgrid-system">
          <Grid container spacing={3}>
            {/* LEFT COLUMN (tablet and up): profile + menu. On tablets the widgets sit under it,
                because there is no room for a third column between 768 and 1200 px. */}
            <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Sidebar />
              <Box sx={{ display: { xs: 'none', md: 'block', lg: 'none' }, mt: 2 }}>
                <Widgets />
              </Box>
            </Grid>

            {/* CENTRAL FEED COLUMN */}
            <Grid size={{ xs: 12, md: 8, lg: 6 }}>
              <Box className="flex flex-col gap-4 min-h-[70dvh] min-w-0">
                {renderActiveGridTab()}
              </Box>
            </Grid>

            {/* RIGHT WIDGETS COLUMN (phones and desktop; tablets get the copy in the left column) */}
            <Grid size={{ xs: 12, lg: 3 }} sx={{ display: { xs: 'block', md: 'none', lg: 'block' } }} className="space-y-4">
              <Widgets />
            </Grid>
          </Grid>
        </Container>

        {/* BOTTOM NAVIGATION REPLICATOR FOR MOBILE SCREENS */}
        <Paper 
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} 
          elevation={4} 
          className="md:hidden border-t border-zinc-200 dark:border-zinc-850 z-40 bg-white/95 dark:bg-zinc-950/95"
        >
          <BottomNavigation
            value={activeTab}
            onChange={(event, newValue) => {
              setActiveTab(newValue);
            }}
            showLabels
            className="bg-transparent h-14"
            sx={{
              // MUI's own styles beat Tailwind utilities here, so the 5 tabs are sized via sx.
              '& .MuiBottomNavigationAction-root': { minWidth: 0, maxWidth: 'none', px: 0.5, minHeight: 44 },
            }}
          >
            <BottomNavigationAction 
              label={<span className="text-xs font-medium">Home</span>}
              value="home"
              icon={<Home className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />}
            />
            <BottomNavigationAction
              label={<span className="text-xs font-medium">Groups</span>}
              value="groups"
              icon={<Users2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />}
            />
            <BottomNavigationAction
              label={<span className="text-xs font-medium">Market</span>}
              value="marketplace"
              icon={<ShoppingBag className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />}
            />
            <BottomNavigationAction
              label={<span className="text-xs font-medium">Reels</span>}
              value="reels"
              icon={<Clapperboard className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />}
            />
            <BottomNavigationAction
              label={<span className="text-xs font-medium">Profile</span>}
              value="profile"
              icon={<User className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />} 
            />
          </BottomNavigation>
        </Paper>

        {/* FACEBOOK CHAT MODULE */}
        <Messenger />

      </Box>
    </ThemeProvider>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
