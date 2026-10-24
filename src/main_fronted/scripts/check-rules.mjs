// Static rules for the web app (docs/frontend-roadmap/TESTING-AND-REVIEW.md §L5).
// Plain Node, no dependencies. Walks src/, prints `rule file:line: text` per violation
// and exits 1 when any enabled rule fails. A rule is turned on by adding its id to
// ENABLED_RULES, never by deleting the rule.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src', import.meta.url));

const ENABLED_RULES = ['no-hex', 'no-violet', 'no-raw-palette', 'no-raw-bff-fetch', 'no-fake-actor', 'no-console-log'];

const RULES = [
  {
    id: 'no-hex',
    test: (line) => {
      // Hex colour literals in strings or classes. Skip HTML entities (&#123;) and
      // fragments of URLs (after / or ?).
      const re = /(^|[^&/?\w#])#[0-9a-fA-F]{3,8}\b/g;
      return re.test(line);
    },
  },
  {
    id: 'no-violet',
    test: (line) => /\b(violet|fuchsia)-\d{2,3}\b/.test(line),
  },
  {
    // Raw Tailwind palette classes (zinc, blue, emerald, ...) with or without a state prefix
    // (dark:, hover:). Colour comes from the tokens (text-muted, bg-surface, text-success).
    id: 'no-raw-palette',
    test: (line) =>
      /\b(bg|text|border|from|to|via|ring|fill|stroke|divide|outline|shadow)-(zinc|gray|slate|neutral|stone|blue|sky|indigo|purple|violet|fuchsia|emerald|green|teal|amber|yellow|orange|red|rose|pink)-\d{2,3}\b/.test(line),
  },
  {
    id: 'no-raw-bff-fetch',
    files: (rel) => !['api/gateway.ts', 'api/auth.ts'].includes(rel),
    test: (line) => /\bfetch\(|XMLHttpRequest/.test(line),
  },
  {
    id: 'no-fake-actor',
    test: (line) => {
      // addNotification(type, 'Literal name', ...): the second argument must be a
      // variable, or the literal 'Marketplace'.
      const m = line.match(/addNotification\(\s*[^,]+,\s*(['"`])([^'"`]*)\1/);
      return !!m && m[2] !== 'Marketplace';
    },
  },
  {
    id: 'no-console-log',
    test: (line) => /\bconsole\.log\(/.test(line),
  },
];

const SKIP_DIRS = new Set(['test']);
const SKIP_FILES = new Set(['index.css', 'components/ui/theme.ts']);
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;
const TEST_FILE = /\.test\.(ts|tsx)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const violations = [];
  const files = walk(ROOT).filter((f) => SOURCE_EXT.test(f) && !TEST_FILE.test(f));
  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join('/');
    if (SKIP_FILES.has(rel)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((text, i) => {
      for (const rule of RULES) {
        if (!ENABLED_RULES.includes(rule.id)) continue;
        if (rule.files && !rule.files(rel)) continue;
        if (rule.test(text)) {
          violations.push(`${rule.id} src/${rel}:${i + 1}: ${text.trim()}`);
        }
      }
    });
  }
  if (violations.length > 0) {
    console.error(violations.join('\n'));
    console.error(`\ncheck:rules failed: ${violations.length} violation(s)`);
    process.exit(1);
  }
  console.log(`check:rules passed (${ENABLED_RULES.join(', ')}) over ${files.length} files`);
}

main();
