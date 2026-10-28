# M8 — Organizations

**Goal:** the Organizations module is routed by the gateway and present in the SDK
(`@sdk/organizations`), but the web never calls it. Add organization pages: browse,
create, join/leave, members.

All paths relative to `src/main_fronted/src/`. Depends on M2 (profiles, `openProfile`)
and the M0.3 primitives.

## Backend facts

| Resource | Body | Bound from JWT |
|---|---|---|
| `organizations` | `ownerId, name, description, logo, verificationStatus` | **none** (send my id as `ownerId`) |
| `organization-members` | `organizationId, userId, role` | **none** (send my id as `userId`) |

Neither is read-scoped. Because nothing is bound from the JWT, the client must only ever
send the signed-in user's id in `ownerId`/`userId` (ground rule 5); the reviewer checks
this. Track B item B7 adds `fromPrincipal` to both.

## 1. Client and hook

- `api/gateway.ts`: `export const organizationsApi = makeClient<OrganizationsPaths>();`
  (import `paths as OrganizationsPaths` from `@sdk/organizations`).
- `context/useOrganizations.ts`:
  - `loadOrganizations()`: `GET /api/organizations` + `GET /api/organization-members`
    in parallel; derive `memberCount`, `myMembership` per org.
  - `createOrganization({ name, description, logo })`: `POST /api/organizations`
    `{ ownerId: me, name, description: description || null, logo: logo || null, verificationStatus: 'unverified' }`,
    then `POST /api/organization-members` `{ organizationId, userId: me, role: 'owner' }`;
    on the second failing, keep the org and reject "The organization was created but you
    could not be added as its owner".
  - `joinOrganization(id)` → member row with `role: 'member'`; `leaveOrganization(id)` →
    `DELETE /api/organization-members/{myRowId}`; the owner cannot leave (button hidden;
    "Delete organization" instead, M1 pattern, `DELETE /api/organizations/{id}` with
    confirm, owner = `ownerId === me`).
  - `reset()` on logout.
- Expose through `AppContextType`.

## 2. Navigation and UI

- Add a tab `{ id: 'organizations', label: 'Organizations', shortLabel: 'Orgs', icon: Building2, layout: 'feed' }`
  to `TABS` (M0.3), placed after Communities, and `'organizations'` to the `ActiveTab`
  union in `context/useUiPreferences.ts` and to `AppShell`'s tab switch. The phone bottom nav keeps 5 items: put
  Organizations in the drawer/sidebar only (add `inBottomNav: false` to `TabDef`).
- `components/OrganizationsTab.tsx`:
  - `PageHeader` "Organizations" with a "Create organization" button.
  - List (`Surface` rows): logo (`UserAvatar` with the org name for the fallback),
    name, a "Verified" `StatusChip` (`tone="success"`) only when
    `verificationStatus === 'verified'`, member count, Join / Joined pill.
  - Search box filtering by name (client-side over the loaded list; the list endpoint
    returns everything, so this is honest).
  - Detail view (same tab, `selectedOrganizationId` state): header with logo, name,
    description, owner (`UserLine`, opens profile), members list with role chips,
    owner menu with "Delete organization".
  - Create dialog (`ResponsiveDialog`): name (required, ≤ 80), description (≤ 500),
    logo (`MediaPicker kind="image"`). No verification field (users cannot verify
    themselves).
- `PersonProfile` (M2): an "Organizations" line listing the orgs the person is a member
  of (from the loaded members), each opening the org.
- Skeletons, empty state ("No organizations yet" + Create), inline error with retry.

## 3. Tests

- Contracts for create (both requests, `ownerId`/`userId` equal the signed-in id,
  `verificationStatus: 'unverified'`), join, leave, delete.
- Second request failure on create → specific message, org kept in the list.
- Owner sees Delete and no Leave; a member sees Leave; others see Join.
- "Verified" chip only for `verified`.
- Tab registry: Organizations is in the sidebar and drawer, not in the bottom nav.
- No request ever carries another user's id in `ownerId`/`userId` (iterate over
  `calls` in the create/join tests).

Live smoke (`e2e-web/organizations.smoke.spec.ts`): create an org with a logo, a second
user joins it, both see 2 members.

## Acceptance

- [ ] Organizations can be created, browsed, joined, left and deleted by the owner.
- [ ] Only the signed-in user's id is ever sent in owner/user fields.
- [ ] All tests pass; all gates green. Human checkpoint 3 (final) is due after this milestone.
