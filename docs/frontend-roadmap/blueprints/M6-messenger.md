# M6 — Messenger, completed

**Goal:** use the Chat resources the web ignores: read receipts, message reactions,
image attachments, mutes, pins and group conversations. Today only `chats`,
`chat-participants`, `messages` and the SignalR hub are used.

All paths relative to `src/main_fronted/src/`. Main files: `context/useChat.ts`,
`api/realtime.ts`, `components/Messenger.tsx` (split it into
`components/messenger/ChatWindow.tsx`, `MessageBubble.tsx`, `ThreadList.tsx` first —
pure move, characterisation test before and after, as in M0.3).

## Backend facts

| Resource | Body | Bound from JWT | Readable by |
|---|---|---|---|
| `message-read-receipts` | `messageId, userId, readAt` | `userId` | anyone signed in |
| `message-reactions` | `messageId, userId, reactionType` | `userId` | anyone signed in |
| `message-attachments` | `messageId, fileUrl, mediaType` | — | anyone signed in |
| `chat-mutes` | `chatId, userId, mutedUntil` | `userId` | owner only |
| `chat-pins` | `chatId, messageId` | — | anyone signed in |
| `chat-blocks` | `chatId, blockerId, blockedId` | `blockerId` | blocker only |
| `chats` | `type, title, createdBy` | `createdBy` | participants |

The hub only pushes `ReceiveMessage(MessageDto)` (Join/Leave/Send). Receipts,
reactions and pins are **not** pushed: refresh them when a chat window opens, when the
window regains focus, and every 15 s while at least one chat window is open and the
document is visible. Do not claim "live" for these in copy. `MessageDto` has no
timestamp; do not invent one.

## 1. Read receipts and unread counts

- When a chat window is open, expanded and `document.visibilityState === 'visible'`,
  send `POST /api/message-read-receipts` `{ messageId, userId: me, readAt: now }` for each
  peer message that has no receipt from me, one at a time, at most 20 per pass.
- "Seen" (`text-subtle`, `aria-label="Seen by {name}"`) under my latest message that has
  a receipt from the peer (in a group: "Seen by {n}").
- Unread count per thread = peer messages without my receipt. Shown on the thread
  list, on the Navbar messenger button (`aria-label="Messages, {n} unread"`), and as the
  chat window header badge. Muted chats (§4) do not count.

## 2. Message reactions

- Six reactions as for posts (`like, love, laugh, wow, sad, angry`), one per user per
  message: same toggle/swap logic as `reactToPost` (delete old row, create new).
- Open the picker by hovering a bubble (desktop) or long-press 500 ms (touch), and by a
  keyboard-reachable "React" icon button on focus (`aria-label="React to message"`).
- Under the bubble: aggregated emoji + count; my reaction highlighted.

## 3. Image attachments

- An image button in the composer (`aria-label="Send an image"`) → `uploadMedia(file)`
  → hub `Send(chatId, 'image', url, null)` (extend `sendChatMessage` with a
  `contentType` parameter, default `'text'`).
- When the echo of my own image message arrives (`ReceiveMessage` with my `senderId`
  and `contentType === 'image'`), best-effort `POST /api/message-attachments`
  `{ messageId, fileUrl: url, mediaType: 'image' }` so other clients (native) see a typed
  attachment.
- `MessageBubble` renders `contentType === 'image'` as an image (max 240px, `rounded-lg`,
  `alt="Image from {name}"`, click opens it full size in a dialog). Unknown content
  types render as text.
- Upload progress in the composer; failure keeps the composer usable and toasts.

## 4. Mute a conversation

- Chat window header menu "Mute": 8 hours / 1 week / Until I turn it back on →
  `POST /api/chat-mutes` `{ chatId, userId: me, mutedUntil }` (`null` for always).
- Muted chats: bell-off icon in the header and thread list; excluded from unread counts.
  Expired mutes are ignored and deleted best-effort.
- "Unmute" → `DELETE /api/chat-mutes/{id}`.

## 5. Pin a message

- Bubble menu "Pin" → `POST /api/chat-pins` `{ chatId, messageId }`; at most one pin
  per chat in the UI (pinning another replaces: delete the old pin first).
- A pinned bar at the top of the window shows the pinned text (one line, ellipsis);
  clicking scrolls to the message; "Unpin" → `DELETE /api/chat-pins/{id}`.

## 6. Group conversations

- Thread list "New group" → dialog: title (required, ≤ 60), pick 2+ people from the
  people I follow (`UserLine` with checkboxes), Create →
  `POST /api/chats` `{ type: 'group', title, createdBy: me }`, then participants: me with
  `role: 'owner'`, others with `role: 'member'`, sequentially; if any participant fails,
  show which ones and keep the chat.
- Group windows show the title, a participants count, the sender's name above each
  peer message, and "Seen by {n}".
- The UI is keyed by peer `userId` today (`activeChats` keyed by user). Change the key
  to `chatId` for all windows, keeping DMs' find-or-create by peer. Migrate the
  persisted `nexus_active_chats` shape: if a stored entry has no `chatId`, drop it (it
  will be rediscovered by `loadChats`).

## 7. Block from the Messenger

Chat header menu "Block {name}" (DMs only) → M4 `blockUser(userId)` and then
`POST /api/chat-blocks` `{ chatId, blockerId: me, blockedId: userId }`; the window shows
"You blocked this person" and hides the composer. Unblock removes both rows.

## 8. Tests

- Receipts: open + visible sends one receipt per unseen peer message, none for my own,
  none when hidden; "Seen" appears for the right message; unread count excludes muted chats.
- Reactions: swap sends DELETE then POST; picker reachable by keyboard.
- Attachments: `sendChatMessage(chatId, url, 'image')` invokes the hub with `'image'`
  (mock the `HubConnection` via a module mock of `@microsoft/signalr`); echo triggers
  the attachment POST; bubble renders `<img alt="Image from …">`.
- Mutes: contract bodies for the three durations (`mutedUntil` null for always); expired
  mute ignored.
- Pins: pinning a second message deletes the first pin.
- Group chat: creates chat then participants with the right roles; partial failure
  reported; windows keyed by `chatId`.
- Persisted-state migration drops entries without `chatId`.

Live smoke (`e2e-web/messenger.smoke.spec.ts`, two contexts): A messages B, B opens the
chat, A sees "Seen" after the refresh interval; A sends an image, B sees it.

## Acceptance

- [ ] Receipts, unread counts, reactions, images, mutes, pins and group chats work and
      survive reload.
- [ ] Nothing labelled live except messages; refresh cadence as specified.
- [ ] All tests pass; all gates green.
