import { describe, it, expect, vi, afterEach } from 'vitest';
import { describeApiError, mediaUrl, unMediaUrl, uploadMedia } from './gateway';

describe('describeApiError', () => {
  it('uses the ProblemDetails detail text after the fallback', () => {
    const msg = describeApiError({ detail: 'Comment is too long' }, new Response(null, { status: 400 }), 'Your comment was not posted');
    expect(msg).toBe('Your comment was not posted: Comment is too long');
  });

  it('joins validation error messages', () => {
    const msg = describeApiError(
      { errors: { Body: ['Body is required.', 'Body is too long.'] } },
      new Response(null, { status: 400 }),
      'Save failed',
    );
    expect(msg).toBe('Save failed: Body is required. Body is too long.');
  });

  it('falls back to the title when there is no detail', () => {
    expect(describeApiError({ title: 'Not allowed here' }, new Response(null, { status: 400 }), 'Save failed')).toBe(
      'Save failed: Not allowed here',
    );
  });

  it('tells a 401 or 403 to sign in again', () => {
    const msg = describeApiError(undefined, new Response(null, { status: 401 }), 'Save failed');
    expect(msg).toMatch(/^Save failed: your session does not allow this/);
    expect(msg).toContain('Sign in again');
  });

  it('reports a 500 as a server failure with the status', () => {
    expect(describeApiError(undefined, new Response(null, { status: 500 }), 'Save failed')).toBe(
      'Save failed: the server failed (HTTP 500). Try again in a moment.',
    );
  });

  it('reports a missing response as a network error and is never empty', () => {
    const msg = describeApiError(undefined, undefined, 'Save failed');
    expect(msg).toContain('network error');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('media URLs', () => {
  it('prefixes root-relative blob paths with /bff and round-trips back', () => {
    expect(mediaUrl('/blobs/abc.png')).toBe('/bff/blobs/abc.png');
    expect(unMediaUrl(mediaUrl('/blobs/abc.png'))).toBe('/blobs/abc.png');
  });

  it('passes absolute, data and blob URLs through untouched', () => {
    expect(mediaUrl('https://images.example.test/a.jpg')).toBe('https://images.example.test/a.jpg');
    expect(mediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(mediaUrl(null)).toBeUndefined();
    expect(unMediaUrl(undefined)).toBeNull();
  });
});

describe('uploadMedia validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects an unsupported file type before any request', async () => {
    const xhr = vi.fn();
    vi.stubGlobal('XMLHttpRequest', xhr);
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await expect(uploadMedia(file)).rejects.toThrow('Unsupported file type');
    expect(xhr).not.toHaveBeenCalled();
  });

  it('rejects an image over 10 MB before any request', async () => {
    const xhr = vi.fn();
    vi.stubGlobal('XMLHttpRequest', xhr);
    const file = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 });
    await expect(uploadMedia(file)).rejects.toThrow('Images must be 10 MB or smaller.');
    expect(xhr).not.toHaveBeenCalled();
  });
});
