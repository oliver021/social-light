// Golden-fixture harness for the regen-idempotency check (DESIGN-STRATEGY.md §11.2).
//
// Each spec under examples/ has a committed golden output tree under
// __fixtures__/<name>/. `verifyFixtures` regenerates every spec into a temp dir
// and diffs it against its golden tree — if there is zero diff, "the spec is the
// source" holds and no generated file has drifted. `updateFixtures` (re)writes
// the golden trees after an intentional template/spec change.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadSpec, normalizeSpec, resolvePreset, DEFAULT_TYPE_MAP,
  isModuleSpec, normalizeModuleSpec, resolveModulePreset,
} from './spec.js';
import { generate, PACKAGE_ROOT } from './engine.js';

export const EXAMPLES_DIR = path.join(PACKAGE_ROOT, 'examples');
export const FIXTURES_DIR = path.join(PACKAGE_ROOT, '__fixtures__');

/** Derive a clean fixture name from a spec filename (post.entity.json -> post). */
function fixtureName(file) {
  return path.basename(file).replace(/\.json$/i, '').replace(/\.entity$/i, '');
}

/** The spec files driving the fixtures (every *.json under examples/). */
export function listFixtureSpecs() {
  if (!fs.existsSync(EXAMPLES_DIR)) return [];
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort()
    .map((f) => ({ name: fixtureName(f), file: path.join(EXAMPLES_DIR, f) }));
}

function prepare(specFile, config) {
  const raw = loadSpec(specFile);
  const typeMap = { ...DEFAULT_TYPE_MAP, ...(config.typeMap ?? {}) };
  const moduleSpec = isModuleSpec(raw);
  const context = moduleSpec ? normalizeModuleSpec(raw, { typeMap }) : normalizeSpec(raw, { typeMap });
  const preset = moduleSpec ? resolveModulePreset(raw) : resolvePreset(raw);
  return { context, preset, filters: config.filters ?? {}, platforms: config.platforms ?? ['web'] };
}

function generateInto(outDir, { context, preset, filters, platforms }) {
  generate(context, { preset, outDir, extraFilters: filters, force: true, platforms });
}

/** Read a directory tree into a Map of forward-slashed relative path -> contents. */
function readTree(root) {
  const out = new Map();
  if (!fs.existsSync(root)) return out;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        out.set(path.relative(root, full).split(path.sep).join('/'), fs.readFileSync(full, 'utf8'));
      }
    }
  };
  walk(root);
  return out;
}

/** Diff expected (golden) vs actual (freshly generated) trees. */
function diffTrees(expected, actual) {
  const diffs = [];
  for (const [rel, content] of expected) {
    if (!actual.has(rel)) diffs.push({ rel, kind: 'missing' });
    else if (actual.get(rel) !== content) diffs.push({ rel, kind: 'changed' });
  }
  for (const rel of actual.keys()) {
    if (!expected.has(rel)) diffs.push({ rel, kind: 'extra' });
  }
  return diffs;
}

/**
 * Regenerate every fixture spec into a temp dir and diff against its golden tree.
 * @returns {Array<{name, goldenExists, fileCount, diffs}>}
 */
export function verifyFixtures(config = {}) {
  const results = [];
  for (const { name, file } of listFixtureSpecs()) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-engine-verify-'));
    try {
      generateInto(tmp, prepare(file, config));
      const actual = readTree(tmp);
      const goldenDir = path.join(FIXTURES_DIR, name);
      const expected = readTree(goldenDir);
      results.push({
        name,
        goldenExists: fs.existsSync(goldenDir),
        fileCount: actual.size,
        diffs: diffTrees(expected, actual),
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  return results;
}

/** (Re)write every golden tree from its spec. Use after an intentional change. */
export function updateFixtures(config = {}) {
  const results = [];
  for (const { name, file } of listFixtureSpecs()) {
    const goldenDir = path.join(FIXTURES_DIR, name);
    fs.rmSync(goldenDir, { recursive: true, force: true });
    fs.mkdirSync(goldenDir, { recursive: true });
    generateInto(goldenDir, prepare(file, config));
    results.push({ name, fileCount: readTree(goldenDir).size });
  }
  return results;
}
