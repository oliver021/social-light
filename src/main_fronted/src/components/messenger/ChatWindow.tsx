import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonBase, IconButton, InputBase, LinearProgress, Typography } from '@mui/material';
import { Ban, Bell, BellOff, Minus, Pin, Image as ImageIcon, Send, ThumbsUp, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { messageOf } from '../../api/gateway';
import { pinOf, seenByUsers, summarizeReactions, type MuteChoice } from '../../context/chatRules';
import type { ChatBoxState, ChatMessage } from '../../types';
import { ConfirmDialog, EmptyState, OverflowMenu, T, UserAvatar } from '../ui';
import { MessageBubble } from './MessageBubble';
import type { MessageReactionType } from '../../context/chatRules';

/** A 44px target for every icon button in the chat windows (WCAG 2.5.5). */
const touchIconSx = {
  width: 44,
  height: 44,
  p: 0,
  color: T.muted,
  borderRadius: 'var(--ui-radius-sm)',
  '&:hover': { bgcolor: T.surface3 },
  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
};

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export interface ChatWindowProps {
  chat: ChatBoxState;
  messages: ChatMessage[];
}

/**
 * One conversation window: header (name, unread badge, mute state, menu with Mute and Block),
 * the pinned bar, the messages with reactions and "Seen", and the composer (text and images).
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, messages }) => {
  const {
    currentUser,
    chatMeta,
    memberNames,
    chatThreads,
    isChatMuted,
    sendMessage,
    sendImage,
    reactToMessage,
    pinMessage,
    unpinMessage,
    muteChat,
    unmuteChat,
    minimizeChat,
    closeChat,
    openProfile,
    blockUser,
    blockInChat,
    showToast,
  } = useApp();

  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const me = currentUser.id;
  const isGroup = chat.kind === 'group';
  const muted = isChatMuted(chat.chatId);
  const unreadCount = chatThreads.find((t) => t.chatId === chat.chatId)?.unreadCount ?? 0;
  const pin = pinOf(chat.chatId, chatMeta.pins);
  const pinnedMessage = pin ? messages.find((m) => m.id === pin.messageId) : undefined;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, chat.isMinimized]);

  const nameOf = (senderId: string) => (senderId === me ? currentUser.name : memberNames[senderId] ?? chat.name);

  // "Seen" sits under my latest message that someone else has read.
  let seenOn: { id: string; seenBy: string[] } | null = null;
  for (let i = messages.length - 1; i >= 0 && !seenOn; i--) {
    const m = messages[i];
    if (m.senderId !== me) continue;
    const seenBy = seenByUsers(m.id, chatMeta.receipts, me);
    if (seenBy.length > 0) seenOn = { id: m.id, seenBy };
  }

  const send = async () => {
    const text = draft;
    if (!text.trim()) return;
    try {
      await sendMessage(chat.chatId, text);
      // Clear only if the user has not typed something new in the meantime.
      setDraft((prev) => (prev === text ? '' : prev));
    } catch (err) {
      showToast(messageOf(err, 'Your message was not sent'));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  const thumbsUp = () => {
    sendMessage(chat.chatId, '👍').catch((err) => showToast(messageOf(err, 'Your message was not sent')));
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(0);
    try {
      await sendImage(chat.chatId, file, (percent) => setUploading(percent));
    } catch (err) {
      // The composer stays usable: only the image is dropped.
      showToast(messageOf(err, 'Your image was not sent'));
    } finally {
      setUploading(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const scrollToMessage = (messageId: string) => {
    scrollRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)?.scrollIntoView({ block: 'center' });
  };

  const peerId = chat.userId;
  const menuItems = [
    ...(muted
      ? [{ id: 'unmute', label: 'Unmute', icon: Bell, onSelect: () => { unmuteChat(chat.chatId); } }]
      : (['eight_hours', 'one_week', 'always'] as MuteChoice[]).map((choice) => ({
          id: `mute-${choice}`,
          label: choice === 'eight_hours' ? 'Mute for 8 hours' : choice === 'one_week' ? 'Mute for 1 week' : 'Mute until I turn it back on',
          icon: BellOff,
          onSelect: () => { muteChat(chat.chatId, choice); },
        }))),
    { id: 'block', label: `Block ${chat.name}`, icon: Ban, danger: true, hidden: isGroup, onSelect: () => setBlockOpen(true) },
  ];

  return (
    <Box
      id={`chat-window-${chat.chatId}`}
      sx={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: chat.isMinimized ? 44 : { xs: '100%', sm: 400 },
        maxHeight: chat.isMinimized
          ? 44
          : { xs: 'calc(100dvh - var(--ui-header-h) - var(--ui-bottomnav-h) - 16px)', sm: 440 },
        bgcolor: T.surface,
        color: T.text,
        border: `1px solid ${T.border}`,
        borderRadius: { xs: 0, sm: 'var(--ui-radius-lg) var(--ui-radius-lg) 0 0' },
        boxShadow: 'var(--ui-shadow-2)',
        overflow: 'hidden',
      }}
    >
      {/* CHAT HEADER */}
      <Box
        onClick={() => minimizeChat(chat.chatId)}
        className="h-11 shrink-0 px-3 bg-surface-2 border-b border-line flex items-center justify-between cursor-pointer select-none"
      >
        <Box className="flex items-center gap-2 min-w-0">
          <UserAvatar name={chat.name} src={chat.avatar} size="xs" />
          <Box className="leading-tight min-w-0">
            {isGroup ? (
              <Typography className="font-semibold text-fg text-xs block truncate max-w-[130px]">{chat.name}</Typography>
            ) : (
              // The name opens the person's profile; the click does not also minimize the chat.
              <ButtonBase
                onClick={(e) => { e.stopPropagation(); openProfile(peerId); }}
                aria-label={`Open ${chat.name}'s profile`}
                sx={{ display: 'block', maxWidth: '100%', textAlign: 'left', borderRadius: 'var(--ui-radius-sm)', '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
              >
                <Typography className="font-semibold text-fg text-xs block truncate max-w-[130px]">{chat.name}</Typography>
              </ButtonBase>
            )}
            {isGroup ? (
              <Typography className="text-xs text-muted block truncate max-w-[130px]">
                {chatThreads.find((t) => t.chatId === chat.chatId)?.memberCount ?? 0} members
              </Typography>
            ) : (
              chat.handle && <Typography className="text-xs text-muted font-mono block truncate max-w-[130px]">{chat.handle}</Typography>
            )}
          </Box>
        </Box>

        <Box className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {muted && (
            <Box role="img" aria-label="Muted" sx={{ display: 'flex', alignItems: 'center', px: 0.5, color: T.muted }}>
              <BellOff size={14} strokeWidth={1.75} aria-hidden="true" />
            </Box>
          )}
          {unreadCount > 0 && (
            <Box aria-label={`${unreadCount} unread`} sx={{ minWidth: 20, px: 0.75, borderRadius: 'var(--ui-radius-full)', bgcolor: T.primary, color: T.onPrimary, fontSize: 'var(--ui-fs-xs)', textAlign: 'center', lineHeight: '20px' }}>
              {unreadCount}
            </Box>
          )}
          <OverflowMenu label={`More actions for the chat with ${chat.name}`} items={menuItems} />
          <IconButton size="small" onClick={() => minimizeChat(chat.chatId)} aria-label={`Minimize chat with ${chat.name}`} sx={touchIconSx}>
            <Minus size={16} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <IconButton size="small" onClick={() => closeChat(chat.chatId)} aria-label={`Close chat with ${chat.name}`} sx={touchIconSx}>
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </Box>
      </Box>
      {!isGroup && (
        <ConfirmDialog
          open={blockOpen}
          title={`Block ${chat.name}?`}
          body="You won't see their posts, comments or messages. They won't be told."
          confirmLabel="Block"
          destructive
          onConfirm={async () => {
            // A refused block shows its reason as a toast; the window closes with the block (M4).
            const ok = await blockUser(peerId);
            if (ok) await blockInChat(chat.chatId, peerId).catch((err) => showToast(messageOf(err, 'The chat was not blocked')));
          }}
          onClose={() => setBlockOpen(false)}
        />
      )}

      {/* CHAT BODY */}
      {!chat.isMinimized && (
        <>
          {pin && (
            <Box className="px-2 py-1 border-b border-line bg-surface flex items-center gap-1" sx={{ minWidth: 0 }}>
              <Pin size={14} strokeWidth={1.75} aria-hidden="true" style={{ color: T.muted, flexShrink: 0 }} />
              <ButtonBase
                onClick={() => scrollToMessage(pin.messageId)}
                aria-label="Go to the pinned message"
                sx={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 'var(--ui-radius-sm)' }}
              >
                <Typography noWrap className="text-xs text-fg">
                  {pinnedMessage ? (pinnedMessage.contentType === 'image' ? 'Photo' : pinnedMessage.text) : 'Pinned message'}
                </Typography>
              </ButtonBase>
              <Button size="small" onClick={() => unpinMessage(chat.chatId)} aria-label="Unpin message" sx={{ minHeight: 44, textTransform: 'none', color: T.primary }}>
                Unpin
              </Button>
            </Box>
          )}

          <Box ref={scrollRef} className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5 bg-page">
            {messages.length === 0 ? (
              <Box className="flex flex-col items-center justify-center py-6 text-center px-4 gap-1">
                <UserAvatar name={chat.name} src={chat.avatar} size="lg" />
                <Typography className="font-bold text-fg text-xs">{chat.name}</Typography>
                {chat.handle && <Typography className="text-xs text-muted font-mono">{chat.handle}</Typography>}
                <EmptyState compact title="Say hello to start the conversation." />
              </Box>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === me;
                const seenHere = seenOn?.id === msg.id ? seenOn : null;
                return (
                  <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <MessageBubble
                      message={msg}
                      isMe={isMe}
                      senderName={nameOf(msg.senderId)}
                      showSender={isGroup}
                      avatar={isMe ? undefined : chat.avatar}
                      reactions={summarizeReactions(msg.id, chatMeta.reactions, me)}
                      pinned={pin?.messageId === msg.id}
                      onReact={(type: MessageReactionType) => reactToMessage(msg.id, type).catch(() => {})}
                      onPin={() => pinMessage(chat.chatId, msg.id)}
                    />
                    {seenHere && (
                      <Typography
                        aria-label={isGroup ? `Seen by ${seenHere.seenBy.length}` : `Seen by ${chat.name}`}
                        className="text-xs"
                        sx={{ color: T.subtle, alignSelf: 'flex-end' }}
                      >
                        {isGroup ? `Seen by ${seenHere.seenBy.length}` : 'Seen'}
                      </Typography>
                    )}
                  </Box>
                );
              })
            )}
          </Box>

          {uploading !== null && (
            <LinearProgress variant="determinate" value={uploading} aria-label="Image upload progress" sx={{ height: 3 }} />
          )}

          {/* CHAT FOOTER INPUT */}
          <Box className="p-2 border-t border-line flex items-center gap-1 bg-surface">
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_ACCEPT}
              hidden
              onChange={(e) => onPickImage(e.target.files?.[0])}
              aria-hidden="true"
              tabIndex={-1}
            />
            <IconButton size="small" aria-label="Send an image" onClick={() => fileRef.current?.click()} disabled={uploading !== null} sx={touchIconSx}>
              <ImageIcon size={18} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>

            <Box className="flex-1 bg-surface-2 rounded-full px-3 py-1 flex items-center border border-line">
              <InputBase
                placeholder="Aa..."
                size="small"
                fullWidth
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                className="font-sans text-xs text-fg"
                slotProps={{ input: { className: 'p-0 text-xs font-sans', 'aria-label': `Message ${chat.name}` } }}
              />
            </Box>

            {draft.trim() ? (
              <IconButton size="small" onClick={send} aria-label="Send message" sx={{ ...touchIconSx, color: T.primary }}>
                <Send size={18} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            ) : (
              <IconButton size="small" onClick={thumbsUp} aria-label="Send thumbs up" sx={{ ...touchIconSx, color: T.warning }}>
                <ThumbsUp size={18} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};
