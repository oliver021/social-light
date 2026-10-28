import type { Post } from '../../types';

/** A text post with no reactions or comments. Tests override only what they check. */
export function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    type: 'text',
    authorId: 'author-2',
    author: { name: 'Ana Ruiz', handle: '@ana', avatar: '' },
    content: 'Hello from the feed',
    createdAt: '5m ago',
    reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
    comments: [],
    sharesCount: 0,
    currentUserReaction: null,
    ...overrides,
  };
}
