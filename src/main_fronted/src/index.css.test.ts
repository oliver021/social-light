import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read by path from the app root (vitest runs there, see package.json "test"); jsdom
// gives import.meta.url an http scheme, so it cannot be used for a file read.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('index.css', () => {
  it('turns transitions and animations down for users who ask for reduced motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toContain('transition-duration: .01ms !important');
    expect(css).toContain('animation-duration: .01ms !important');
  });

  it('has no zinc colour remaps left (every zinc class is migrated to a token)', () => {
    expect(css).not.toMatch(/--color-zinc-/);
  });
});
