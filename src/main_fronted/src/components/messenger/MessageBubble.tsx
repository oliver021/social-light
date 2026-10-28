import React, { useRef, useState } from 'react';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { Pin, SmilePlus } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { mediaUrl } from '../../api/gateway';
import { MESSAGE_REACTIONS, type MessageReactionType, type ReactionSummary } from '../../context/chatRules';
import { OverflowMenu, ResponsiveDialog, T, UserAvatar } from '../ui';

/** How long a touch must rest on a bubble before the reaction picker opens. */
export const LONG_PRESS_MS = 500;

export interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  /** Who sent it: the image alt text and the group sender line. */
  senderName: string;
  /** Show the sender's name above a peer message (group chats). */
  showSender: boolean;
  avatar?: string;
  reactions: ReactionSummary;
  pinned: boolean;
  onReact: (type: MessageReactionType) => void;
  onPin: () => void;
}

const touchIconSx = {
  width: 44,
  height: 44,
  p: 0,
  color: T.muted,
  borderRadius: 'var(--ui-radius-sm)',
  '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
};

/**
 * One message: text or an image, the reaction picker (hover, long press, or the keyboard
 * "React to message" button), the reaction counts under it, and a menu with Pin.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  senderName,
  showSender,
  avatar,
  reactions,
  pinned,
  onReact,
  onPin,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const isImage = message.contentType === 'image';

  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const pick = (type: MessageReactionType) => {
    setPickerOpen(false);
    onReact(type);
  };

  const bubble = isImage ? (
    <ButtonBase
      onClick={() => setImageOpen(true)}
      aria-label={`Open image from ${senderName}`}
      sx={{ borderRadius: 'var(--ui-radius-lg)', '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
    >
      <Box
        component="img"
        src={mediaUrl(message.text)}
        alt={`Image from ${senderName}`}
        className="rounded-lg"
        sx={{ display: 'block', maxWidth: 240, maxHeight: 240, width: '100%', height: 'auto', objectFit: 'cover' }}
      />
    </ButtonBase>
  ) : (
    <Box
      className={`max-w-[72%] rounded-lg px-3 py-1.5 shadow-1 ${
        isMe ? 'bg-primary text-on-primary rounded-br-none' : 'bg-surface-2 text-fg rounded-bl-none'
      }`}
      style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
    >
      <Typography variant="body2" className="text-xs font-sans leading-snug">
        {message.text}
      </Typography>
    </Box>
  );

  return (
    <Box data-message-id={message.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', minWidth: 0 }}>
      {showSender && !isMe && (
        <Typography className="text-xs text-muted font-sans" sx={{ ml: avatar !== undefined ? 4 : 0, mb: 0.25 }}>
          {senderName}
        </Typography>
      )}
      <Box
        className={`msg-row flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
        onMouseEnter={() => setPickerOpen(true)}
        onMouseLeave={() => setPickerOpen(false)}
        onPointerDown={(e) => { if (e.pointerType === 'touch') pressTimer.current = window.setTimeout(() => setPickerOpen(true), LONG_PRESS_MS); }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        sx={{ position: 'relative', maxWidth: '100%' }}
      >
        {!isMe && <UserAvatar name={senderName} src={avatar ?? ''} size="xs" />}
        {bubble}

        {/* Keyboard-reachable: the button opens the picker; each reaction is a tab stop inside it. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            opacity: 0,
            '.msg-row:hover &, &:focus-within': { opacity: 1 },
          }}
        >
          <IconButton size="small" aria-label="React to message" aria-expanded={pickerOpen} onClick={() => setPickerOpen((v) => !v)} sx={touchIconSx}>
            <SmilePlus size={18} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <OverflowMenu
            label={`More actions for this message from ${senderName}`}
            items={[{ id: 'pin', label: 'Pin message', icon: Pin, hidden: pinned, onSelect: onPin }]}
          />
        </Box>

        {pickerOpen && (
          <Box
            role="group"
            aria-label="Reactions"
            sx={{
              position: 'absolute',
              bottom: '100%',
              [isMe ? 'right' : 'left']: 0,
              display: 'flex',
              gap: 0.25,
              p: 0.5,
              bgcolor: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 'var(--ui-radius-full)',
              boxShadow: 'var(--ui-shadow-2)',
              zIndex: 1,
            }}
          >
            {MESSAGE_REACTIONS.map((r) => (
              <ButtonBase
                key={r.type}
                onClick={() => pick(r.type)}
                aria-label={`React with ${r.label}`}
                aria-pressed={reactions.mine?.reactionType === r.type}
                sx={{ width: 44, height: 44, borderRadius: 'var(--ui-radius-full)', fontSize: 18, '&.Mui-focusVisible': { outline: `2px solid ${T.focus}` } }}
              >
                <span aria-hidden="true">{r.emoji}</span>
              </ButtonBase>
            ))}
          </Box>
        )}
      </Box>

      {reactions.total > 0 && (
        <Box
          sx={{
            mt: 0.25,
            ml: isMe ? 0 : 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.75,
            py: 0.125,
            bgcolor: reactions.mine ? T.primarySoft : T.surface2,
            border: `1px solid ${T.border}`,
            borderRadius: 'var(--ui-radius-full)',
          }}
        >
          <Typography component="span" sx={{ fontSize: 'var(--ui-fs-xs)', lineHeight: 1 }}>
            {reactions.counts.map((c) => MESSAGE_REACTIONS.find((r) => r.type === c.type)?.emoji).join('')}
          </Typography>
          <Typography component="span" sx={{ fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
            {reactions.total}
          </Typography>
        </Box>
      )}

      {isImage && (
        <ResponsiveDialog open={imageOpen} onClose={() => setImageOpen(false)} title={`Image from ${senderName}`}>
          <Box component="img" src={mediaUrl(message.text)} alt={`Image from ${senderName}`} sx={{ display: 'block', width: '100%', height: 'auto' }} />
        </ResponsiveDialog>
      )}
    </Box>
  );
};
