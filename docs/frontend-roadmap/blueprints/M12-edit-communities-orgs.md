# M12 — Edit communities and organizations; roles (blocked on B12)

**Status: blocked.** Do not start until track B item **B12** is merged, the SDK has been
regenerated (`clients/typescript/generated`), and the gateway serves the new `PUT`
routes. Ground rule: no editing faked with delete + recreate. Recreating would change the
id and break every `post-feeds` and membership row that points at it.

**Goal:** this completes CRUD for communities and organizations. Create, read and delete
exist already (M5, M8); this milestone adds **update**, and roles for organizations.

All paths relative to `src/main_fronted/src/`. Depends on M10, M11 and B12.

## Backend facts (after B12)

| Endpoint | Body | Who may call (B12) |
|---|---|---|
| `PUT /api/groups/{id}` | `name, description, avatar, coverImage, privacyType, approvalRequired` | The community's owner (an `owner` row in `group-members`) |
| `PUT /api/organizations/{id}` | `name, description, logo` (`ownerId` and `verificationStatus` are **not** editable) | `ownerId` |
| `PUT /api/organization-members/{id}` | `role` (`member` ↔ `admin`; `owner` not allowed) | The organization's owner |

A `403` means the caller is not the owner. Show the server's message. Do not hide the
response behind a generic toast.

## 1. Edit dialogs

- One `EntityEditDialog` pattern (or two small dialogs) built on `ResponsiveDialog`,
  reusing the create forms' fields and limits (name ≤ 80, description ≤ 500,
  `MediaPicker` for avatar, cover and logo). It opens pre-filled. "Save" is disabled until
  something changes.
- Community: owner menu "Edit community". Privacy can change between public and private.
  `approvalRequired` is **not** shown, because join approval still needs B12's second part
  (see B12).
- Organization: owner menu "Edit organization". No verification field.
- After a 2xx, update the list and the detail view from the response body. Post links
  (`groupName` / `organizationName`) are refreshed by re-running the link enrichment on the
  loaded posts. On failure, the dialog stays open with the message.

## 2. Organization roles

- Members tab, owner only: a role menu on each non-owner row, "Make admin" or
  "Remove admin". It calls `PUT /api/organization-members/{id} { role }` and updates the
  row after a 2xx.
- M11's `canPost` already reads `admin`, so admins get the composer with no other change.

## 3. Tests

- The edit dialogs send `PUT` with only the editable fields, never `ownerId` or
  `verificationStatus`.
- A `403` keeps the dialog open with the server's text.
- After an edit, the community or organization name in the header, the list and the post
  links all show the new name.
- The role change is owner-only, and the owner row has no role menu.
- A promoted admin sees the organization composer.
- Live smoke: the owner renames the community and the org, and a second account sees the
  new names after a reload. B is made admin and can post in the org.

## Acceptance

- [ ] Owners can edit their communities and organizations. Ids, members and post links survive the edit.
- [ ] Organization owners can make members admins, and admins can post for the organization.
- [ ] Every new call goes through the regenerated typed clients.
- [ ] All tests pass; all gates green.
