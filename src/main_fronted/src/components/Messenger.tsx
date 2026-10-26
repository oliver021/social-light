import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { messageOf } from '../api/gateway';
import { Box, ButtonBase, Typography, IconButton, InputBase } from '@mui/material';
import { Ban, X, Minus, Send, ThumbsUp, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmptyState, OverflowMenu, T, UserAvatar } from './ui';
import type { ChatBoxState, ChatMessage } from '../types';
import { BlockConfirm } from './relationships/BlockConfirm';

/** Phones get a full-screen chat; anything wider keeps floating windows. */
const PHONE_QUERY = '(max-width: 639px)';

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

export const Messenger: React.FC = () => {
  const {
    activeChats,
    chatMessages,
    sendMessage,
    closeChat,
    minimizeChat,
    currentUser,
    showToast,
    openProfile,
  } = useApp();

  const [inputStates, setInputStates] = useState<Record<string, string>>({});

  // A chat restored from the last visit should not take over a phone screen on load:
  // on phones, chats start minimized and open full-screen only when the user opens them.
  const startedMinimized = useRef(false);
  useEffect(() => {
    if (startedMinimized.current) return;
    startedMinimized.current = true;
    if (typeof window === 'undefined' || !window.matchMedia?.(PHONE_QUERY).matches) return;
    activeChats.filter((c) => !c.isMinimized).forEach((c) => minimizeChat(c.userId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (userId: string, val: string) => {
    setInputStates((prev) => ({ ...prev, [userId]: val }));
  };

  // The composer is cleared only after the message is accepted. On failure the text stays
  // and the reason is shown.
  const handleSendClick = async (userId: string) => {
    const text = inputStates[userId] || '';
    if (!text.trim()) return;
    try {
      await sendMessage(userId, text);
      // Clear only if the user has not typed something new in the meantime.
      setInputStates((prev) => (prev[userId] === text ? { ...prev, [userId]: '' } : prev));
    } catch (err) {
      showToast(messageOf(err, 'Your message was not sent'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, userId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendClick(userId);
    }
  };

  const handleLikeClick = (userId: string) => {
    sendMessage(userId, '👍').catch((err) => showToast(messageOf(err, 'Your message was not sent')));
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        // Phones: the chat fills the space between the top bar and the bottom navigation.
        top: { xs: 'calc(var(--ui-header-h) + 8px)', sm: 'auto' },
        bottom: { xs: 'calc(var(--ui-bottomnav-h) + 8px)', md: 0 },
        left: { xs: 0, sm: 'auto' },
        right: { xs: 0, sm: 40 },
        zIndex: 50,
        display: 'flex',
        flexDirection: 'row-reverse',
        alignItems: 'flex-end',
        gap: 2,
        maxWidth: { sm: '95%' },
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <AnimatePresence>
        {activeChats.map((chat, idx) => {
          const messages = chatMessages[chat.userId] || [];
          const currentInput = inputStates[chat.userId] || '';
          // Phones show a single full-screen chat: the most recently opened one.
          const isNewestChat = idx === activeChats.length - 1;

          return (
            <ChatBox
              key={chat.userId}
              showOnMobile={isNewestChat}
              chat={chat}
              messages={messages}
              currentInput={currentInput}
              onInputChange={(val) => handleInputChange(chat.userId, val)}
              onSend={() => handleSendClick(chat.userId)}
              onKeyDown={(e) => handleKeyDown(e, chat.userId)}
              onLike={() => handleLikeClick(chat.userId)}
              onMinimize={() => minimizeChat(chat.userId)}
              onClose={() => closeChat(chat.userId)}
              onOpenProfile={() => openProfile(chat.userId)}
              currentUser={currentUser}
            />
          );
        })}
      </AnimatePresence>
    </Box>
  );
};

interface ChatBoxProps {
  showOnMobile: boolean;
  chat: ChatBoxState;
  messages: ChatMessage[];
  currentInput: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onLike: () => void;
  onMinimize: () => void;
  onClose: () => void;
  /** Opens this chat's person's profile. */
  onOpenProfile: () => void;
  currentUser: { id: string };
}

const ChatBox: React.FC<ChatBoxProps> = ({
  showOnMobile,
  chat,
  messages,
  currentInput,
  onInputChange,
  onSend,
  onKeyDown,
  onLike,
  onMinimize,
  onClose,
  onOpenProfile,
  currentUser,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [blockOpen, setBlockOpen] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chat.isMinimized]);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 150, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      id={`facebook-chat-box-${chat.userId}`}
      sx={{
        pointerEvents: 'auto',
        display: showOnMobile ? 'flex' : { xs: 'none', sm: 'flex' },
        flexDirection: 'column',
        width: { xs: '100%', sm: 310 },
        // Minimized: a 44px header. Expanded: fills the phone space (never under the bottom
        // navigation or the top bar), or a 400px floating window from 640px up.
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
        onClick={onMinimize}
        className="h-11 shrink-0 px-3 bg-surface-2 border-b border-line flex items-center justify-between cursor-pointer select-none"
      >
        <Box className="flex items-center gap-2 min-w-0">
          <UserAvatar name={chat.name} src={chat.avatar} size="xs" />
          <Box className="leading-tight min-w-0">
            {/* The name opens the person's profile; the click does not also minimize the chat. */}
            <ButtonBase
              onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
              aria-label={`Open ${chat.name}'s profile`}
              sx={{ display: 'block', maxWidth: '100%', textAlign: 'left', borderRadius: 'var(--ui-radius-sm)', '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
            >
              <Typography className="font-semibold text-fg text-xs block truncate max-w-[130px]">
                {chat.name}
              </Typography>
            </ButtonBase>
            {/* No presence is tracked yet, so the header shows the handle, never a status. */}
            {chat.handle && (
              <Typography className="text-xs text-muted font-mono block truncate max-w-[130px]">
                {chat.handle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <OverflowMenu
            label={`More actions for the chat with ${chat.name}`}
            items={[
              { id: 'block', label: `Block ${chat.name}`, icon: Ban, danger: true, onSelect: () => setBlockOpen(true) },
            ]}
          />
          <IconButton size="small" onClick={onMinimize} aria-label={`Minimize chat with ${chat.name}`} sx={touchIconSx}>
            <Minus size={16} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <IconButton size="small" onClick={onClose} aria-label={`Close chat with ${chat.name}`} sx={touchIconSx}>
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </Box>
      </Box>
      <BlockConfirm open={blockOpen} userId={chat.userId} name={chat.name} onClose={() => setBlockOpen(false)} />

      {/* CHAT BODY */}
      {!chat.isMinimized && (
        <>
          <Box
            ref={scrollRef}
            className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5 bg-page"
          >
            {messages.length === 0 ? (
              <Box className="flex flex-col items-center justify-center py-6 text-center px-4 gap-1">
                <UserAvatar name={chat.name} src={chat.avatar} size="lg" />
                <Typography className="font-bold text-fg text-xs">{chat.name}</Typography>
                {chat.handle && <Typography className="text-xs text-muted font-mono">{chat.handle}</Typography>}
                <EmptyState compact title="Say hello to start the conversation." />
              </Box>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <Box
                    key={msg.id || i}
                    className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isMe && <UserAvatar name={chat.name} src={chat.avatar} size="xs" />}
                    <Box
                      className={`max-w-[72%] rounded-lg px-3 py-1.5 shadow-1 ${
                        isMe
                          ? 'bg-primary text-on-primary rounded-br-none'
                          : 'bg-surface-2 text-fg rounded-bl-none'
                      }`}
                      style={{
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      <Typography variant="body2" className="text-xs font-sans leading-snug">
                        {msg.text}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {/* CHAT FOOTER INPUT */}
          <Box className="p-2 border-t border-line flex items-center gap-1 bg-surface">
            <IconButton size="small" aria-label="Emoji" sx={touchIconSx}>
              <Smile size={18} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>

            <Box className="flex-1 bg-surface-2 rounded-full px-3 py-1 flex items-center border border-line">
              <InputBase
                placeholder="Aa..."
                size="small"
                fullWidth
                value={currentInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                className="font-sans text-xs text-fg"
                slotProps={{
                  input: {
                    className: 'p-0 text-xs font-sans',
                    'aria-label': `Message ${chat.name}`,
                  },
                }}
              />
            </Box>

            {currentInput.trim() ? (
              <IconButton size="small" onClick={onSend} aria-label="Send message" sx={{ ...touchIconSx, color: T.primary }}>
                <Send size={18} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            ) : (
              <IconButton size="small" onClick={onLike} aria-label="Send thumbs up" sx={{ ...touchIconSx, color: T.warning }}>
                <ThumbsUp size={18} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};
