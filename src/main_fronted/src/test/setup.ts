import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetFetchHandler, dispatchFetch } from './mockApi';

// openapi-fetch captures globalThis.fetch and Request when api/gateway.ts is first
// imported, and the clients use the relative base /bff. Install both before any test
// imports the gateway: a Request that accepts relative URLs, and a stable fetch that
// forwards to the swappable handler in mockApi.ts.
const NativeRequest = globalThis.Request;
class RelativeRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' && input.startsWith('/') ? new URL(input, 'http://localhost').href : input;
    super(url, init);
  }
}
globalThis.Request = RelativeRequest as typeof Request;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => dispatchFetch(input, init)) as typeof fetch;

afterEach(() => {
  cleanup();
  resetFetchHandler();
  localStorage.clear();
  sessionStorage.clear();
});
