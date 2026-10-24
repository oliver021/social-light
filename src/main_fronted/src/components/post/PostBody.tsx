import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Box, Card, IconButton, Typography } from '@mui/material';
import { FileVideo, Play, Pause, ExternalLink } from 'lucide-react';
import type { Post } from '../../types';

export interface PostBodyProps {
  post: Post;
}

/** The post's text and its attachments: poll, image, video, or link preview. */
export const PostBody: React.FC<PostBodyProps> = ({ post }) => {
  const { votePoll } = useApp();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleToggleVideo = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.warn("Autoplay block:", err);
        });
      }
      setVideoPlaying(!videoPlaying);
    }
  };

  return (
    <>
    {/* CORE POST CONTENT */}
    <Typography variant="body2" className="text-zinc-850 dark:text-zinc-300 leading-relaxed text-xs break-words whitespace-pre-wrap">
      {post.content}
    </Typography>

    {/* RENDER DYNAMIC ATTACHMENTS */}
    {post.type === 'poll' && post.poll && (
      <Box className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-850 rounded-xl space-y-2.5">
        <Typography variant="subtitle2" className="font-display font-semibold text-zinc-800 dark:text-zinc-200 text-xs break-words">
          📊 {post.poll.question}
        </Typography>
      
        <Box className="space-y-2">
          {post.poll.options.map((opt) => {
            const percentage = post.poll!.totalVotes > 0 
              ? Math.round((opt.votes / post.poll!.totalVotes) * 100) 
              : 0;

            const isUserVoted = post.poll!.userVotedOptionId === opt.id;

            return (
              <Box 
                key={opt.id} 
                onClick={() => votePoll(post.id, opt.id)}
                className={`relative p-2.5 rounded-lg border cursor-pointer select-none overflow-hidden transition-all duration-350 ${
                  isUserVoted 
                  ? 'border-primary bg-primary-soft/15' 
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40'
                }`}
              >
                {/* Graphical bar progress indicator background */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-primary/10 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />

                <Box className="relative flex items-center justify-between z-10">
                  <Typography variant="caption" className={`text-xs font-medium break-words min-w-0 ${isUserVoted ? 'text-primary font-semibold' : 'text-zinc-700 dark:text-zinc-400'}`}>
                    {opt.text} {isUserVoted && '✓'}
                  </Typography>
                  <Typography variant="caption" className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {opt.votes} ({percentage}%)
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 font-mono text-xs block">
          {post.poll.totalVotes} responses counted • Click items to vote
        </Typography>
      </Box>
    )}

    {post.type === 'image' && post.imageUrl && (
      <Box className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-850 max-h-96">
        <img
          src={post.imageUrl}
          alt={post.content ? `Image attached to post: ${post.content.slice(0, 80)}` : 'Image attached to post'}
          className="w-full max-w-full object-cover max-h-96"
          referrerPolicy="no-referrer"
        />
      </Box>
    )}

    {post.type === 'video' && post.videoUrl && (
      <Box className="relative rounded-xl overflow-hidden border border-zinc-200/60 dark:border-zinc-850 bg-black aspect-video flex items-center justify-center">
        <video 
          ref={videoRef}
          aria-label={post.content ? `Video attached to post: ${post.content.slice(0, 80)}` : 'Video attached to post'}
          src={post.videoUrl}
          loop
          muted
          playsInline
          className="w-full max-w-full h-full object-cover"
        />
        {/* Custom play interface overlay */}
        <Box className="absolute inset-0 bg-black/35 hover:bg-black/20 flex items-center justify-center transition-all">
          <IconButton
            size="large"
            aria-label={videoPlaying ? 'Pause video' : 'Play video'}
            onClick={handleToggleVideo}
            className="bg-white/90 hover:bg-white text-zinc-900 p-2.5 shadow-xl"
          >
            {videoPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </IconButton>
        </Box>
        <Box className="absolute bottom-2.5 left-2.5 bg-zinc-900/70 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-1.5 border border-zinc-700/50">
          <FileVideo className="w-3" color="var(--ui-accent)" />
          <Typography variant="caption" className="font-mono text-xs text-zinc-300">
            Interactive video preview
          </Typography>
        </Box>
      </Box>
    )}

    {post.type === 'link' && post.linkUrl && (
      <Card 
        variant="outlined" 
        className="rounded-xl border border-zinc-200 dark:border-zinc-850 overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-primary transition-all cursor-pointer flex flex-col md:flex-row"
        onClick={() => window.open(post.linkUrl, '_blank')}
      >
        {post.linkImage && (
          <img 
            src={post.linkImage}
            alt={post.linkTitle ? `Preview image for ${post.linkTitle}` : 'Link preview image'}
            className="w-full md:w-32 h-24 object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
        )}
        <Box className="p-3 flex flex-col justify-between min-w-0">
          <Box className="min-w-0">
            <Typography variant="subtitle2" className="font-display font-bold text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-1 break-all text-xs">
              {post.linkTitle}
            </Typography>
            <Typography variant="caption" className="text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed text-xs break-words">
              {post.linkDesc}
            </Typography>
          </Box>
          <Box className="flex items-center gap-1 mt-1 text-xs font-mono text-primary dark:text-primary">
            <ExternalLink className="w-3 h-3" />
            Source: chromium.org
          </Box>
        </Box>
      </Card>
    )}
    </>
  );
};
