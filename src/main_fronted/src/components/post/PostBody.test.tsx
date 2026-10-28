import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostBody, postImageAlt, safeHttpUrl } from './PostBody';
import { makePost } from './fixtures';

describe('PostBody', () => {
  it('a poll option is a named button that votes for that option', async () => {
    const post = makePost({
      id: 'poll-1',
      type: 'poll',
      poll: {
        question: 'Best colour?',
        totalVotes: 2,
        options: [
          { id: 'opt-a', text: 'Red', votes: 1 },
          { id: 'opt-b', text: 'Blue', votes: 1 },
        ],
      },
    });
    const { user, ctx } = renderWithProviders(<PostBody post={post} />);
    expect(screen.getByText('Best colour?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vote for Blue' }));
    expect(ctx.votePoll).toHaveBeenCalledWith('poll-1', 'opt-b');
  });

  it('marks the option the viewer already voted for as pressed', () => {
    const post = makePost({
      type: 'poll',
      poll: {
        question: 'Q',
        totalVotes: 1,
        userVotedOptionId: 'opt-a',
        options: [{ id: 'opt-a', text: 'Red', votes: 1 }],
      },
    });
    renderWithProviders(<PostBody post={post} />);
    expect(screen.getByRole('button', { name: 'Vote for Red' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('an image post has alt text from the post text, truncated to 120 characters', () => {
    const long = 'x'.repeat(200);
    const post = makePost({ type: 'image', imageUrl: '/bff/blobs/a.png', content: long });
    const { container } = renderWithProviders(<PostBody post={post} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('alt')).toBe(`${'x'.repeat(120)}…`);
  });

  it('renders a stored /bff media url with a single /bff prefix (image and video)', () => {
    const { container } = renderWithProviders(
      <>
        <PostBody post={makePost({ type: 'image', imageUrl: '/bff/blobs/a.png', content: 'Pic' })} />
        <PostBody post={makePost({ type: 'video', videoUrl: '/bff/blobs/v.mp4', content: 'Clip' })} />
      </>,
    );
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/bff/blobs/a.png');
    expect(container.querySelector('video')!.getAttribute('src')).toBe('/bff/blobs/v.mp4');
    expect(container.innerHTML).not.toContain('/bff/bff/');
  });

  it('an image post with no text is described by its author', () => {
    const post = makePost({ type: 'image', imageUrl: '/bff/blobs/a.png', content: '' });
    const { container } = renderWithProviders(<PostBody post={post} />);
    expect(container.querySelector('img')!.getAttribute('alt')).toBe('Image posted by Ana Ruiz');
  });

  it('a video post has native controls and no custom play overlay', () => {
    const post = makePost({ type: 'video', videoUrl: '/bff/blobs/v.mp4', content: 'Clip' });
    const { container } = renderWithProviders(<PostBody post={post} />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('controls');
    expect(screen.queryByRole('button', { name: /play video/i })).toBeNull();
  });

  it('a link post links to its https url and shows the host, not a hard-coded source', () => {
    const post = makePost({ type: 'link', linkUrl: 'https://example.com/story', linkTitle: 'A story', linkDesc: '' });
    renderWithProviders(<PostBody post={post} />);
    const link = screen.getByRole('link', { name: /A story/ });
    expect(link).toHaveAttribute('href', 'https://example.com/story');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.queryByText(/chromium/i)).toBeNull();
  });

  it('a link post with a javascript: url is not rendered as a link', () => {
    const post = makePost({ type: 'link', linkUrl: 'javascript:alert(1)', linkTitle: 'Bad', linkDesc: '' });
    renderWithProviders(<PostBody post={post} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Link not available')).toBeInTheDocument();
  });
});

describe('post helpers', () => {
  it('postImageAlt falls back to the author when the text is blank', () => {
    expect(postImageAlt(makePost({ content: '   ' }))).toBe('Image posted by Ana Ruiz');
  });

  it('safeHttpUrl accepts only http and https', () => {
    expect(safeHttpUrl('https://a.test/x')).toBe('https://a.test/x');
    expect(safeHttpUrl('http://a.test')).toBe('http://a.test/');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,hi')).toBeNull();
    expect(safeHttpUrl('not a url')).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
