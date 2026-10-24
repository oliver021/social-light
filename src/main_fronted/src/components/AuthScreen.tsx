import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { messageOf } from '../api/gateway';
import { Box, Typography, TextField, Button, Alert, CircularProgress, Divider } from '@mui/material';
import { Zap } from 'lucide-react';
import { Surface, T, mutedSx } from './ui';

// The login gate. Drives the real Identity flow: sign up (POST /api/account/register)
// and/or log in (POST /connect/token) through the same /bff proxy the rest of the SDK
// uses. On success the AppContext flips isAuthenticated and the app renders.
export const AuthScreen: React.FC = () => {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await register(email.trim(), password, displayName.trim() || email.split('@')[0]);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(messageOf(err, 'Something went wrong. Check the gateway is running.'));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setError(null);
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: T.page,
        color: T.text,
      }}
    >
      <Surface as="section" sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box className="p-1.5 brand-gradient rounded-sm text-on-primary flex items-center justify-center">
            <Zap size={20} strokeWidth={1.75} aria-hidden="true" className="fill-current" />
          </Box>
          <Typography
            component="h1"
            sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--ui-fs-2xl)', lineHeight: 1.2, color: T.text }}
          >
            socialLight
          </Typography>
        </Box>

        <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-base)', mb: 3 }}>
          {mode === 'signin' ? 'Sign in to your account.' : 'Create an account to get started.'}
        </Typography>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <TextField
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              size="small"
              fullWidth
              autoComplete="nickname"
            />
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            required
            fullWidth
            autoComplete="username"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            required
            fullWidth
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            helperText={mode === 'signup' ? 'Use an uppercase letter, a lowercase letter, a number and a symbol.' : undefined}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={busy}
            sx={{
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 'var(--ui-radius-sm)',
            }}
          >
            {busy ? (
              <>
                <CircularProgress size={18} color="inherit" aria-hidden="true" sx={{ mr: 1 }} />
                {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <Divider sx={{ my: 3 }} />

        <Typography sx={{ ...mutedSx, fontSize: 'var(--ui-fs-sm)', textAlign: 'center' }}>
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Button
            size="medium"
            onClick={switchMode}
            sx={{ minHeight: 44, px: 1, textTransform: 'none', fontWeight: 600, color: T.primary, verticalAlign: 'baseline' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </Button>
        </Typography>
      </Surface>
    </Box>
  );
};
