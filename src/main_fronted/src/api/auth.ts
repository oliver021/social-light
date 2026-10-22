// Auth helpers. Identity's token + signup endpoints are NOT part of any module's
// OpenAPI doc, so they're called with plain fetch through the same /bff proxy.
const BFF_BASE = '/bff';

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BFF_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'social-tests',
      client_secret: 'secret',
      username: email,
      password,
      scope: 'openid profile socialapi offline_access',
    }),
  });
  if (!res.ok) {
    let desc = '';
    try { desc = (await res.json())?.error_description ?? ''; } catch { /* non-JSON body */ }
    throw new Error(res.status === 400 ? 'Invalid email or password. Sign in with your email address.' : (desc || `Login failed (${res.status})`));
  }
  const token = (await res.json()) as TokenResponse;
  return token.access_token;
}

export async function register(email: string, password: string, displayName: string): Promise<void> {
  const res = await fetch(`${BFF_BASE}/api/account/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  // 201 created, or 409 if the user already exists — both are fine to proceed to login.
  if (!res.ok && res.status !== 409) {
    let detail = '';
    try {
      const body = await res.json();
      const msgs = body?.errors ? (Object.values(body.errors) as string[][]).flat() : [];
      detail = msgs.length ? msgs.join(' ') : (body?.title ?? '');
    } catch { /* non-JSON error body */ }
    throw new Error(detail || `Registration failed (${res.status})`);
  }
}
