# app-specs — the source of truth for code-engine

These JSON files are the **module specs** the [`code-engine`](../../code-engine)
generator consumes (canonical-module preset). They are derived from
[`../APP.md`](../APP.md) and translated into the engine's module-spec grammar
(`module` + `entities[]` + intra-module `relations` + `publishes`/`consumes`).

> **Nothing here has been generated yet.** These are specs only. Generation and
> host wire-up are a separate, deliberate step (done together).

## What is and isn't a module here

| APP.md section | Module spec | Notes |
|---|---|---|
| Core Identity / User | **excluded** | Identity/auth is the legacy `Identity.API` (Duende). The rich social **Profile** is hand-built later (not generated). Everything references a user by **opaque `*Id` guid**. |
| Ecommerce / Marketplace | **excluded** | Pulled from the legacy eShop e-commerce services. Listing social features (reaction/comment/share/report) are covered by the polymorphic **Engagement**/**Moderation** modules via `targetType="Listing"`. |
| Social Graph | `social-graph` | Follow, Friend, Block, UserPreference |
| Stories | `stories` | Story, StoryView, StoryReply |
| Posts + Feed Distribution | `posts` | Post, PostMedia, PostFeed |
| Post Engagement | `engagement` | Reaction, Comment, Share — **polymorphic** (`targetType`/`targetId`) so they serve posts, reels, stories, listings, … |
| Reports + Moderation | `moderation` | Report, ModerationCase, ModerationAction, ModerationNote, Appeal |
| Reels | `reels` | Reel, ReelView |
| Groups | `groups` | Group, GroupMember |
| Pages | `pages` | Page, PageRole |
| Events | `events` | Event, EventAttendance |
| Organizations | `organizations` | Organization, OrganizationMember |
| Chat | `chat` | Chat, ChatParticipant, Message, MessageReaction, MessageReadReceipt, MessageAttachment, ChatBlock, ChatRequest, ChatMute, ChatPin |
| Jobs | `jobs` | JobCategory, JobPosition, JobApplication |
| Gaming | `gaming` | Game, PlayerProfile, Achievement, UserAchievement, Tournament, Team, TeamMember, Match, Leaderboard |
| Threads | `threads` | Thread, ThreadReply, ThreadSubscription |
| Notification | `notifications` | Notification (fan-in; consumes events from many modules) |
| Recommendation | `recommendation` | UserInterest, ContentScore, FeedRanking, RecommendationCandidate, TrendingTopic, Hashtag, Topic — storage rails for hand-built ranking |

## Translation rules (APP.md → engine grammar)

These are deliberate decisions that map APP.md's content model onto the engine's
decoupling doctrine (DESIGN-STRATEGY.md §3/§4). Worth reviewing:

1. **Opaque cross-context ids.** Any reference to something outside the module
   (a user, an organization, a listing) is a plain `guid` field, never a
   `relation`. Relations exist **only between entities in the same module** — the
   engine rejects anything else at parse time.
2. **Synthetic `id` key.** Every entity gets an `id: guid` primary key. APP.md's
   natural/composite keys (e.g. `followerId`+`followingId`) become ordinary
   fields. The canonical form supports a single key only.
3. **FK field naming = `<Parent>Id`.** Intra-module child entities name their
   foreign key after the parent (`GroupId`, `MessageId`, `JobPositionId`) so EF
   wires the `relation` by convention with no shadow column.
4. **Polymorphic engagement, not per-type.** APP.md lists `StoryReaction`,
   `ReelReaction`, `ListingReaction`, etc. These collapse into one polymorphic
   `Reaction`/`Comment`/`Share` (Engagement) and one `Report` (Moderation) keyed
   by `targetType` + `targetId`. Per-type, lifecycle-bound analytics that aren't
   engagement (`StoryView`, `ReelView`, `MessageReadReceipt`) stay in their module.
5. **Self-references are plain ids.** Nesting (`parentCommentId`, `parentReplyId`)
   is a nullable `guid` field, not a self-relation — avoids EF self-FK ambiguity.
6. **Enums as `string`.** APP.md enums (Status, Role, Visibility, ReactionType,
   EmploymentType, …) are `string` fields pending a first-class enum feature in
   the engine.
7. **No `ui` blocks.** Frontend (CRUD pages, feed, profile) is hand-built later,
   so no platform/CRUD-page generation is requested here.
8. **`routePrefix: "/api"`.** Each entity is exposed as `/api/<plural>`; module
   isolation is at the schema/DbContext/event level, not the URL.
9. **`consumes` is documentation.** Inbound event contracts are listed for intent;
   the engine doesn't generate consumers yet.

## Known follow-ups (not done here)

- A few entities have multiple intra-module parents (e.g. `Match` → Game &
  Tournament). Only the primary link is a `relation`; the secondary is a plain
  id field, pending multi-relation FK disambiguation in the engine.
- The owner id on write endpoints (`authorId`, etc.) should come from the JWT
  principal, not the request body — a category-3 adjustment after generation.
- Wiring each generated module into `SocialLight.AppHost` (db + broker + one
  `AddProject<>` line) is the explicit post-generation step.
