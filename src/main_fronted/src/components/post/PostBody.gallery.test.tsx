import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { PostBody } from './PostBody';
import { makePost } from './fixtures';

const four = ['/bff/blobs/1.png', '/bff/blobs/2.png', '/bff/blobs/3.png', '/bff/blobs/4.png'];

describe('PostBody images', () => {
  it('renders one button per image with its position, for four images', () => {
    renderWithProviders(<PostBody post={makePost({ type: 'image', images: four, imageUrl: four[0], content: 'Four' })} />);
    for (let i = 1; i <= 4; i += 1) {
      expect(screen.getByRole('button', { name: `Open image ${i} of 4` })).toBeInTheDocument();
    }
  });

  it('a single legacy imageUrl still renders as one image', () => {
    renderWithProviders(<PostBody post={makePost({ type: 'image', imageUrl: '/bff/blobs/a.png', content: 'Pic' })} />);
    expect(screen.getByRole('button', { name: 'Open image 1 of 1' })).toBeInTheDocument();
  });

  it('opens the lightbox on the chosen image; the buttons and arrow keys move between images, with wrap-around', async () => {
    const { user } = renderWithProviders(<PostBody post={makePost({ type: 'image', images: four, imageUrl: four[0], content: 'Four' })} />);
    await user.click(screen.getByRole('button', { name: 'Open image 2 of 4' }));

    const dialog = screen.getByRole('dialog', { name: 'Post photos' });
    expect(within(dialog).getByRole('img', { name: 'Image 2 of 4' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Next image' }));
    expect(within(dialog).getByRole('img', { name: 'Image 3 of 4' })).toBeInTheDocument();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(within(dialog).getByRole('img', { name: 'Image 1 of 4' })).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(within(dialog).getByRole('img', { name: 'Image 4 of 4' })).toBeInTheDocument();
  });
});
