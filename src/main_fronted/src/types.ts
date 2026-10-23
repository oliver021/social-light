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
  imageUrl?: string;
  videoUrl?: string;
  poll?: Poll;
  reactions: Reactions;
  comments: Comment[];
  sharesCount: number;
  currentUserReaction?: keyof Reactions | null;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  joined: boolean;
  coverUrl: string;
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
  type: 'like' | 'comment' | 'reaction' | 'mention' | 'follow' | 'group' | 'live';
  actor: {
    name: string;
    avatar: string;
  };
  text: string;
  createdAt: string;
  read: boolean;
  postId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface ChatBoxState {
  userId: string;
  name: string;
  avatar: string;
  handle: string;
  isMinimized: boolean;
}

export interface ChatThread {
  userId: string;
  name: string;
  avatar: string;
  handle: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
}

