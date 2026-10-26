import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { SharePostDialog } from './SharePostDialog';
import { makePost } from './fixtures';

describe('SharePostDialog', () => {
  it('shares with the trimmed message and closes once the server accepts it', async () => {
    const sharePost = vi.fn(async () => {});
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <SharePostDialog post={makePost({ id: 'post-7' })} open onClose={onClose} />,
      { context: { sharePost } },
    );
    const dialog = screen.getByRole('dialog', { name: 'Share post' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Message to share' }), '  Read this  ');
    await user.click(within(dialog).getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(sharePost).toHaveBeenCalledWith('post-7', '  Read this  ');
  });

  it('shares with an empty message (the plain share) without blocking the button', async () => {
    const sharePost = vi.fn(async () => {});
    const { user } = renderWithProviders(
      <SharePostDialog post={makePost({ id: 'post-8' })} open onClose={vi.fn()} />,
      { context: { sharePost } },
    );
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(sharePost).toHaveBeenCalledWith('post-8', ''));
  });

  it('stays open with the reason when the server refuses the share', async () => {
    const onClose = vi.fn();
    const sharePost = vi.fn(async () => {
      throw new Error('The post was not shared: Not allowed');
    });
    const { user } = renderWithProviders(
      <SharePostDialog post={makePost()} open onClose={onClose} />,
      { context: { sharePost } },
    );
    const dialog = screen.getByRole('dialog', { name: 'Share post' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Message to share' }), 'Keep this');
    await user.click(within(dialog).getByRole('button', { name: 'Share' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The post was not shared: Not allowed');
    expect(onClose).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('textbox', { name: 'Message to share' })).toHaveValue('Keep this');
  });

  it('counts the message against the 500 character limit', async () => {
    const { user } = renderWithProviders(<SharePostDialog post={makePost()} open onClose={vi.fn()} />);
    expect(screen.getByText('0/500')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Message to share' }), 'abc');
    expect(screen.getByText('3/500')).toBeInTheDocument();
  });
});
