// Test double for the BFF. The typed clients (openapi-fetch) call `fetch` through the
// trampoline installed in setup.ts; every call lands in `dispatchFetch`, which matches it
// against the routes registered by `mockApi`, records it, and answers with a Response.
// Unmatched requests answer 500 and are recorded, so a test can assert on them.

export interface RecordedCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

export type RouteReply = unknown | { status: number; body?: unknown };

interface Route {
  method: string;
  pattern: RegExp;
  reply: RouteReply | ((call: RecordedCall) => RouteReply);
}

let routes: Route[] = [];
let calls: RecordedCall[] = [];

const BFF_PREFIX = '/bff';

function compile(key: string): { method: string; pattern: RegExp } {
  const space = key.indexOf(' ');
  const method = key.slice(0, space).toUpperCase();
  const rawPath = key.slice(space + 1);
  const escaped = rawPath
    .split(/(\{[^}]+\})/)
    .map((part) => (/^\{[^}]+\}$/.test(part) ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return { method, pattern: new RegExp(`^${escaped}$`) };
}

function isStatusReply(reply: unknown): reply is { status: number; body?: unknown } {
  if (!reply || typeof reply !== 'object' || Array.isArray(reply)) return false;
  const keys = Object.keys(reply);
  return typeof (reply as { status?: unknown }).status === 'number' && keys.every((k) => k === 'status' || k === 'body');
}

/**
 * Register the routes for one test. Keys are `"METHOD /api/..."` (the `/bff` prefix is
 * stripped before matching); a `{param}` segment matches any value.
 */
export function mockApi(
  definitions: Record<string, RouteReply | ((call: RecordedCall) => RouteReply)>,
): { calls: RecordedCall[] } {
  routes = Object.entries(definitions).map(([key, reply]) => ({ ...compile(key), reply }));
  calls = [];
  return { calls };
}

function jsonResponse(status: number, body: unknown): Response {
  if (status === 204 || status === 304) return new Response(null, { status });
  if (body === undefined) return new Response(null, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readBody(req: Request): Promise<unknown> {
  if (!req.body) return undefined;
  const text = await req.text();
  if (!text) return undefined;
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

/** The function installed as `globalThis.fetch` for the whole test run. */
export async function dispatchFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const req = input instanceof Request ? input : new Request(input as string, init);
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  let path = url.pathname;
  if (path.startsWith(BFF_PREFIX)) path = path.slice(BFF_PREFIX.length);
  const call: RecordedCall = {
    method,
    path,
    query: new URLSearchParams(url.search),
    body: await readBody(req),
  };
  calls.push(call);

  const route = routes.find((r) => r.method === method && r.pattern.test(path));
  if (!route) {
    return jsonResponse(500, { title: `unmocked ${method} ${path}` });
  }
  const reply = typeof route.reply === 'function' ? route.reply(call) : route.reply;
  if (isStatusReply(reply)) return jsonResponse(reply.status, reply.body);
  return jsonResponse(200, reply);
}

/** Forget every route and recorded call. Runs after each test (setup.ts). */
export function resetFetchHandler(): void {
  routes = [];
  calls = [];
}
