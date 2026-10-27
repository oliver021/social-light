# M11 — Organizations: a posts feed

**Goal:** an organization page (M8) shows a header and members only. Give it a **Posts**
tab with a composer for the people who speak for the organization. Show its posts on Home
with a link to it, as community posts link to their community. The owner can also remove
a member.

All paths relative to `src/main_fronted/src/`. Depends on M9 (and M8).

## Backend facts

| Resource | Body | Bound from JWT | Notes |
|---|---|---|---|
| `organizations` | `ownerId, name, description, logo, verificationStatus` | none (B7) | Owner = `ownerId` |
| `organization-members` | `organizationId, userId, role` | none (B7) | `role` is a free string: `owner`, `member`, and from M12 `admin` |
| `post-feeds` | `postId, feedType, targetId` | none | **New value `feedType: 'organization'`**, `targetId` = organization id. No backend change needed: the field is a free string |

A post is always written by a person (`Post.authorId` is bound from the JWT). Posting
**as** the organization (its name and logo as the author) needs a backend author type and
is out of scope. See the README. The organization post shows "{person} › {organization}",
the same shape as a community post.

Same authorization gap as M10. The server checks neither who links a post to an
organization (B13) nor who deletes a membership (B3).

## 1. Who may post

- `canPost(org)` = I am the owner, **or** my membership role is `admin`. Members do not
  post. An organization page is the organization's voice, not a forum.
- Until M12, nobody can be made `admin`, so in practice only the owner posts. The code
  reads the role anyway, so M12 only has to add the role control.

## 2. Hook

`context/useOrganizations.ts` gets `feed` deps like `useGroups`:
`{ createPostIn, setOrganizationFeed, deletePost }`.

- `loadOrganizationPosts(orgId)`: list `post-feeds` rows with `feedType: 'organization'`
  and this `targetId`, plus `posts`. Resolve the authors through Profile, newest first.
  This mirrors `loadGroupPosts`. Add a `{ list: 'organization'; organizationId; seq }`
  target to `useFeed`'s enrichment so reactions and comment counts are filled in.
- `createOrganizationPost(orgId, content, type, extra)`: refuse locally when
  `!canPost(org)`. Otherwise call `createPostIn({ kind: 'organization', id, name }, …)`,
  then `loadOrganizationPosts(orgId)`.
- `removePostFromOrganization(orgId, postId)`: owner only, deletes the matching
  `post-feeds` rows. Same as M10.
- `removeOrganizationMember(orgId, rowId)`: owner only, never the owner row.
- `deleteOrganization` also deletes the org's `post-feeds` rows, best-effort, so posts
  stop linking to an organization that is gone. The posts themselves stay with their authors.

## 3. Links on posts

- `types.ts` `Post`: add `organizationId?: string; organizationName?: string`.
- `context/feedEnrichment.ts`: extend `enrichGroupLinks` into `enrichTargetLinks`. It reads
  `post-feeds` **once**, then resolves `group` rows through `groupsApi` and `organization`
  rows through `organizationsApi`. Only call an API when there are rows of that kind.
- `PostHeader`: "› {organizationName}" button (`aria-label="Open organization {name}"`),
  which opens the Organizations tab on that org (`selectedOrganizationId`). This is the same
  pattern as the community link.

## 4. UI

- `OrganizationsTab` detail view: `Tabs` "Posts" / "Members", with the same markup as the
  community page (M5). Posts is the default tab.
- Posts tab: `PostComposer` when `canPost` (`label="Post as part of {name}"`), then the list
  (skeleton, then empty state "No posts from {name} yet", then `PostCard`s). Owner menu:
  "Remove from organization" (confirm, as in M10).
- Members tab: the existing list. The owner gets "Remove {name}" on non-owner rows.

## 5. Tests

- A member (role `member`) sees no composer. The owner does, and so does an `admin` row in
  the fixture.
- Posting sends `post-feeds { feedType: 'organization', targetId: orgId }`. Never `'group'`.
- `enrichTargetLinks` with a mix of group and organization rows sets each post's link.
  With no organization rows, it does not call `organizationsApi`.
- `PostHeader` shows the organization link and opens the org.
- Deleting an org deletes its `post-feeds` rows, and a failure there does not fail the delete.
- Remove member and remove post: owner only, and the list changes only after a 2xx.
- Live smoke: extend `e2e-web/organizations.smoke.spec.ts`. The owner posts in the org.
  B (a member) sees the post in the org Posts tab, sees no composer, and on B's Home the
  post shows "› {org}". That holds if B follows the owner; otherwise check it on the
  owner's profile.

## Acceptance

- [ ] An organization has a Posts tab. The owner (and admins, after M12) can post there with the full composer.
- [ ] Organization posts link to the organization from Home, profiles and the post itself.
- [ ] The owner can remove a post from the organization and remove a member.
- [ ] Deleting an organization leaves no `post-feeds` rows pointing at it (best-effort).
- [ ] All tests pass; all gates green. **Human checkpoint 4** is due after this milestone.
