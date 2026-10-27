export interface UserProfile {
  id: string;
  username: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  coverPhoto: string;
  followersCount: number;
  followingCount: number;
  interests: string[];
}

export interface Comment {
  id: string;
  authorId?: string; // backend user id of the commenter, used to open a chat with them
  author: {
    name: string;
    handle: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  /** The comment this one answers; null for a top-level comment. */
  parentCommentId: string | null;
  /** Likes on this comment (Engagement reactions with targetType 'Comment'). */
  likes?: number;
  /** Whether the signed-in user has liked this comment. */
  likedByMe?: boolean;
  /** Set locally when the author deleted a comment that still has replies. */
  deleted?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
}

export interface Reactions {
  like: number;
  love: number;
  laugh: number;
  wow: number;
  sad: number;
  angry: number;
}

export interface Post {
  id: string;
  type: 'text' | 'link' | 'image' | 'video' | 'poll';
  authorId?: string; // backend user id of the author, used to notify them on engagement
  author: {
    name: string;
    handle: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  title?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDesc?: string;
  linkImage?: string;
  /** All attached images in position order (M3). `imageUrl` stays the first one. */
  images?: string[];
  imageUrl?: string;
  videoUrl?: string;
  poll?: Poll;
  reactions: Reactions;
  comments: Comment[];
  sharesCount: number;
  currentUserReaction?: keyof Reactions | null;
  /** The community this post was shared into (M5), from its post-feed row. */
  groupId?: string;
  groupName?: string;
  /** The organization this post was shared into (M11), from its post-feed row. */
  organizationId?: string;
  organizationName?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  joined: boolean;
  coverUrl: string;
  /** Cover image url, display-ready, when the community has one (M5). */
  coverImage?: string;
  /** Privacy as stored by the Groups module ('public' | 'private'). A label only (M5). */
  privacy?: string;
}

export interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  imageUrl: string;
  seller: string;
  dateAdded: string;
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'reaction' | 'mention' | 'follow' | 'group' | 'live' | 'friend_request' | 'friend_accept' | 'story_reply';
  actor: {
    name: string;
    avatar: string;
  };
  /** Backend user id of the person who acted, so their profile can open. */
  actorId?: string;
  text: string;
  createdAt: string;
  read: boolean;
  postId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  /** Text for `text` messages; the file url for `image` messages. */
  text: string;
  createdAt: string;
  /** The backend contentType: `text` or `image` (unknown types render as text). */
  contentType?: string;
}

/** A chat window. Keyed by the backend chat id; a DM also carries the peer's user id. */
export interface ChatBoxState {
  chatId: string;
  kind: 'dm' | 'group';
  /** The other person of a DM. Empty for a group. */
  userId: string;
  name: string;
  avatar: string;
  handle: string;
  isMinimized: boolean;
}

/** One row of the conversation list, keyed by the backend chat id. */
export interface ChatThread {
  chatId: string;
  kind: 'dm' | 'group';
  /** The other person of a DM. Empty for a group. */
  userId: string;
  name: string;
  avatar: string;
  handle: string;
  lastMessage: string;
  lastMessageTime: string;
  /** Unread peer messages in this chat (0 when muted). */
  unreadCount: number;
  /** True when unreadCount > 0. */
  unread: boolean;
  muted: boolean;
  /** Participants count, for groups. */
  memberCount?: number;
}

