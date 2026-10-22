import React, { useState } from 'react';
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
import { ThemeProvider, createTheme } from '@mui/material/styles';
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

  // Dynamic Material UI design theme customization
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#60a5fa' : '#2563eb', // blue-400 on dark (contrast), blue-600 on light
      },
      secondary: {
        main: '#7c3aed', // purple-600
      },
      background: {
        default: darkMode ? '#0a0a0a' : '#fafafa', // High Density pure black/charcoal
        paper: darkMode ? '#0f0f0f' : '#ffffff',   // High Density dark components
      },
      text: {
        primary: darkMode ? '#e0e0e0' : '#18181b', // High Density primary text
        secondary: darkMode ? '#9ca3af' : '#52525b', // High Density secondary text
      },
      divider: darkMode ? '#2a2a2a' : '#e4e4e7'
    },
    typography: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 }
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            transition: 'box-shadow 0.3s, border-color 0.3s',
            backgroundImage: 'none',
            boxShadow: 'none',
            borderColor: darkMode ? '#2a2a2a' : '#e5e7eb',
            '&:hover': {
              borderColor: darkMode ? '#3b82f6' : '#9ca3af',
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            fontWeight: 600,
            '&:hover': {
              boxShadow: 'none',
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none'
          }
        }
      }
    }
  });

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
              className: 'w-64 p-4 bg-zinc-55 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800'
            }
          }}
        >
          <Box className="flex flex-col gap-4">
            <Box className="flex items-center gap-2 mb-2 pr-2">
              <Box className="p-1 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded text-white shrink-0">
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
            {/* DESKTOP SIDEBAR COLUMN: 3 of 12 (HIDDEN ON TAB/MOB) */}
            <Grid size={{ xs: 0, md: 3 }} className="hidden md:block">
              <Sidebar />
            </Grid>

            {/* CENTRAL FEED COLUMN: 6 of 12 (stretch to 12 if mobile, 9 if tablet) */}
            <Grid size={{ xs: 12, sm: 8, md: 6 }}>
              <Box className="flex flex-col gap-4 min-h-[70dvh] min-w-0">
                {renderActiveGridTab()}
              </Box>
            </Grid>

            {/* RIGHT WIDGETS COLUMN: 3 of 12 (HI_COLLAPSE ON SMALL SCREEN) */}
            <Grid size={{ xs: 12, sm: 4, md: 3 }} className="space-y-4">
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
              label={<span className="text-xs font-medium scale-90">Home</span>}
              value="home" 
              icon={<Home className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />} 
            />
            <BottomNavigationAction 
              label={<span className="text-xs font-medium scale-90">Groups</span>} 
              value="groups" 
              icon={<Users2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />} 
            />
            <BottomNavigationAction 
              label={<span className="text-xs font-medium scale-90">Store</span>} 
              value="marketplace" 
              icon={<ShoppingBag className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />} 
            />
            <BottomNavigationAction
              label={<span className="text-xs font-medium scale-90">Reels</span>}
              value="reels"
              icon={<Clapperboard className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />}
            />
            <BottomNavigationAction
              label={<span className="text-xs font-medium scale-90">Profile</span>}
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
