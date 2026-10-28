import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { AuthScreen } from './AuthScreen';

const EMAIL = 'ana@example.test';
const PASSWORD = 'Test-pass-1!';

describe('AuthScreen', () => {
  it('signing in calls login with the typed email and password', async () => {
    const login = vi.fn(async () => {});
    const { user } = renderWithProviders(<AuthScreen />, { context: { login } });
    await user.type(screen.getByLabelText(/^Email/), EMAIL);
    await user.type(screen.getByLabelText(/^Password/), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(login).toHaveBeenCalledWith(EMAIL, PASSWORD);
  });

  it('a failed sign-in shows the server message and keeps the form', async () => {
    const login = vi.fn(async () => {
      throw new Error('Invalid credentials');
    });
    const { user } = renderWithProviders(<AuthScreen />, { context: { login } });
    await user.type(screen.getByLabelText(/^Email/), EMAIL);
    await user.type(screen.getByLabelText(/^Password/), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByLabelText(/^Email/)).toHaveValue(EMAIL);
  });

  it('sign-up asks for a display name and registers with it', async () => {
    const register = vi.fn(async () => {});
    const { user } = renderWithProviders(<AuthScreen />, { context: { register } });
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await user.type(screen.getByLabelText(/^Display name/), 'Ana');
    await user.type(screen.getByLabelText(/^Email/), EMAIL);
    await user.type(screen.getByLabelText(/^Password/), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(register).toHaveBeenCalledWith(EMAIL, PASSWORD, 'Ana');
  });

  it('sign-up without a display name uses the part of the email before @', async () => {
    const register = vi.fn(async () => {});
    const { user } = renderWithProviders(<AuthScreen />, { context: { register } });
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await user.type(screen.getByLabelText(/^Email/), EMAIL);
    await user.type(screen.getByLabelText(/^Password/), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(register).toHaveBeenCalledWith(EMAIL, PASSWORD, 'ana');
  });
});
