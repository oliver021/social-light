import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { MediaPicker } from './MediaPicker';
import { uploadMedia } from '../api/gateway';

vi.mock('../api/gateway', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/gateway')>();
  return { ...actual, uploadMedia: vi.fn() };
});

const png = (name = 'a.png', size = 1024) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

describe('MediaPicker', () => {
  it('uploads a picked image and hands the returned url to onChange', async () => {
    vi.mocked(uploadMedia).mockResolvedValue('/blobs/a.png');
    const onChange = vi.fn();
    const { user } = renderWithProviders(<MediaPicker kind="image" label="Image" onChange={onChange} />);
    await user.upload(screen.getByLabelText('Image'), png());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/blobs/a.png'));
    expect(uploadMedia).toHaveBeenCalledTimes(1);
  });

  it('shows the server message and does not call onChange when the upload fails', async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error('Storage is full'));
    const onChange = vi.fn();
    const { user } = renderWithProviders(<MediaPicker kind="image" label="Image" onChange={onChange} />);
    await user.upload(screen.getByLabelText('Image'), png());
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is full');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects an oversized image with a plain message before any upload', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<MediaPicker kind="image" label="Image" onChange={onChange} />);
    await user.upload(screen.getByLabelText('Image'), png('huge.png', 10 * 1024 * 1024 + 1));
    expect(await screen.findByRole('alert')).toHaveTextContent('Images must be 10 MB or smaller.');
    expect(uploadMedia).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a labelled preview and Remove calls onChange(null)', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <MediaPicker kind="image" label="Image" value="/blobs/a.png" onChange={onChange} />,
    );
    expect(screen.getByRole('img', { name: 'Image preview' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
