# Social Platform Module Specification

## Overview

The Social Platform module provides a complete social networking ecosystem inspired by modern platforms such as Facebook, LinkedIn, Threads, Marketplace, Messenger, and Gaming Communities.

The module is designed around a centralized identity system, allowing individuals and organizations to create content, communicate, conduct commerce, participate in communities, manage events, publish jobs, and engage with gaming ecosystems.

---

# Core Identity System

## User

Extends:

* User Module
* Ecommerce Customer Module

### Properties

```text
User
├─ id
├─ username
├─ displayName
├─ biography
├─ avatar
├─ coverImage
├─ verificationStatus
├─ privacySettings
├─ geolocationMetadata
├─ onlineStatus
├─ lastSeenAt
├─ profileVisibility
├─ followerCount
├─ followingCount
├─ friendCount
├─ reputationScore
├─ createdAt
└─ updatedAt
```

### Relationships

```text
User
├─ Stories
├─ Posts
├─ Reels
├─ Pages
├─ Groups
├─ Events
├─ Marketplace Listings
├─ Job Applications
├─ Chats
├─ Threads
├─ Reactions
├─ Followers
├─ Following
└─ Organizations
```

---

# Social Graph

## Follow

```text
Follow
├─ followerId
├─ followingId
├─ status
├─ createdAt
```

## Friend

```text
Friend
├─ requesterId
├─ recipientId
├─ status
├─ acceptedAt
```

## Block

```text
Block
├─ blockerId
├─ blockedId
├─ reason
```

## User Preferences

Required for feed personalization.

```text
UserPreference
├─ userId
├─ entityType
├─ entityId
├─ preferenceType
│   ├─ interested
│   ├─ notInterested
│   ├─ snoozed
│   ├─ hidden
│   └─ muted
├─ expiresAt
```

---

# Stories

## Story

Temporary content visible for 24 hours.

```text
Story
├─ authorId
├─ mediaType
├─ mediaUrl
├─ caption
├─ visibility
├─ expiresAt
```

### Story Analytics

```text
StoryView
StoryReaction
StoryReply
StoryReport
```

---

# Posts

## Post

Universal content entity.

```text
Post
├─ id
├─ authorId
├─ contentType
├─ visibility
├─ status
├─ body
├─ location
├─ scheduledAt
├─ publishedAt
├─ archivedAt
```

### Status

```text
Draft
Scheduled
Published
Archived
Removed
Moderated
```

### Content Types

```text
Text
ImageGallery
Video
Link
Poll
Banner
Media
```

### Image Gallery

```text
PostMedia
├─ postId
├─ fileUrl
├─ mediaType
├─ position
```

Supports:

```text
1-15 images
```

---

# Feed Distribution System

Posts may appear in multiple feeds simultaneously.

## FeedTarget

```text
Main Feed
User Feed
Group Feed
Page Feed
Organization Feed
Event Feed
Marketplace Feed
Gaming Feed
```

## PostFeed

```text
PostFeed
├─ postId
├─ feedType
├─ targetId
```

---

# Post Engagement

## Reactions

```text
Reaction
├─ userId
├─ targetType
├─ targetId
├─ reactionType
```

### Reaction Types

```text
Like
Love
Care
Funny
Wow
Sad
Angry
```

---

## Comments

```text
Comment
├─ postId
├─ authorId
├─ parentCommentId
├─ body
```

Supports nested comments.

---

## Shares

```text
Share
├─ sharerId
├─ originalPostId
├─ commentary
```

---

## Reports

```text
Report
├─ reporterId
├─ targetType
├─ targetId
├─ category
├─ status
```

---

## Moderation Notes

```text
ModerationNote
├─ moderatorId
├─ targetType
├─ targetId
├─ note
```

Internal only.

---

# Reels

Separate entity.

Reason:

* Different recommendation engine
* Different analytics
* Different storage policies

## Reel

```text
Reel
├─ creatorId
├─ videoUrl
├─ caption
├─ duration
├─ visibility
├─ musicTrackId
```

### Reel Analytics

```text
ReelView
ReelReaction
ReelComment
ReelShare
ReelReport
```

---

# Groups

## Group

```text
Group
├─ name
├─ description
├─ avatar
├─ coverImage
├─ privacyType
├─ approvalRequired
```

### Group Membership

```text
GroupMember
├─ groupId
├─ userId
├─ role
```

### Roles

```text
Owner
Admin
Moderator
Member
```

---

# Pages

Public entities representing brands, influencers, public figures, communities.

## Page

```text
Page
├─ name
├─ category
├─ description
├─ avatar
├─ coverImage
├─ verificationStatus
```

### Page Roles

```text
PageRole
├─ pageId
├─ userId
├─ role
```

---

# Events

Temporal communities.

## Event

```text
Event
├─ organizerId
├─ title
├─ description
├─ location
├─ startDate
├─ endDate
├─ capacity
├─ visibility
```

### RSVP

```text
EventAttendance
├─ eventId
├─ userId
├─ status
```

Status:

```text
Going
Interested
Not Going
```

---

# Organizations

Organizations act similarly to users.

## Organization

```text
Organization
├─ ownerId
├─ name
├─ description
├─ logo
├─ verificationStatus
```

### Organization Members

```text
OrganizationMember
├─ organizationId
├─ userId
├─ role
```

### Roles

```text
Owner
Admin
Manager
Editor
Viewer
Billing
```

Organizations can:

* Publish posts
* Create events
* Manage pages
* Publish jobs
* Sell products
* Manage chats

---

# Ecommerce Integration

## Marketplace Listing

```text
Listing
├─ sellerType
├─ sellerId
├─ categoryId
├─ title
├─ description
├─ price
├─ status
├─ inventory
```

### Social Features

```text
ListingReaction
ListingComment
ListingShare
ListingReport
```

### Seller Types

```text
User
Organization
Page
```

---

# Chat Module

Messenger equivalent.

## Chat

```text
Chat
├─ type
├─ title
├─ createdBy
```

Types:

```text
Direct
Group
Community
Support
```

---

## Chat Participant

```text
ChatParticipant
├─ chatId
├─ userId
├─ role
```

---

## Message

```text
Message
├─ chatId
├─ senderId
├─ contentType
├─ content
├─ editedAt
```

---

## Chat Features

```text
MessageReaction
MessageReadReceipt
MessageAttachment
MessageReport
ChatBlock
ChatRequest
ChatMute
ChatPin
```

---

# Job Platform

LinkedIn-style subsystem.

## Job Category

```text
JobCategory
```

## Job Position

```text
JobPosition
├─ organizationId
├─ title
├─ description
├─ salaryRange
├─ location
├─ employmentType
```

### Employment Types

```text
Full Time
Part Time
Contract
Remote
Hybrid
Internship
```

---

## Job Application

```text
JobApplication
├─ applicantId
├─ positionId
├─ resumeId
├─ coverLetter
├─ status
```

Status:

```text
Applied
Reviewing
Interview
Offer
Rejected
Hired
```

---

# Gaming Platform

Much more mature than the initial proposal.

## Game

```text
Game
├─ name
├─ type
├─ provider
├─ source
├─ platform
```

---

## Player Profile

```text
PlayerProfile
├─ userId
├─ nickname
├─ ranking
├─ level
```

---

## Achievement

```text
Achievement
├─ gameId
├─ title
├─ description
```

---

## User Achievement

```text
UserAchievement
├─ userId
├─ achievementId
├─ unlockedAt
```

---

## Tournament

```text
Tournament
├─ gameId
├─ organizerId
├─ startDate
├─ prizePool
```

---

## Team

```text
Team
├─ gameId
├─ name
├─ ownerId
```

---

## Team Member

```text
TeamMember
├─ teamId
├─ userId
├─ role
```

---

## Match

```text
Match
├─ gameId
├─ tournamentId
├─ status
```

---

## Leaderboard

```text
Leaderboard
├─ gameId
├─ seasonId
```

---

# Threads

Public conversation system.

Unlike chats:

* Discoverable
* Searchable
* Followable
* Feed-driven

## Thread

```text
Thread
├─ authorId
├─ title
├─ body
├─ visibility
```

---

## Thread Reply

```text
ThreadReply
├─ threadId
├─ authorId
├─ parentReplyId
├─ body
```

---

## Thread Subscription

```text
ThreadSubscription
├─ userId
├─ threadId
```

---

# Cross-Platform Notification System

Required by all modules.

```text
Notification
├─ recipientId
├─ actorId
├─ type
├─ entityType
├─ entityId
├─ isRead
```

---

# Cross-Platform Moderation Layer

Shared moderation engine.

```text
Report
ModerationCase
ModerationAction
ModerationNote
Appeal
```

---

# Recommendation Engine Entities

Critical for Facebook-scale architecture.

```text
UserInterest
ContentScore
FeedRanking
RecommendationCandidate
TrendingTopic
Hashtag
Topic
```

Without these entities, implementing modern feed ranking, reels recommendations, marketplace suggestions, job recommendations, gaming recommendations, and thread discovery becomes extremely difficult.

This design is close to what I would expect in an enterprise-level social platform architecture intended to support Facebook, Messenger, Threads, Marketplace, LinkedIn Jobs, Gaming Communities, and Organization Accounts from a unified backend.
