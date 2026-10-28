import React, { useMemo } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthScreen } from './components/AuthScreen';
import { AppShell } from './components/layout/AppShell';

// MUI
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { buildTheme } from './components/ui/theme';

// Providers, the theme and the auth gate only. Layout lives in components/layout/AppShell.
const AppContent: React.FC = () => {
  const { darkMode, isAuthenticated } = useApp();

  // One MUI theme, built from the design tokens (components/ui/theme.ts).
  const theme = useMemo(() => buildTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isAuthenticated ? <AppShell /> : <AuthScreen />}
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
