import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { messageOf } from '../api/gateway';
import { 
  Box, 
  Typography, 
  Avatar, 
  IconButton, 
  InputBase 
} from '@mui/material';
import { 
  X, 
  Minus, 
  Send, 
  ThumbsUp, 
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/** Phones get a full-screen chat; anything wider keeps floating windows. */
const PHONE_QUERY = '(max-width: 639px)';

export const Messenger: React.FC = () => {
  const { 
    activeChats, 
    chatMessages, 
    sendMessage, 
    closeChat, 
    minimizeChat, 
    currentUser,
    showToast
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
    setInputStates(prev => ({ ...prev, [userId]: val }));
  };

  // The composer is cleared only after the message is accepted. On failure the text stays
  // and the reason is shown.
  const handleSendClick = async (userId: string) => {
    const text = inputStates[userId] || '';
    if (!text.trim()) return;
    try {
      await sendMessage(userId, text);
      // Clear only if the user has not typed something new in the meantime.
      setInputStates(prev => (prev[userId] === text ? { ...prev, [userId]: '' } : prev));
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
    <Box className="fixed bottom-0 top-14 left-0 right-0 sm:top-auto sm:left-auto sm:right-10 z-50 flex flex-row-reverse items-end gap-4 pointer-events-none sm:max-w-[95%] overflow-visible">
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
  chat: any;
  messages: any[];
  currentInput: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onLike: () => void;
  onMinimize: () => void;
  onClose: () => void;
  currentUser: any;
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
  currentUser
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chat.isMinimized]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 150, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      id={`facebook-chat-box-${chat.userId}`}
      className={`pointer-events-auto ${showOnMobile ? 'flex' : 'hidden sm:flex'} flex-col w-full sm:w-[310px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-t-2xl shadow-2xl ${
        chat.isMinimized ? 'h-11 mb-14 sm:mb-0' : 'h-full sm:h-[400px] sm:max-h-[440px]'
      }`}
    >
      {/* CHAT HEADER */}
      <Box 
        onClick={onMinimize}
        className="h-11 shrink-0 px-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between cursor-pointer rounded-none sm:rounded-t-2xl select-none"
      >
        <Box className="flex items-center gap-2 min-w-0">
          <Avatar src={chat.avatar} alt={chat.name} className="w-6.5 h-6.5 scale-90" />
          <Box className="leading-tight min-w-0">
            <Typography variant="caption" className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs block truncate max-w-[130px]">
              {chat.name}
            </Typography>
            {/* No presence is tracked yet, so the header shows the handle, never a status. */}
            {chat.handle && (
              <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-mono block truncate max-w-[130px]">
                {chat.handle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <TooltipIconButton title={`Minimize chat with ${chat.name}`} onClick={onMinimize}>
            <Minus className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          </TooltipIconButton>
          <TooltipIconButton title={`Close chat with ${chat.name}`} onClick={onClose}>
            <X className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          </TooltipIconButton>
        </Box>
      </Box>

      {/* CHAT BODY */}
      {!chat.isMinimized && (
        <>
          <Box 
            ref={scrollRef}
            className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5 bg-zinc-50/40 dark:bg-zinc-950/20 sm:max-h-[295px]"
          >
            {messages.length === 0 ? (
              <Box className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Avatar src={chat.avatar} alt={chat.name} className="w-14 h-14 mb-2 shadow-md border-2 border-zinc-100 dark:border-zinc-800" />
                <Typography variant="body2" className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  {chat.name}
                </Typography>
                {chat.handle && (
                  <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {chat.handle}
                  </Typography>
                )}
                <Typography variant="caption" className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 block italic">
                  Say hello to start the conversation.
                </Typography>
              </Box>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <Box 
                    key={msg.id || i}
                    className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isMe && (
                      <Avatar src={chat.avatar} alt={chat.name} className="w-5.5 h-5.5 scale-90 mb-0.5 shrink-0" />
                    )}
                    <Box 
                      className={`max-w-[72%] rounded-2xl px-3 py-1.5 text-xs shadow-sm ${
                        isMe 
                          ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white rounded-br-none' 
                          : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-800 dark:text-zinc-200 rounded-bl-none'
                      }`}
                      style={{
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
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
          <Box className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1 bg-white dark:bg-zinc-950">
            <IconButton size="small" aria-label="Emoji" className="w-11 h-11 sm:w-8 sm:h-8 p-0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-600">
              <Smile className="w-4 h-4" />
            </IconButton>

            <Box className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-full px-3 py-1 flex items-center border border-zinc-200/50 dark:border-zinc-800/60">
              <InputBase
                placeholder="Aa..."
                size="small"
                fullWidth
                value={currentInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                className="font-sans text-xs text-zinc-800 dark:text-zinc-100"
                slotProps={{
                  input: {
                    className: 'p-0 text-xs font-sans',
                    'aria-label': `Message ${chat.name}`
                  }
                }}
              />
            </Box>

            {currentInput.trim() ? (
              <IconButton
                size="small"
                color="primary"
                onClick={onSend}
                aria-label="Send message"
                className="w-11 h-11 sm:w-8 sm:h-8 p-0 text-blue-500 hover:text-blue-600"
              >
                <Send className="w-4 h-4 rotate-0" />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                onClick={onLike}
                aria-label="Send thumbs up"
                className="w-11 h-11 sm:w-8 sm:h-8 p-0 text-amber-500 hover:text-amber-600"
              >
                <ThumbsUp className="w-4 h-4" />
              </IconButton>
            )}
          </Box>
        </>
      )}
    </motion.div>
  );
};

const TooltipIconButton: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({
  title,
  onClick,
  children
}) => (
  <IconButton
    size="small"
    onClick={onClick}
    aria-label={title}
    className="w-11 h-11 sm:w-7 sm:h-7 p-0 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 rounded"
  >
    {children}
  </IconButton>
);
