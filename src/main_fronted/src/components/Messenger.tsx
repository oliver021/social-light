import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'motion/react';
import { ChatWindow } from './messenger/ChatWindow';

/** Phones get a full-screen chat; anything wider keeps floating windows. */
const PHONE_QUERY = '(max-width: 639px)';

/**
 * The open chat windows, keyed by chat id. Phones show one full-screen chat (the most recently
 * opened); wider screens keep up to two floating windows side by side.
 */
export const Messenger: React.FC = () => {
  const { activeChats, chatMessages, minimizeChat } = useApp();

  // A chat restored from the last visit should not take over a phone screen on load:
  // on phones, chats start minimized and open full-screen only when the user opens them.
  const startedMinimized = useRef(false);
  useEffect(() => {
    if (startedMinimized.current) return;
    startedMinimized.current = true;
    if (typeof window === 'undefined' || !window.matchMedia?.(PHONE_QUERY).matches) return;
    activeChats.filter((c) => !c.isMinimized).forEach((c) => minimizeChat(c.chatId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          // Phones show a single full-screen chat: the most recently opened one.
          const isNewestChat = idx === activeChats.length - 1;
          return (
            <Box
              key={chat.chatId}
              component={motion.div}
              initial={{ opacity: 0, y: 150, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              sx={{
                pointerEvents: 'auto',
                display: isNewestChat ? 'flex' : { xs: 'none', sm: 'flex' },
                flexDirection: 'column',
                width: { xs: '100%', sm: 310 },
                minWidth: 0,
              }}
            >
              <ChatWindow chat={chat} messages={chatMessages[chat.chatId] ?? []} />
            </Box>
          );
        })}
      </AnimatePresence>
    </Box>
  );
};
