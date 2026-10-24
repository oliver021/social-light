// Typed gateway clients (openapi-fetch + the generated SDK types). All requests go
// to the same-origin /bff prefix, which server.ts proxies to the social-bff gateway,
// so the browser needs no CORS. A bearer token (set after login) is attached per request.
import createClient, { type Middleware } from 'openapi-fetch';
import type { paths as PostsPaths } from '@sdk/posts';
import type { paths as ProfilePaths, components as ProfileComponents } from '@sdk/profile';
import type { paths as EngagementPaths } from '@sdk/engagement';
import type { paths as FeedPaths } from '@sdk/feed';
import type { paths as ChatPaths } from '@sdk/chat';
import type { paths as SocialGraphPaths } from '@sdk/social-graph';
import type { paths as GroupsPaths } from '@sdk/groups';
import type { paths as NotificationsPaths } from '@sdk/notifications';
import type { paths as StoriesPaths } from '@sdk/stories';
import type { paths as ReelsPaths } from '@sdk/reels';
import type { paths as EventsPaths } from '@sdk/events';
import type { paths as CatalogPaths } from '@sdk/catalog';

const BFF_BASE = '/bff';
const TOKEN_KEY = 'sl_access_token';

let accessToken: string | null =
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof sessionStorage === 'undefined') return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * A readable message for a failed call. Prefers the server's own ProblemDetails text
 * (`detail`, validation `errors`, or `title`); otherwise falls back to a status-based
 * sentence. Never returns an empty string, so callers can show it as-is.
 */
export function describeApiError(error: unknown, response: Response | undefined, fallback: string): string {
  const body = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  let detail = '';
  if (body) {
    if (typeof body.detail === 'string') detail = body.detail;
    else if (body.errors && typeof body.errors === 'object') {
      detail = Object.values(body.errors as Record<string, unknown>)
        .flat()
        .filter((m): m is string => typeof m === 'string')
        .join(' ');
    } else if (typeof body.title === 'string') detail = body.title;
  }
  if (detail) return `${fallback}: ${detail}`;
  const status = response?.status;
  if (status === 401 || status === 403) return `${fallback}: your session does not allow this. Sign in again and retry.`;
  if (status && status >= 500) return `${fallback}: the server failed (HTTP ${status}). Try again in a moment.`;
  if (status) return `${fallback} (HTTP ${status}).`;
  return `${fallback}: network error. Check your connection and try again.`;
}

/**
 * Readable message from any thrown value. A fetch that never got a response surfaces as a
 * TypeError ("Failed to fetch"), which is reported as a network problem instead.
 */
export function messageOf(err: unknown, fallback: string): string {
  if (err instanceof TypeError) return `${fallback}: network error. Check your connection and try again.`;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

/**
 * Resolve a backend media URL for the browser. The media host serves content-addressed
 * blobs at root-relative paths (`/blobs/…`) and the gateway routes them, so — like every
 * API call — they must travel through the same-origin `/bff` proxy. Absolute URLs
 * (external avatars, Unsplash ads, data URIs) are passed through untouched.
 */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  // Idempotent: a url already prefixed with /bff (what the stores hold) is returned as is.
  if (url.startsWith(`${BFF_BASE}/`)) return url;
  return `${BFF_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Strip the `/bff` display prefix so a media URL round-trips back to the backend unchanged. */
export function unMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith(BFF_BASE) ? url.slice(BFF_BASE.length) : url;
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

/**
 * Upload a file to the media service (through the /bff proxy). Validates type and size
 * client-side first. Resolves to the root-relative url (`/blobs/<sha256>.<ext>`) that the
 * backend stores; use `mediaUrl()` to display it.
 *
 * Uses XMLHttpRequest so that `onProgress` reports real bytes-sent progress (fetch has no
 * upload progress events). `onProgress` receives a percentage from 0 to 100.
 */
export function uploadMedia(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const isImage = IMAGE_MIME_TYPES.includes(file.type);
  const isVideo = VIDEO_MIME_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return Promise.reject(new Error('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4 or WebM.'));
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) return Promise.reject(new Error('Images must be 10 MB or smaller.'));
  if (isVideo && file.size > MAX_VIDEO_BYTES) return Promise.reject(new Error('Videos must be 25 MB or smaller.'));

  const form = new FormData();
  form.append('file', file);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BFF_BASE}/api/v1/media`);
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed (HTTP ${xhr.status}). Please try again.`));
        return;
      }
      let data: { url?: unknown; Url?: unknown } | null = null;
      try {
        data = JSON.parse(xhr.responseText) as { url?: unknown; Url?: unknown };
      } catch {
        data = null;
      }
      const url = data?.url ?? data?.Url;
      if (typeof url !== 'string' || url.length === 0) {
        reject(new Error('Upload finished but the server returned no file address.'));
        return;
      }
      onProgress?.(100);
      resolve(url);
    };
    xhr.send(form);
  });
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
    return request;
  },
};

function makeClient<T extends {}>() {
  const client = createClient<T>({ baseUrl: BFF_BASE });
  client.use(authMiddleware);
  return client;
}

export const postsApi = makeClient<PostsPaths>();
export const profileApi = makeClient<ProfilePaths>();
export const engagementApi = makeClient<EngagementPaths>();
export const feedApi = makeClient<FeedPaths>();
export const chatApi = makeClient<ChatPaths>();
export const storiesApi = makeClient<StoriesPaths>();
export const reelsApi = makeClient<ReelsPaths>();
export const eventsApi = makeClient<EventsPaths>();

// The SignalR chat hub lives behind the same /bff origin (server.ts proxies the
// WebSocket upgrade). Realtime code reads the current token from here.
export const CHAT_HUB_URL = `${BFF_BASE}/hubs/chat`;
export const socialGraphApi = makeClient<SocialGraphPaths>();
export const groupsApi = makeClient<GroupsPaths>();
export const notificationsApi = makeClient<NotificationsPaths>();
// Marketplace module (eShop Catalog). Browsing is public (anonymous), so an <img src>
// can hit the picture endpoint through the same /bff origin without a bearer token.
export const catalogApi = makeClient<CatalogPaths>();
export function catalogPicUrl(id: number | string): string {
  return `${BFF_BASE}/api/catalog/items/${id}/pic?api-version=1.0`;
}

// Per-session cache of resolved profiles, keyed by userId. The engagement DTOs carry
// only authorId/userId, so comment/reaction authors are resolved through Profile; this
// dedupes the lookups across a feed render. Cleared on logout via clearProfileCache().
type ProfileDto = ProfileComponents['schemas']['ProfileDto'];
const profileCache = new Map<string, ProfileDto>();

export async function getProfile(userId: string): Promise<ProfileDto | null> {
  if (!userId) return null;
  const cached = profileCache.get(userId);
  if (cached) return cached;
  const { data } = await profileApi.GET('/api/profiles/{userId}', {
    params: { path: { userId } },
  });
  if (data) profileCache.set(userId, data);
  return data ?? null;
}

export function clearProfileCache(): void {
  profileCache.clear();
}
