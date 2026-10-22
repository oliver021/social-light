import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Box, Paper, Typography, TextField, Button, Chip, Alert, CircularProgress, Divider } from '@mui/material';
import { Zap } from 'lucide-react';

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
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Check the gateway is running.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box className="min-h-[100dvh] flex items-center justify-center bg-zinc-950 p-4">
      <Paper
        elevation={0}
        className="w-full max-w-md p-6 sm:p-8 border border-zinc-800 rounded-2xl bg-zinc-900/60"
      >
        <Box className="flex items-center gap-2 mb-6">
          <Box className="p-1.5 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded text-white">
            <Zap className="w-5 h-5 fill-current" />
          </Box>
          <Typography variant="h5" className="font-display font-bold text-zinc-100">
            socialLight
          </Typography>
          <Chip label="live" size="small" color="success" className="ml-auto scale-90" />
        </Box>

        <Typography variant="body2" className="text-zinc-400 mb-6">
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

          {error && <Alert severity="error" className="text-xs">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-2.5 rounded-lg font-semibold"
          >
            {busy ? <CircularProgress size={20} color="inherit" /> : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <Divider className="my-5" />

        <Typography variant="caption" className="text-zinc-500 block text-center">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Button
            size="small"
            onClick={() => { setError(null); setMode(mode === 'signin' ? 'signup' : 'signin'); }}
            className="normal-case text-violet-400 font-semibold p-0 min-w-0 align-baseline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </Button>
        </Typography>
      </Paper>
    </Box>
  );
};
