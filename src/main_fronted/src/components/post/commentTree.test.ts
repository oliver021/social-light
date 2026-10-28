import { describe, it, expect } from 'vitest';
import { buildThreads } from './commentTree';
import type { Comment } from '../../types';

const c = (id: string, parentCommentId: string | null, name = id): Comment => ({
  id,
  authorId: `user-${id}`,
  author: { name, handle: '', avatar: '' },
  content: `text ${id}`,
  createdAt: 'now',
  parentCommentId,
});

describe('buildThreads', () => {
  it('keeps top-level comments in server order and groups replies under their parent', () => {
    const threads = buildThreads([c('a', null), c('r1', 'a'), c('b', null), c('r2', 'a')]);
    expect(threads.map((t) => t.root.id)).toEqual(['a', 'b']);
    expect(threads[0].replies.map((r) => r.comment.id)).toEqual(['r1', 'r2']);
    expect(threads[1].replies).toEqual([]);
  });

  it('a reply to a reply stays at the same level and names the comment it answers', () => {
    const threads = buildThreads([c('a', null, 'Ana'), c('r1', 'a', 'Ben'), c('r2', 'r1', 'Cy')]);
    expect(threads).toHaveLength(1);
    expect(threads[0].replies).toEqual([
      { comment: expect.objectContaining({ id: 'r1' }), replyToName: null },
      { comment: expect.objectContaining({ id: 'r2' }), replyToName: 'Ben' },
    ]);
  });

  it('groups replies whose parent is gone under a "deleted" placeholder, so none are lost', () => {
    const threads = buildThreads([c('r1', 'missing'), c('r2', 'missing')]);
    expect(threads).toHaveLength(1);
    expect(threads[0].root).toMatchObject({ id: 'missing', deleted: true });
    expect(threads[0].replies.map((r) => r.comment.id)).toEqual(['r1', 'r2']);
  });

  it('terminates on a malformed cycle (a comment that is its own ancestor)', () => {
    const threads = buildThreads([c('x', 'y'), c('y', 'x')]);
    expect(threads.length).toBeGreaterThan(0);
    const ids = threads.flatMap((t) => [t.root.id, ...t.replies.map((r) => r.comment.id)]);
    expect(ids).toEqual(expect.arrayContaining(['x', 'y']));
  });

  it('returns an empty list for no comments', () => {
    expect(buildThreads([])).toEqual([]);
  });
});
