import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RelativeTime } from './RelativeTime';

describe('RelativeTime', () => {
  it('renders a <time> element with the ISO value and the relative text', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    const { container } = render(<RelativeTime iso={iso} />);
    const time = container.querySelector('time');
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute('dateTime', iso);
    expect(time).toHaveTextContent('5m ago');
  });

  it('renders nothing for a missing date', () => {
    const { container: a } = render(<RelativeTime iso={null} />);
    const { container: b } = render(<RelativeTime />);
    expect(a).toBeEmptyDOMElement();
    expect(b).toBeEmptyDOMElement();
  });
});
