import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { Surface } from './Surface';
import { SectionHeader } from './SectionHeader';
import { PageHeader } from './PageHeader';
import { UserLine } from './UserLine';
import { StatusChip } from './StatusChip';
import { InlineError } from './InlineError';
import { PostSkeleton, ListSkeleton, CardGridSkeleton } from './Skeletons';

describe('Surface', () => {
  it('renders the requested element with its aria-label and children', () => {
    renderWithProviders(
      <Surface as="article" aria-label="Post by Ana">
        <p>Body</p>
      </Surface>,
    );
    expect(screen.getByRole('article', { name: 'Post by Ana' })).toHaveTextContent('Body');
  });
});

describe('SectionHeader and PageHeader', () => {
  it('SectionHeader title is a real heading with the subtitle and action', () => {
    renderWithProviders(<SectionHeader title="People you may know" subtitle="Based on mutual friends" action={<button>See all</button>} />);
    expect(screen.getByRole('heading', { level: 2, name: 'People you may know' })).toBeInTheDocument();
    expect(screen.getByText('Based on mutual friends')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See all' })).toBeInTheDocument();
  });

  it('PageHeader is the h1 of the tab', () => {
    renderWithProviders(<PageHeader title="Reels" description="Short videos" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Reels' })).toBeInTheDocument();
    expect(screen.getByText('Short videos')).toBeInTheDocument();
  });
});

describe('UserLine', () => {
  it('hides an empty handle and shows the meta text', () => {
    renderWithProviders(<UserLine name="Ana Ruiz" handle="" meta="5m ago" />);
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('@')).not.toBeInTheDocument();
  });

  it('makes the name a button when onOpen is set, and calls it', async () => {
    const onOpen = vi.fn();
    const { user } = renderWithProviders(<UserLine name="Ana Ruiz" handle="@ana" onOpen={onOpen} />);
    await user.click(screen.getByRole('button', { name: 'Ana Ruiz' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows the name as plain text when onOpen is not set', () => {
    renderWithProviders(<UserLine name="Ana Ruiz" handle="@ana" />);
    expect(screen.queryByRole('button', { name: 'Ana Ruiz' })).not.toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
  });
});

describe('StatusChip and InlineError', () => {
  it('StatusChip shows its label', () => {
    renderWithProviders(<StatusChip label="Sold" tone="success" />);
    expect(screen.getByText('Sold')).toBeInTheDocument();
  });

  it('InlineError is an alert with the message, and Try again only when retry is given', async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(<InlineError message="Could not load" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('InlineError has no Try again button without onRetry', () => {
    renderWithProviders(<InlineError message="Nope" />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});

describe('Skeletons', () => {
  it('PostSkeleton, ListSkeleton and CardGridSkeleton announce themselves as busy', () => {
    renderWithProviders(
      <>
        <PostSkeleton />
        <ListSkeleton rows={2} />
        <CardGridSkeleton count={3} />
      </>,
    );
    expect(screen.getByRole('article', { name: 'Loading post' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Loading')).toHaveLength(2);
  });
});
