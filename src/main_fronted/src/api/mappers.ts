// Adapters between the backend's normalized DTOs and the template's denormalized
// view models. The backend stores IDs (authorId) and thin records; the UI wants rich
// embedded objects. Fields the backend doesn't model yet (coverPhoto, follower counts,
// interests, poll/media) fall back to whatever the UI already had, so unbacked features
// degrade gracefully instead of blanking out.
import type { components as ProfileComponents } from '@sdk/profile';
import type { components as FeedComponents } from '@sdk/feed';
import type { components as PostComponents } from '@sdk/posts';
import type { components as EngagementComponents } from '@sdk/engagement';
import type { components as NotificationComponents } from '@sdk/notifications';
import type { components as CatalogComponents } from '@sdk/catalog';
import type { UserProfile, Post, Comment, Reactions, NotificationItem, MarketItem } from '../types';
import { mediaUrl, unMediaUrl } from './gateway';
import { timeAgo } from '../components/ui/time';

// timeAgo lives in components/ui/time.ts (M0.3); re-exported so existing imports keep working.
export { timeAgo };

/** The six reaction kinds the UI knows about; the backend stores the key verbatim. */
const REACTION_KEYS: (keyof Reactions)[] = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];

/** Coerce the backend's free-form reactionType string back into a known UI reaction. */
export function toReactionKey(s: string | null | undefined): keyof Reactions {
  const k = (s ?? '').toLowerCase();
  return (REACTION_KEYS as string[]).includes(k) ? (k as keyof Reactions) : 'like';
}

/** A fresh, all-zero reaction tally. */
export function emptyReactions(): Reactions {
  return { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 };
}

type ProfileDto = ProfileComponents['schemas']['ProfileDto'];
type FeedItemDto = FeedComponents['schemas']['FeedItemDto'];
type PostDto = PostComponents['schemas']['PostDto'];
type CommentDto = EngagementComponents['schemas']['CommentDto'];
type NotificationDto = NotificationComponents['schemas']['NotificationDto'];
type CatalogItemDto = CatalogComponents['schemas']['CatalogItem'];

const FALLBACK_AVATAR =
  'https://api.dicebear.com/7.x/identicon/svg?seed=';

/** A handle as shown in the UI, or '' when there is none. Never a made-up id. */
export function withHandle(handle: string | null | undefined): string {
  const bare = (handle ?? '').trim().replace(/^@/, '');
  return bare ? `@${bare}` : '';
}

/** Identicon used when a user has no avatar; seeded by the stable user id. */
export function defaultAvatar(seed: string): string {
  return `${FALLBACK_AVATAR}${encodeURIComponent(seed || 'user')}`;
}

/**
 * ProfileDto -> the UI's UserProfile. The server is the source of truth for every field
 * it models: a null there clears the value, it never falls back to a cached value from
 * a previous session. Only display name falls back, because the API rejects an empty name.
 */
export function profileToUser(p: ProfileDto, prev: UserProfile): UserProfile {
  const bare = (p.handle ?? '').trim();
  return {
    ...prev,
    id: p.userId,
    username: bare,
    name: p.displayName || prev.name,
    handle: withHandle(bare),
    avatar: mediaUrl(p.avatarUrl) ?? defaultAvatar(p.userId),
    bio: p.bio ?? '',
    // coverPhoto / followersCount / followingCount / interests: no backend yet → keep prev.
  };
}

/**
 * UserProfile edits -> the Profile API's UpdateProfileRequest body. `username` is the
 * bare handle the user typed (no '@'); it is sent as-is, never replaced by an older value.
 */
export function userToUpdateRequest(u: Partial<UserProfile>): ProfileComponents['schemas']['UpdateProfileRequest'] {
  const bio = (u.bio ?? '').trim();
  const handle = (u.username ?? '').trim().replace(/^@/, '');
  return {
    displayName: (u.name ?? '').trim(),
    bio: bio || null,
    avatarUrl: unMediaUrl(u.avatar),
    location: null,
    handle: handle || null,
  };
}

/** FeedItemDto (already composed by Feed.API) -> the UI's Post. */
export function feedItemToPost(f: FeedItemDto): Post {
  const authorName = f.author?.displayName || 'Unknown User';
  return {
    id: f.postId,
    type: 'text',
    authorId: f.authorId ?? undefined,
    author: {
      name: authorName,
      // The feed DTO has no handle; the feed hook fills it from Profile when available.
      handle: '',
      avatar: mediaUrl(f.author?.avatarUrl) ?? defaultAvatar(f.authorId ?? authorName),
    },
    content: f.body ?? '',
    createdAt: timeAgo(f.publishedAt),
    reactions: { like: Number(f.reactionCount) || 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
    comments: [],
    sharesCount: 0,
  };
}

/**
 * CommentDto -> the UI's Comment. The engagement module stores only authorId + body
 * (no author name, no timestamp), so the caller resolves the author profile and we fall
 * back gracefully when it's missing.
 */
export function commentDtoToComment(c: CommentDto, author: ProfileDto | null): Comment {
  const name = author?.displayName || 'Unknown User';
  return {
    id: c.id,
    authorId: c.authorId || undefined,
    author: {
      name,
      handle: withHandle(author?.handle),
      avatar: mediaUrl(author?.avatarUrl) ?? defaultAvatar(c.authorId || name),
    },
    content: c.body,
    createdAt: 'recently', // CommentDto has no timestamp in the v0 engagement schema.
    parentCommentId: c.parentCommentId ?? null,
  };
}

/** The UI's notification kinds keyed by the backend's free-form `type` string. */
const NOTIFICATION_TYPES: NotificationItem['type'][] = ['like', 'comment', 'reaction', 'mention', 'follow', 'group', 'live'];

/**
 * NotificationDto -> the UI's NotificationItem. The v0 module stores no message or
 * timestamp, so we synthesize display text from the type and resolve the actor's name
 * through Profile.
 */
export function notificationToItem(n: NotificationDto, actor: ProfileDto | null): NotificationItem {
  const t = (n.type ?? '').toLowerCase();
  const type = (NOTIFICATION_TYPES as string[]).includes(t) ? (t as NotificationItem['type']) : 'mention';
  const name = actor?.displayName || 'Someone';
  const text =
    type === 'follow' ? 'started following you.'
    : type === 'comment' ? 'commented on your post.'
    : type === 'like' || type === 'reaction' ? 'reacted to your post.'
    : type === 'group' ? 'updated a community you are in.'
    : `sent you a ${type}.`;
  return {
    id: n.id,
    type,
    actor: { name, avatar: mediaUrl(actor?.avatarUrl) ?? defaultAvatar(n.actorId || name) },
    actorId: n.actorId || undefined,
    text,
    createdAt: 'recently', // NotificationDto has no timestamp in the v0 schema.
    read: n.isRead,
    postId: n.entityType === 'Post' ? n.entityId : undefined,
  };
}

/**
 * Catalog product -> the marketplace card view model. The eShop Catalog is reused as
 * the Marketplace module's CONTENT (browsing); fields the catalog doesn't model
 * (location/seller) fall back to store-ish defaults. `imageUrl` is computed by the
 * caller (catalogPicUrl) so this mapper stays free of the gateway's runtime/base URL.
 */
export function catalogItemToMarketItem(dto: CatalogItemDto, imageUrl: string, category: string): MarketItem {
  return {
    id: String(dto.id ?? ''),
    title: dto.name,
    description: dto.description ?? '',
    price: Number(dto.price ?? 0),
    // The list response leaves the catalogType nav null, so the caller resolves the
    // category name from /catalogtypes (by catalogTypeId) and passes it in.
    category,
    location: 'socialLight Store',
    imageUrl,
    seller: dto.catalogBrand?.brand ?? 'socialLight Store',
    dateAdded: (Number(dto.availableStock ?? 0) > 0) ? 'In stock' : 'Out of stock',
  };
}

/**
 * A PostDto loaded by id (a shared post, M3) -> a read-only UI Post. The author's name and
 * avatar are filled in by the caller from Profile; attachments from the post-media rows.
 */
export function postDtoToPost(p: PostDto): Post {
  return {
    id: p.id,
    type: 'text',
    authorId: p.authorId || undefined,
    author: { name: 'Unknown User', handle: '', avatar: defaultAvatar(p.authorId || p.id) },
    content: p.body ?? '',
    createdAt: timeAgo(p.publishedAt),
    reactions: emptyReactions(),
    comments: [],
    sharesCount: 0,
  };
}

/** A freshly created PostDto -> an optimistic UI Post authored by the current user. */
export function newPostToPost(p: PostDto, author: UserProfile): Post {
  return {
    id: p.id,
    type: 'text',
    authorId: author.id,
    author: { name: author.name, handle: author.handle, avatar: author.avatar },
    content: p.body ?? '',
    createdAt: timeAgo(p.publishedAt) ?? 'Just now',
    reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
    comments: [],
    sharesCount: 0,
  };
}
