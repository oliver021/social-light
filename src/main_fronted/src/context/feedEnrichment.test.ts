import { describe, it, expect } from 'vitest';
import { applyPatches, enrichGroupLinks } from './feedEnrichment';
import { mockApi } from '../test/mockApi';
import type { Post } from '../types';

const post = (id: string): Post => ({
  id,
  type: 'text',
  author: { name: 'Ana', handle: '', avatar: '' },
  content: '',
  createdAt: 'now',
  reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  sharesCount: 0,
});

describe('enrichGroupLinks', () => {
  it('names the community only for posts that have a group post-feed row', async () => {
    mockApi({
      'GET /api/post-feeds': [
        { id: 'f-1', postId: 'p-1', feedType: 'group', targetId: 'g-1' },
        { id: 'f-2', postId: 'p-2', feedType: 'profile', targetId: 'g-1' },
      ],
      'GET /api/groups': [{ id: 'g-1', name: 'Design Systems', privacyType: 'public', approvalRequired: false }],
    });
    const patch = await enrichGroupLinks([post('p-1'), post('p-2')]);
    expect(patch).not.toBeNull();
    const [linked, plain] = applyPatches([post('p-1'), post('p-2')], [patch!]);
    expect(linked).toMatchObject({ groupId: 'g-1', groupName: 'Design Systems' });
    expect(plain.groupId).toBeUndefined();
  });

  it('returns no patch when none of the posts is in a community', async () => {
    mockApi({ 'GET /api/post-feeds': [], 'GET /api/groups': [] });
    expect(await enrichGroupLinks([post('p-1')])).toBeNull();
  });
});
