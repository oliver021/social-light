// Builds the thread shown under a post from the flat comment list (M3). The list stays flat in
// state; the tree exists only at render time. One level of nesting is shown: every reply sits
// under its top-level comment, and a reply to a reply keeps that level, with the name of the
// comment it answers.
import type { Comment } from '../../types';

/** A reply in a thread. `replyToName` is set when it answers another reply, not the top comment. */
export interface ThreadReply {
  comment: Comment;
  replyToName: string | null;
}

/** A top-level comment and its replies, in server order. */
export interface ThreadNode {
  root: Comment;
  replies: ThreadReply[];
}

/** Stands in for a parent that is no longer in the list (deleted on the server, not cascaded). */
function missingParent(id: string): Comment {
  return {
    id,
    author: { name: '', handle: '', avatar: '' },
    content: '',
    createdAt: '',
    parentCommentId: null,
    deleted: true,
  };
}

/**
 * Groups the comments into threads. Top-level comments keep the server order. A reply whose
 * parent is missing is grouped under a "Comment deleted" placeholder, so it is never lost.
 */
export function buildThreads(comments: Comment[]): ThreadNode[] {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const nodes = new Map<string, ThreadNode>();
  const order: ThreadNode[] = [];

  for (const c of comments) {
    if (c.parentCommentId) continue;
    const node: ThreadNode = { root: c, replies: [] };
    nodes.set(c.id, node);
    order.push(node);
  }

  for (const c of comments) {
    if (!c.parentCommentId) continue;
    // Walk up to the top-level comment. The guard stops a malformed cycle.
    const seen = new Set<string>([c.id]);
    let cur: Comment = c;
    while (cur.parentCommentId && byId.has(cur.parentCommentId) && !seen.has(cur.parentCommentId)) {
      seen.add(cur.parentCommentId);
      cur = byId.get(cur.parentCommentId)!;
    }
    const rootId = cur.parentCommentId && !byId.has(cur.parentCommentId) ? cur.parentCommentId : cur.id;

    let node = nodes.get(rootId);
    if (!node) {
      node = { root: byId.get(rootId) ?? missingParent(rootId), replies: [] };
      nodes.set(rootId, node);
      order.push(node);
    }

    // Name the reply's direct parent only when that parent is a reply itself.
    const direct = c.parentCommentId && byId.get(c.parentCommentId);
    const replyToName = direct && direct.id !== rootId ? direct.author.name : null;
    node.replies.push({ comment: c, replyToName });
  }

  return order;
}
