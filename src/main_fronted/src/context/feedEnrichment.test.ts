import { describe, it, expect } from 'vitest';
import { applyPatches, enrichTargetLinks } from './feedEnrichment';
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

describe('enrichTargetLinks: communities', () => {
  it('names the community only for posts that have a group post-feed row', async () => {
    mockApi({
      'GET /api/post-feeds': [
        { id: 'f-1', postId: 'p-1', feedType: 'group', targetId: 'g-1' },
        { id: 'f-2', postId: 'p-2', feedType: 'profile', targetId: 'g-1' },
      ],
      'GET /api/groups': [{ id: 'g-1', name: 'Design Systems', privacyType: 'public', approvalRequired: false }],
    });
    const patch = await enrichTargetLinks([post('p-1'), post('p-2')]);
    expect(patch).not.toBeNull();
    const [linked, plain] = applyPatches([post('p-1'), post('p-2')], [patch!]);
    expect(linked).toMatchObject({ groupId: 'g-1', groupName: 'Design Systems' });
    expect(plain.groupId).toBeUndefined();
  });

  it('returns no patch when none of the posts is in a community', async () => {
    mockApi({ 'GET /api/post-feeds': [], 'GET /api/groups': [] });
    expect(await enrichTargetLinks([post('p-1')])).toBeNull();
  });
});

describe('enrichTargetLinks: organizations (M11)', () => {
  it('names the organization only for posts that have an organization post-feed row', async () => {
    mockApi({
      'GET /api/post-feeds': [
        { id: 'f-1', postId: 'p-1', feedType: 'organization', targetId: 'o-1' },
        { id: 'f-2', postId: 'p-2', feedType: 'profile', targetId: 'o-1' },
      ],
      'GET /api/organizations': [{ id: 'o-1', ownerId: 'ana', name: 'Acme', description: null, logo: null, verificationStatus: 'unverified' }],
    });
    const patch = await enrichTargetLinks([post('p-1'), post('p-2')]);
    const [linked, plain] = applyPatches([post('p-1'), post('p-2')], [patch!]);
    expect(linked).toMatchObject({ organizationId: 'o-1', organizationName: 'Acme' });
    expect(plain.organizationId).toBeUndefined();
    expect(plain.organizationName).toBeUndefined();
  });

  it('sets each post\'s own link when a batch mixes community and organization rows', async () => {
    mockApi({
      'GET /api/post-feeds': [
        { id: 'f-1', postId: 'p-g', feedType: 'group', targetId: 'g-1' },
        { id: 'f-2', postId: 'p-o', feedType: 'organization', targetId: 'o-1' },
      ],
      'GET /api/groups': [{ id: 'g-1', name: 'Design Systems', privacyType: 'public', approvalRequired: false }],
      'GET /api/organizations': [{ id: 'o-1', ownerId: 'ana', name: 'Acme', description: null, logo: null, verificationStatus: 'unverified' }],
    });
    const patch = await enrichTargetLinks([post('p-g'), post('p-o')]);
    const [group, org] = applyPatches([post('p-g'), post('p-o')], [patch!]);
    expect(group).toMatchObject({ groupId: 'g-1', groupName: 'Design Systems' });
    expect(group.organizationId).toBeUndefined();
    expect(org).toMatchObject({ organizationId: 'o-1', organizationName: 'Acme' });
    expect(org.groupId).toBeUndefined();
  });

  it('does not call the organizations API when no post is in an organization', async () => {
    const { calls } = mockApi({
      'GET /api/post-feeds': [{ id: 'f-1', postId: 'p-1', feedType: 'group', targetId: 'g-1' }],
      'GET /api/groups': [{ id: 'g-1', name: 'Design Systems', privacyType: 'public', approvalRequired: false }],
    });
    await enrichTargetLinks([post('p-1')]);
    expect(calls.some((c) => c.path === '/api/organizations')).toBe(false);
  });

  it('does not call the groups API when no post is in a community', async () => {
    const { calls } = mockApi({
      'GET /api/post-feeds': [{ id: 'f-1', postId: 'p-1', feedType: 'organization', targetId: 'o-1' }],
      'GET /api/organizations': [{ id: 'o-1', ownerId: 'ana', name: 'Acme', description: null, logo: null, verificationStatus: 'unverified' }],
    });
    await enrichTargetLinks([post('p-1')]);
    expect(calls.some((c) => c.path === '/api/groups')).toBe(false);
  });
});
