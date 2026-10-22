// SDK end-to-end proof: drives the locked acceptance journey — signup → login →
// profile edit → post → comment — but THROUGH the generated, typed SDK clients
// (openapi-fetch + the ./generated types), against the social-bff gateway.
//
// This proves the SDK is actually usable from a real client: the request bodies,
// paths and response shapes below are all type-checked against each service's
// committed OpenAPI spec. If an endpoint's contract drifts, `npm run typecheck`
// fails before this test even runs.
//
// Needs a running backend reachable at $SOCIALLIGHT_GATEWAY_URL (the gateway's
// external URL from the Aspire dashboard). When that env var is unset the suite is
// skipped, so `npm test` stays green in CI / on a dev box with no host up.
import { test } from "node:test";
import assert from "node:assert/strict";
import createClient from "openapi-fetch";
import type { paths as ProfilePaths } from "../generated/profile.ts";
import type { paths as PostsPaths } from "../generated/posts.ts";
import type { paths as EngagementPaths } from "../generated/engagement.ts";

const gateway = process.env.SOCIALLIGHT_GATEWAY_URL;

// Auth (Identity's /connect/token and /api/account/register) is not part of any
// module's OpenAPI doc, so it's driven with plain fetch — exactly how a real client
// bootstraps a session before switching to the typed SDK.
async function register(email: string, password: string, displayName: string): Promise<void> {
  const res = await fetch(`${gateway}/api/account/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  // 201 created, or 409 if a previous run already registered this user.
  assert.ok([200, 201, 409].includes(res.status), `register ${email}: ${res.status}`);
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${gateway}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "social-tests",
      client_secret: "secret",
      username: email,
      password,
      scope: "openid profile socialapi offline_access",
    }),
  });
  assert.equal(res.status, 200, `login ${email}`);
  const token = (await res.json()) as { access_token: string };
  return token.access_token;
}

// A typed client for one service, carrying a user's bearer token.
const clientFor = <P extends {}>(token: string) =>
  createClient<P>({ baseUrl: gateway!, headers: { Authorization: `Bearer ${token}` } });

test("SDK drives signup → login → profile → post → comment through the gateway", { skip: !gateway }, async () => {
  const ts = Date.now();
  const alice = { email: `alice.${ts}@social.test`, password: "Pass123$!", name: "Alice Anderson" };
  const bob = { email: `bob.${ts}@social.test`, password: "Pass123$!", name: "Bob Brown" };

  for (const u of [alice, bob]) await register(u.email, u.password, u.name);
  const aliceToken = await login(alice.email, alice.password);
  const bobToken = await login(bob.email, bob.password);

  // 1. Each user edits their profile (typed Profile SDK; owner bound from the JWT).
  for (const [u, token] of [[alice, aliceToken], [bob, bobToken]] as const) {
    const profile = clientFor<ProfilePaths>(token);
    const { response } = await profile.PUT("/api/profiles/me", {
      body: { displayName: u.name, bio: `Hi, I'm ${u.name}.`, avatarUrl: null, location: null, handle: null },
    });
    assert.equal(response.status, 200, "profile edit");
  }

  // 2. Alice creates a post (typed Posts SDK; authorId bound from her token).
  const alicePosts = clientFor<PostsPaths>(aliceToken);
  const created = await alicePosts.POST("/api/posts", {
    body: {
      contentType: "text", visibility: "public", status: "published", body: "Hello from the SDK!",
      location: null, scheduledAt: null, publishedAt: null, archivedAt: null,
    },
  });
  assert.equal(created.response.status, 201, "create post");
  const postId = (created.data as { id: string }).id;
  assert.ok(postId, "post id returned");

  // 3. Bob comments on Alice's post (typed Engagement SDK; polymorphic target).
  const bobEngagement = clientFor<EngagementPaths>(bobToken);
  const comment = await bobEngagement.POST("/api/comments", {
    body: { targetType: "Post", targetId: postId, parentCommentId: null, body: "Welcome, Alice!" },
  });
  assert.equal(comment.response.status, 201, "create comment");

  // 4. Read the post back through the typed GET (proves response typing too).
  const fetched = await alicePosts.GET("/api/posts/{id}", { params: { path: { id: postId } } });
  assert.equal(fetched.response.status, 200, "get post");
  assert.equal((fetched.data as { id: string }).id, postId);
});
