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

function withHandle(handle: string | null | undefined, fallback: string): string {
  if (!handle) return fallback;
  return handle.startsWith('@') ? handle : `@${handle}`;
}

/** ProfileDto -> the UI's UserProfile, preserving UI-only fields from `prev`. */
export function profileToUser(p: ProfileDto, prev: UserProfile): UserProfile {
  return {
    ...prev,
    id: p.userId,
    username: p.handle ?? prev.username,
    name: p.displayName || prev.name,
    handle: withHandle(p.handle, prev.handle),
    avatar: mediaUrl(p.avatarUrl) ?? prev.avatar,
    bio: p.bio ?? prev.bio,
    // coverPhoto / followersCount / followingCount / interests: no backend yet → keep prev.
  };
}

/** UserProfile edits -> the Profile API's UpdateProfileRequest body. */
export function userToUpdateRequest(u: Partial<UserProfile>): ProfileComponents['schemas']['UpdateProfileRequest'] {
  return {
    displayName: u.name ?? '',
    bio: u.bio ?? null,
    avatarUrl: unMediaUrl(u.avatar),
    location: null,
    handle: u.username ?? (u.handle ? u.handle.replace(/^@/, '') : null),
  };
}

/** Best-effort relative time from an ISO timestamp. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Just now';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Just now';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
      handle: `@${(f.authorId ?? '').slice(0, 8) || 'user'}`,
      avatar: mediaUrl(f.author?.avatarUrl) ?? `${FALLBACK_AVATAR}${encodeURIComponent(f.authorId ?? authorName)}`,
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
    author: {
      name,
      handle: withHandle(author?.handle, `@${(c.authorId ?? '').slice(0, 8) || 'user'}`),
      avatar: mediaUrl(author?.avatarUrl) ?? `${FALLBACK_AVATAR}${encodeURIComponent(c.authorId || name)}`,
    },
    content: c.body,
    createdAt: 'recently', // CommentDto has no timestamp in the v0 engagement schema.
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
    actor: { name, avatar: mediaUrl(actor?.avatarUrl) ?? `${FALLBACK_AVATAR}${encodeURIComponent(n.actorId || name)}` },
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
