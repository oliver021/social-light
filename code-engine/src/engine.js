// Core generator: walk a preset's template tree, render each file's path and
// body through Nunjucks, and write the result. Designed to be edited freely —
// dropping a new .njk file into a preset adds a generated output, no code change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nunjucks from 'nunjucks';
import { registerFilters } from './filters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(__dirname, '..');
export const TEMPLATES_ROOT = path.join(PACKAGE_ROOT, 'templates');

/** List preset names (immediate sub-directories of templates/). */
export function listPresets(templatesRoot = TEMPLATES_ROOT) {
  if (!fs.existsSync(templatesRoot)) return [];
  return fs
    .readdirSync(templatesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** Recursively collect every *.njk template under a directory. */
function collectTemplates(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTemplates(full));
    else if (entry.isFile() && entry.name.endsWith('.njk')) out.push(full);
  }
  return out;
}

/**
 * Replace __token__ segments in an output path with values from the context.
 * A token resolves to ctx[token] when it's a string, or ctx[token].Name for
 * object tokens (e.g. __event__ -> the iterated event's PascalCase name).
 */
function substituteTokens(relPath, ctx) {
  return relPath.replace(/__([A-Za-z0-9]+)__/g, (match, key) => {
    // `__seed__` is a category marker, not data: it tags a file as a category-2
    // seed (see categoryOf) and expands to nothing, so the output keeps a clean
    // name (e.g. __seed__MainLayout.razor -> MainLayout.razor). This lets Razor
    // seed files — whose class name is the filename — stay valid, where the
    // legacy ".Seed." infix would yield an invalid component name.
    if (key.toLowerCase() === 'seed') return '';
    const value = ctx[key];
    if (typeof value === 'string') return value;
    if (value && typeof value.Name === 'string') return value.Name;
    return match; // leave unknown tokens untouched so they're easy to spot
  });
}

/**
 * Classify a template's output path into a render scope (DESIGN-STRATEGY.md
 * §2, §8): a path rooted at module/, entity/, or platforms/<platform>/ opts
 * into the new scope system; everything else is "legacy" and renders exactly
 * as it always has (one render per `generate()` call), so the existing
 * simple-service/rich-domain presets are completely unaffected.
 */
function scopeOf(relOut) {
  const segments = relOut.split('/');
  if (segments[0] === 'aggregate') return { scope: 'aggregate', rest: segments.slice(1).join('/') };
  if (segments[0] === 'module') return { scope: 'module', rest: segments.slice(1).join('/') };
  if (segments[0] === 'entity') return { scope: 'entity', rest: segments.slice(1).join('/') };
  if (segments[0] === 'platforms' && segments.length > 1) {
    return { scope: 'platform', platform: segments[1], rest: segments.slice(2).join('/') };
  }
  return { scope: 'legacy', rest: relOut };
}

/**
 * Writing category for a scoped template (DESIGN-STRATEGY.md §6, §8):
 * a filename segment of ".Seed." marks a category-2 seed (written once, never
 * overwritten again, regardless of --force); everything else defaults to
 * category-1 "immutable" (always regenerated). Category 3 ("manual") is never
 * emitted by a template at all, so it has no marker here.
 */
function categoryOf(rest) {
  return /\.Seed\.|__seed__/i.test(rest) ? 'seed' : 'immutable';
}

function buildEnvironment(templatesRoot, extraFilters) {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(templatesRoot), {
    autoescape: false, // we generate source code, never HTML
    trimBlocks: true,
    lstripBlocks: true,
    throwOnUndefined: false,
  });
  registerFilters(env, extraFilters);
  return env;
}

/**
 * Generate files for a normalized context.
 * @returns {{outputs: Array<{path: string, action: 'written'|'skipped'|'planned'}>}}
 */
/** Render `body` for every iteration context and write/plan/skip per category. */
function renderAndWrite({ env, body, rest, iterations, outDir, category, dryRun, force, outputs }) {
  for (const ctx of iterations) {
    const finalRel = substituteTokens(rest, ctx);
    const destPath = path.join(outDir, finalRel.split('/').join(path.sep));
    const exists = fs.existsSync(destPath);

    if (category === 'seed' && exists) {
      outputs.push({ path: destPath, action: 'skipped' });
      continue;
    }
    if (category === 'legacy' && exists && !force) {
      outputs.push({ path: destPath, action: 'skipped' });
      continue;
    }

    if (dryRun) {
      outputs.push({ path: destPath, action: 'planned' });
      continue;
    }

    const rendered = env.renderString(body, ctx);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, rendered);
    outputs.push({ path: destPath, action: 'written' });
  }
}

/**
 * Render one module/entity/platform-scoped template for a SINGLE module context.
 * Extracted so both `generate()` (one spec → many files) and `generateAggregate()`
 * (many specs → portal) drive the per-context fan-out through identical logic.
 */
function renderScopedForContext({ env, scope, rest, platform, body, context, outDir, category, dryRun, force, platforms, outputs }) {
  if (scope === 'module') {
    // Realtime templates (module/<API>/Realtime/...) are opt-in: emit them only
    // when the spec declared a `realtime` block (DESIGN-STRATEGY.md §6 category-3).
    // Every other module renders byte-identically as before.
    if (/(^|\/)Realtime\//.test(rest) && !context.realtime) return;

    const iterations = rest.includes('__consumedEvent__')
      ? (context.consumes ?? []).map((event) => ({ ...context, consumedEvent: event, ConsumedEvent: event.Name }))
      : rest.includes('__event__')
      ? (context.publishes ?? []).map((event) => ({ ...context, event, Event: event.Name }))
      : [context];
    renderAndWrite({ env, body, rest, iterations, outDir, category, dryRun, force, outputs });
    return;
  }

  if (scope === 'entity') {
    for (const entity of context.entities ?? []) {
      const entityCtx = { ...context, ...entity };
      const iterations = rest.includes('__event__')
        ? (entity.events ?? []).map((event) => ({ ...entityCtx, event, Event: event.Name }))
        : [entityCtx];
      renderAndWrite({ env, body, rest, iterations, outDir, category, dryRun, force, outputs });
    }
    return;
  }

  if (scope === 'platform') {
    const iterations = platforms.includes(platform)
      ? (context.entities ?? []).filter((e) => e.ui).map((entity) => ({ ...context, ...entity, platform }))
      : [];
    renderAndWrite({ env, body, rest, iterations, outDir, category, dryRun, force, outputs });
  }
}

/**
 * Generate files for a normalized context.
 *
 * Templates whose output path is rooted at module/, entity/, or
 * platforms/<platform>/ render once per the matching scope (module: once;
 * entity: once per `context.entities`; platform: once per platform x entity
 * with a `ui` block) and follow the category-1/2 writing rule (DESIGN-STRATEGY.md
 * §6, §8). Every other template path is "legacy" and behaves exactly as before
 * (one render, skip-unless-`--force`) — the existing presets are unaffected.
 *
 * @returns {{outputs: Array<{path: string, action: 'written'|'skipped'|'planned'}>}}
 */
export function generate(context, {
  preset,
  outDir,
  templatesRoot = TEMPLATES_ROOT,
  extraFilters = {},
  dryRun = false,
  force = false,
  platforms = ['web'],
} = {}) {
  const presetDir = path.join(templatesRoot, preset);
  if (!fs.existsSync(presetDir)) {
    throw new Error(`Unknown preset "${preset}". Available: ${listPresets(templatesRoot).join(', ') || '(none)'}`);
  }

  const env = buildEnvironment(templatesRoot, extraFilters);
  const templates = collectTemplates(presetDir);
  const outputs = [];

  for (const templateFile of templates) {
    const relTemplate = path.relative(presetDir, templateFile).split(path.sep).join('/');
    const relOut = relTemplate.replace(/\.njk$/, '');
    const body = fs.readFileSync(templateFile, 'utf8');
    const { scope, rest, platform } = scopeOf(relOut);

    if (scope === 'legacy') {
      // Per-event fan-out: a path containing __event__ renders once per event.
      const iterations = rest.includes('__event__')
        ? (context.events ?? []).map((event) => ({ ...context, event, Event: event.Name }))
        : [context];
      renderAndWrite({ env, body, rest, iterations, outDir, category: 'legacy', dryRun, force, outputs });
      continue;
    }

    // The aggregate scope is a multi-spec (fan-in) concern handled by
    // generateAggregate(); a single-spec generate() never emits it.
    if (scope === 'aggregate') continue;

    const category = categoryOf(rest);
    renderScopedForContext({ env, scope, rest, platform, body, context, outDir, category, dryRun, force, platforms, outputs });
  }

  return { outputs };
}

/**
 * Generate the cross-module "aggregator" output (DESIGN-STRATEGY.md §2 fan-in):
 * where module/entity/platform scopes fan OUT from one spec into many files, an
 * `aggregate/`-rooted template fans IN from ALL module specs into ONE file —
 * the portal's csproj ProjectReferences, the sidebar nav, the typed-client DI.
 * It renders once with `{ modules: [...all normalized contexts...] }`.
 *
 * The same preset may also carry module/entity/platform-scoped templates (e.g. a
 * CRUD page per entity across every module); those fan out per context just as in
 * generate(). This entry point is additive: existing presets contain no
 * `aggregate/` paths, and generate()'s behavior is unchanged.
 *
 * @returns {{outputs: Array<{path: string, action: 'written'|'skipped'|'planned'}>}}
 */
export function generateAggregate(contexts, {
  preset,
  outDir,
  templatesRoot = TEMPLATES_ROOT,
  extraFilters = {},
  dryRun = false,
  force = false,
  platforms = ['web'],
} = {}) {
  const presetDir = path.join(templatesRoot, preset);
  if (!fs.existsSync(presetDir)) {
    throw new Error(`Unknown preset "${preset}". Available: ${listPresets(templatesRoot).join(', ') || '(none)'}`);
  }

  const env = buildEnvironment(templatesRoot, extraFilters);
  const templates = collectTemplates(presetDir);
  const outputs = [];
  // The fan-in context: every module exposed under a stable `modules` key, plus
  // the platform list so an aggregate template can reason about targets.
  const aggregateContext = { modules: contexts, platforms };

  for (const templateFile of templates) {
    const relTemplate = path.relative(presetDir, templateFile).split(path.sep).join('/');
    const relOut = relTemplate.replace(/\.njk$/, '');
    const body = fs.readFileSync(templateFile, 'utf8');
    const { scope, rest, platform } = scopeOf(relOut);

    if (scope === 'aggregate' || scope === 'legacy') {
      // aggregate/ → fan-in (render once over all modules). A non-scoped path in a
      // portal preset is a one-shot asset/seed rendered with the same context.
      const category = scope === 'aggregate' ? categoryOf(rest) : 'legacy';
      renderAndWrite({ env, body, rest, iterations: [aggregateContext], outDir, category, dryRun, force, outputs });
      continue;
    }

    // module/entity/platform → fan out per module context, exactly as generate().
    const category = categoryOf(rest);
    for (const context of contexts) {
      renderScopedForContext({ env, scope, rest, platform, body, context, outDir, category, dryRun, force, platforms, outputs });
    }
  }

  return { outputs };
}
