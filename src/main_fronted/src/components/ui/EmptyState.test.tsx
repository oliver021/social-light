import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { renderWithProviders } from '../../test/render';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and the help line', () => {
    renderWithProviders(<EmptyState icon={Inbox} title="No messages yet" body="Start a conversation with a friend." />);
    expect(screen.getByRole('heading', { name: 'No messages yet' })).toBeInTheDocument();
    expect(screen.getByText('Start a conversation with a friend.')).toBeInTheDocument();
  });

  it('calls onClick when the action button is pressed', async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(
      <EmptyState title="Nothing here" action={{ label: 'Write a post', onClick }} />,
    );
    await user.click(screen.getByRole('button', { name: 'Write a post' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders no button when there is no action', () => {
    renderWithProviders(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
