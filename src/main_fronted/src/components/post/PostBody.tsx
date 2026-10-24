import React from 'react';
import { useApp } from '../../context/AppContext';
import { Box, ButtonBase, Card, Typography } from '@mui/material';
import { BarChart4, ExternalLink } from 'lucide-react';
import type { Post } from '../../types';
import { mediaUrl } from '../../api/gateway';
import { T } from '../ui/tokens';

export interface PostBodyProps {
  post: Post;
}

const ALT_TEXT_LIMIT = 120;

/** Alt text for a post image: the post text (truncated), or the author when there is no text. */
export function postImageAlt(post: Pick<Post, 'content' | 'author'>): string {
  const text = post.content.trim();
  if (!text) return `Image posted by ${post.author.name}`;
  return text.length > ALT_TEXT_LIMIT ? `${text.slice(0, ALT_TEXT_LIMIT)}…` : text;
}

/** Only http(s) links are rendered as links. A user-posted javascript: or data: url is not. */
export function safeHttpUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** The post's text and its attachments: poll, image, video, or link preview. */
export const PostBody: React.FC<PostBodyProps> = ({ post }) => {
  const { votePoll } = useApp();
  const linkHref = safeHttpUrl(post.linkUrl);
  const linkHost = linkHref ? new URL(linkHref).hostname : null;

  return (
    <>
      {/* CORE POST CONTENT */}
      <Typography sx={{ color: T.text, fontSize: 'var(--ui-fs-base)', lineHeight: 1.5, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
        {post.content}
      </Typography>

      {/* POLL: each option is a button, so the vote works from the keyboard too */}
      {post.type === 'poll' && post.poll && (
        <Box sx={{ p: 1.5, bgcolor: T.surface2, border: `1px solid ${T.border}`, borderRadius: 'var(--ui-radius-lg)', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--ui-fs-sm)', color: T.text, display: 'flex', alignItems: 'center', gap: 1, overflowWrap: 'anywhere' }}>
            <BarChart4 aria-hidden="true" size={18} strokeWidth={1.75} color={T.accent} />
            {post.poll.question}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {post.poll.options.map((opt) => {
              const totalVotes = post.poll!.totalVotes;
              const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
              const isUserVoted = post.poll!.userVotedOptionId === opt.id;

              return (
                <ButtonBase
                  key={opt.id}
                  onClick={() => votePoll(post.id, opt.id)}
                  aria-label={`Vote for ${opt.text}`}
                  aria-pressed={isUserVoted}
                  sx={{
                    position: 'relative',
                    display: 'block',
                    width: '100%',
                    minHeight: 44,
                    px: 1.5,
                    py: 1,
                    textAlign: 'left',
                    overflow: 'hidden',
                    borderRadius: 'var(--ui-radius-sm)',
                    border: `1px solid ${isUserVoted ? T.primary : T.border}`,
                    bgcolor: T.surface,
                    transition: `background-color var(--ui-dur) var(--ui-ease), border-color var(--ui-dur) var(--ui-ease)`,
                    '&:hover': { bgcolor: T.surface2 },
                    '&:active': { bgcolor: T.surface3 },
                    '&.Mui-focusVisible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      position: 'absolute',
                      inset: '0 auto 0 0',
                      width: `${percentage}%`,
                      bgcolor: T.primarySoft,
                      transition: `width var(--ui-dur) var(--ui-ease)`,
                    }}
                  />
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 'var(--ui-fs-sm)', fontWeight: isUserVoted ? 600 : 500, color: isUserVoted ? T.primary : T.text, overflowWrap: 'anywhere', minWidth: 0 }}>
                      {opt.text}{isUserVoted ? ' ✓' : ''}
                    </Typography>
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted, flexShrink: 0 }}>
                      {opt.votes} ({percentage}%)
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.muted }}>
            {post.poll.totalVotes} {post.poll.totalVotes === 1 ? 'response' : 'responses'} · Select an option to vote
          </Typography>
        </Box>
      )}

      {post.type === 'image' && post.imageUrl && (
        <Box sx={{ borderRadius: 'var(--ui-radius-lg)', overflow: 'hidden', border: `1px solid ${T.border}`, bgcolor: T.surface2 }}>
          <Box
            component="img"
            src={mediaUrl(post.imageUrl)}
            alt={postImageAlt(post)}
            referrerPolicy="no-referrer"
            sx={{ display: 'block', width: '100%', maxWidth: '100%', maxHeight: 560, objectFit: 'cover' }}
          />
        </Box>
      )}

      {post.type === 'video' && post.videoUrl && (
        <Box sx={{ borderRadius: 'var(--ui-radius-lg)', overflow: 'hidden', border: `1px solid ${T.border}`, bgcolor: 'black' }}>
          <Box
            component="video"
            aria-label={post.content ? `Video posted by ${post.author.name}` : 'Video attached to post'}
            src={mediaUrl(post.videoUrl)}
            controls
            playsInline
            preload="metadata"
            sx={{ display: 'block', width: '100%', maxWidth: '100%', maxHeight: 560, bgcolor: 'black' }}
          />
        </Box>
      )}

      {post.type === 'link' && post.linkUrl && (
        <Card
          variant="outlined"
          component={linkHref ? 'a' : 'div'}
          href={linkHref ?? undefined}
          target={linkHref ? '_blank' : undefined}
          rel={linkHref ? 'noopener noreferrer' : undefined}
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            overflow: 'hidden',
            borderRadius: 'var(--ui-radius-lg)',
            borderColor: T.border,
            bgcolor: T.surface2,
            color: 'inherit',
            textDecoration: 'none',
            boxShadow: 'none',
            transition: `background-color var(--ui-dur) var(--ui-ease)`,
            '&:hover': { bgcolor: T.surface3 },
            '&:focus-visible': { outline: `2px solid ${T.focus}`, outlineOffset: 2 },
          }}
        >
          {post.linkImage && (
            <Box
              component="img"
              src={mediaUrl(post.linkImage)}
              alt={post.linkTitle ? `Preview image for ${post.linkTitle}` : 'Link preview image'}
              referrerPolicy="no-referrer"
              sx={{ width: { xs: '100%', md: 128 }, height: 96, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 0.5, minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--ui-fs-sm)', color: T.text, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {post.linkTitle}
              </Typography>
              {post.linkDesc && (
                <Typography sx={{ mt: 0.5, fontSize: 'var(--ui-fs-xs)', color: T.muted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>
                  {post.linkDesc}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--ui-fs-xs)', color: T.primary }}>
              <ExternalLink aria-hidden="true" size={14} strokeWidth={1.75} />
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {linkHost ? linkHost : 'Link not available'}
              </Box>
            </Box>
          </Box>
        </Card>
      )}
    </>
  );
};
