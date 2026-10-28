# Track B — Backend work the frontend is waiting for

**Not executed by the Haiku workflow.** These items change generated modules, the
generator, or the gateway. Per CLAUDE.md §0/§7 they are made **in the specs and
templates of `code-engine`** and regenerated, never by hand-editing generated
(category 1) files. Do them in a separate branch, with a stronger model or a human,
and regenerate the TypeScript SDK afterwards (`clients/typescript`, which reads the
live OpenAPI documents listed in `services.json`, so the stack must be running).

Each item lists the frontend milestone it unblocks.

| # | Item | Where | Unblocks |
|---|---|---|---|
| **B1** | Route the six hidden modules through the gateway and add them to the SDK | `SocialLight.AppHost/Program.cs` (`yarp.AddRoute` per resource), `clients/typescript/services.json` | Moderation "Report", Recommendation "Trending / People you may know", Threads, Pages, Jobs, Gaming UIs (future milestones M9+) |
| **B2** | `PUT /{id}` for editable entities (`Post.body`, `Comment.body`, `Message.content` + `editedAt`, `Group`, `Event`, `Profile` already has it) | `code-engine` canonical-module templates: an `editable` field flag in the module spec grammar | Editing posts/comments/messages |
| **B3** | **Ownership check on `DELETE`** (and on B2's `PUT`): only the `fromPrincipal` owner may delete; for `Friend`, both `requesterId` and `recipientId` count as owners (M4 decline). Return `403` otherwise | templates: the delete handler compares the row's owner field with the principal | Makes M1 safe; today any signed-in user can delete any row by id |
| **B4** | Enforce post `visibility` in Feed.API (`public` / `followers` / `only_me`) | `src/Feed.API/Application/FeedService.cs` (hand-written composition service) | Visibility selector in the composer |
| **B5** | Author-readable views: `readScope` on `StoryView`/`ReelView` that also admits the story's/reel's author (needs a `via` lookup to `Story.authorId`), or count endpoints | `stories.module.json`, `reels.module.json` + generator support for an owner-of-parent scope | "Seen by" on stories, view counts on reels |
| **B6** | Event consumers that clean up across modules: `PostDeleted` → Engagement deletes comments/reactions/shares of that post; `UserDeleted` everywhere (already declared in `consumes`) | module specs `publishes`/`consumes` + handler templates | Orphan cleanup after M1 deletes |
| **B7** | `fromPrincipal` on `Organization.ownerId` and `OrganizationMember.userId` | `organizations.module.json` | Removes M8's reliance on the client sending its own id |
| **B8** | Per-target query filters on list endpoints (`?targetType=&targetId=`, `?chatId=`, `?postId=`, `?userId=`) and paging (`?take=&skip=`) | templates: optional filter parameters from a `filterable` field flag | Replaces every "fetch all, filter in the browser" call (feed enrichment, chat history, members) |
| **B9** | Timestamps: `createdAt` on `Comment`, `Notification`, `Message`, `Share`, `ChatParticipant` | module specs (server-set field) | Real times instead of "recently" |
| **B10** | Server-side notifications: consumers of `CommentAdded`, `ReactionAdded`, `UserFollowed`, friend/story events create `Notification` rows; a `PATCH /api/notifications/{id}/read` (or B2 `PUT`) for read state | Notifications module spec + handlers | Removes the client-side `notify()` producer; real "mark as read" |
| **B11** | Hub events for receipts, reactions and pins (`ReceiveReceipt`, `ReceiveReaction`, `ReceivePin`) | `Chat.API/Realtime` (the novel, hand-written realtime layer) | Live receipts/reactions instead of M6's 15 s refresh |
| **B12** | `PUT /{id}` and owner checks for communities and organizations. (1) An `editable` field flag in the module spec grammar and a `Update<Entity>Request` + `MapPut` in the canonical-module templates (the first slice of B2). Mark `Group`: name, description, avatar, coverImage, privacyType, approvalRequired; `Organization`: name, description, logo; `OrganizationMember`: role. (2) An **owner-of-parent** rule: `PUT`/`DELETE` on `groups/{id}` only for a caller with an `owner` row in `group-members`; on `organizations/{id}` only for `ownerId`; `DELETE group-members/{id}` / `organization-members/{id}` for the row's own user **or** the parent's owner; `PUT organization-members/{id}` only for the org owner and never to/from `owner`. Return `403` otherwise | `code-engine/templates/canonical-module` (Endpoints, Service, Contracts DTOs, FunctionalTests), `code-engine` spec grammar (`editable`, an `authorize` block naming the owner field or the parent membership), `groups.module.json`, `organizations.module.json` | Unblocks **M12** (edit, roles). Makes M10/M11 owner moderation server-enforced |
| **B13** | Who may link a post to a target. `POST /api/post-feeds` with `feedType: 'group'` only for members of that community; with `'organization'` only for its owner/admins; `DELETE post-feeds/{id}` for the post's author or the target's owner. Posts must not read Groups/Organizations tables (schema-per-module): Posts **consumes** `GroupMemberJoined/Left`, `OrganizationMemberAdded/Removed` (and a new `OrganizationMemberRoleChanged`) into a local membership projection and checks against it | `posts.module.json` `consumes`, a hand-written policy + projection in `Posts.API` (novel logic, category 3), the publishing modules' events | Closes the M10/M11 gap: today anyone can post into any community or organization through the API |
| **B14** | Private communities and community/organization events. (a) `readScope` on `post-feeds` rows of a `private` group (members only), via the B13 projection. (b) `Event.hostType` + `hostId` (`user`/`group`/`organization`) so events can belong to a community or an organization | `posts.module.json`, `events.module.json`, generator support for a `via` read scope across a projection | Honest "private" communities; an Events tab on community/org pages (future milestone) |

## Suggested order

B3 first (security), then B8 + B9 (they remove the biggest frontend workarounds), then
B10, B2, B4, B5, B1, B6, B7, B11.
For communities and organizations (M10–M12): **B12 → B13 → B14**, with B7 and B3 done
first or together (B12's owner checks are the per-resource form of B3). After each item: regenerate the SDK, run the module's
FunctionalTests, and update the matching frontend milestone blueprint (or write the
follow-up milestone) so the workaround is removed, not kept beside the real feature.
