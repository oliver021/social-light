import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOKENS, buildTheme } from './theme';

// The stylesheet that owns the --ui-* values. TOKENS must mirror it exactly. Vitest runs
// from the web app root (src/main_fronted), and jsdom gives import.meta.url an http scheme,
// so the path is resolved from the working directory.
const CSS = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Body of the first `selector { ... }` block in the stylesheet. */
function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = CSS.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`block ${selector} not found in index.css`);
  return m[1];
}

/** Value of `--ui-<name>` declared inside a block, or undefined. */
function declared(body: string, name: string): string | undefined {
  const m = body.match(new RegExp(`--ui-${name}:\\s*([^;]+);`));
  return m?.[1].trim();
}

// camelCase token key -> CSS name: primaryHover -> primary-hover, surface2 -> surface-2.
const kebab = (key: string) =>
  key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/([a-z])(\d)/g, '$1-$2');

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('design tokens: parity with index.css', () => {
  for (const mode of ['light', 'dark'] as const) {
    const selector = mode === 'light' ? ':root' : '.dark';

    it(`TOKENS.${mode} equals the --ui-* values in ${selector}`, () => {
      const body = block(selector);
      for (const [key, value] of Object.entries(TOKENS[mode])) {
        const name = kebab(key);
        expect(declared(body, name), `--ui-${name} in ${selector}`).toBe(value);
      }
    });

    it(`every colour declared in ${selector} is in TOKENS.${mode}`, () => {
      const body = block(selector);
      const colourNames = [...body.matchAll(/--ui-([a-z0-9-]+):\s*#[0-9a-fA-F]{3,8}/g)].map((m) => m[1]);
      expect(colourNames.length).toBeGreaterThan(0);
      const known = new Set(Object.keys(TOKENS[mode]).map(kebab));
      for (const name of colourNames) {
        expect(known.has(name), `--ui-${name} missing from TOKENS.${mode}`).toBe(true);
      }
    });
  }

  it('no violet or fuchsia colour remap is left in index.css', () => {
    expect(CSS).not.toMatch(/--color-violet-/);
    expect(CSS).not.toMatch(/--color-fuchsia-/);
  });
});

describe('design tokens: contrast (WCAG)', () => {
  for (const mode of ['light', 'dark'] as const) {
    const t = TOKENS[mode];

    it(`${mode}: text, muted and subtle are at least 4.5:1 on surface and page`, () => {
      for (const fg of [t.text, t.muted, t.subtle]) {
        for (const bg of [t.surface, t.page]) {
          expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`${mode}: text on primary is at least 4.5:1`, () => {
      expect(contrast(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${mode}: primary on surface is at least 3:1 (UI component contrast)`, () => {
      expect(contrast(t.primary, t.surface)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('buildTheme', () => {
  it('builds a dark palette from the dark tokens', () => {
    const theme = buildTheme('dark');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main).toBe(TOKENS.dark.primary);
    expect(theme.palette.primary.contrastText).toBe(TOKENS.dark.onPrimary);
    expect(theme.palette.background.default).toBe(TOKENS.dark.page);
    expect(theme.palette.background.paper).toBe(TOKENS.dark.surface);
  });

  it('builds a light palette from the light tokens', () => {
    const theme = buildTheme('light');
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary.main).toBe(TOKENS.light.primary);
    expect(theme.palette.text.primary).toBe(TOKENS.light.text);
    expect(theme.palette.divider).toBe(TOKENS.light.border);
  });

  it('keeps the Tailwind breakpoints (md is 768px)', () => {
    expect(buildTheme('light').breakpoints.values.md).toBe(768);
    expect(buildTheme('dark').breakpoints.values.md).toBe(768);
  });
});
