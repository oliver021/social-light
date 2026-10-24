/**
 * Open a chat with a real user. Anonymous entries (no backend id) and the signed-in user
 * themselves are not chat targets.
 */
export function canChatWith(userId: string | undefined, myId: string): userId is string {
  return !!userId && userId !== myId;
}
