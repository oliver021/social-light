import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostComposer } from './PostComposer';
import { makePost } from './fixtures';
import type { Post } from '../../types';

const designClub = { kind: 'group' as const, id: 'g1', name: 'Design Club' };

describe('PostComposer', () => {
  it('posts to home with the home target and an empty attachment payload for text', async () => {
    const createPostIn = vi.fn(async () => makePost());
    const onPosted = vi.fn();
    const { user } = renderWithProviders(<PostComposer target={{ kind: 'home' }} onPosted={onPosted} />, { context: { createPostIn } });
    await user.type(screen.getByRole('textbox', { name: 'Post text' }), 'Hello');
    await user.click(screen.getByRole('button', { name: /^Post$/ }));
    await waitFor(() => expect(createPostIn).toHaveBeenCalledWith({ kind: 'home' }, 'Hello', 'text', {}));
    expect(onPosted).toHaveBeenCalledWith(expect.objectContaining({ id: 'post-1' }));
  });

  it('posts into a community with that community as the target, and clears the text after success', async () => {
    const createPostIn = vi.fn(async () => makePost());
    const { user } = renderWithProviders(
      <PostComposer target={designClub} placeholder="Share something with Design Club" label="Post in Design Club" />,
      { context: { createPostIn } },
    );
    const box = screen.getByRole('textbox', { name: 'Post in Design Club' });
    expect(box).toHaveAttribute('placeholder', 'Share something with Design Club');
    await user.type(box, 'Hi all');
    await user.click(screen.getByRole('button', { name: /^Post$/ }));
    await waitFor(() => expect(createPostIn).toHaveBeenCalledWith(designClub, 'Hi all', 'text', {}));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Post in Design Club' })).toHaveValue(''));
  });

  it('when the post is refused, keeps the text and shows the server reason inline', async () => {
    const createPostIn = vi.fn(async () => {
      throw new Error('Your post was not added to the community: Not a member');
    });
    const onPosted = vi.fn();
    const { user } = renderWithProviders(<PostComposer target={designClub} />, { context: { createPostIn } });
    await user.type(screen.getByRole('textbox', { name: 'Post text' }), 'Lost words');
    await user.click(screen.getByRole('button', { name: /^Post$/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your post was not added to the community: Not a member');
    expect(screen.getByRole('textbox', { name: 'Post text' })).toHaveValue('Lost words');
    expect(onPosted).not.toHaveBeenCalled();
  });

  it('the Post button is disabled while the post is in flight, so one click sends once', async () => {
    let finish: () => void = () => {};
    const createPostIn = vi.fn(() => new Promise<Post>((resolve) => {
      finish = () => resolve(makePost());
    }));
    const { user } = renderWithProviders(<PostComposer target={{ kind: 'home' }} />, { context: { createPostIn } });
    await user.type(screen.getByRole('textbox', { name: 'Post text' }), 'Once');
    const submit = screen.getByRole('button', { name: /^Post$/ });
    await user.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    expect(createPostIn).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Post text' })).toHaveValue(''));
  });

  it('an image post cannot be sent until an image is attached', async () => {
    const createPostIn = vi.fn(async () => makePost());
    const { user } = renderWithProviders(<PostComposer target={{ kind: 'home' }} />, { context: { createPostIn } });
    await user.type(screen.getByRole('textbox', { name: 'Post text' }), 'Look');
    await user.click(screen.getByRole('button', { name: 'Attach image' }));
    expect(screen.getByRole('button', { name: /^Post$/ })).toBeDisabled();
    expect(createPostIn).not.toHaveBeenCalled();
  });

  it('a link post sends the link fields it was given', async () => {
    const createPostIn = vi.fn(async () => makePost());
    const { user } = renderWithProviders(<PostComposer target={designClub} />, { context: { createPostIn } });
    await user.type(screen.getByRole('textbox', { name: 'Post text' }), 'Read this');
    await user.click(screen.getByRole('button', { name: 'Attach link' }));
    await user.type(screen.getByRole('textbox', { name: 'Link' }), 'https://example.com/a');
    await user.click(screen.getByRole('button', { name: /^Post$/ }));
    await waitFor(() => expect(createPostIn).toHaveBeenCalledTimes(1));
    expect(createPostIn).toHaveBeenCalledWith(designClub, 'Read this', 'link', {
      title: 'Shared link',
      linkUrl: 'https://example.com/a',
      linkTitle: 'https://example.com/a',
      linkDesc: '',
    });
  });

  it('a poll needs a question and two options before it can be sent', async () => {
    const createPostIn = vi.fn(async () => makePost());
    const { user } = renderWithProviders(<PostComposer target={{ kind: 'home' }} />, { context: { createPostIn } });
    await user.click(screen.getByRole('button', { name: 'Add poll' }));
    await user.type(screen.getByRole('textbox', { name: 'Question' }), 'Tea or coffee?');
    expect(screen.getByRole('button', { name: /^Post$/ })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Option 1' }), 'Tea');
    await user.type(screen.getByRole('textbox', { name: 'Option 2' }), 'Coffee');
    await user.click(screen.getByRole('button', { name: /^Post$/ }));
    await waitFor(() => expect(createPostIn).toHaveBeenCalledTimes(1));
    const [target, text, type, extra] = createPostIn.mock.calls[0] as unknown as [unknown, string, string, { poll: { question: string; options: { text: string }[] } }];
    expect(target).toEqual({ kind: 'home' });
    expect(text).toBe('');
    expect(type).toBe('poll');
    expect(extra.poll.question).toBe('Tea or coffee?');
    expect(extra.poll.options.map((o) => o.text)).toEqual(['Tea', 'Coffee']);
  });
});
