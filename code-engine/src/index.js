#!/usr/bin/env node
// CLI entry point. Thin wrapper over spec.js + engine.js.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import {
  loadSpec, normalizeSpec, resolvePreset, DEFAULT_TYPE_MAP,
  isModuleSpec, normalizeModuleSpec, resolveModulePreset,
} from './spec.js';
import { generate, generateAggregate, listPresets, PACKAGE_ROOT, TEMPLATES_ROOT } from './engine.js';
import { verifyFixtures, updateFixtures } from './fixtures.js';

/**
 * Optional project config: typeMap overrides + custom Nunjucks filters.
 * Looked up next to the package and in the current working directory.
 */
async function loadConfig() {
  const candidates = [
    path.join(PACKAGE_ROOT, 'code-engine.config.js'),
    path.join(process.cwd(), 'code-engine.config.js'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const mod = await import(pathToFileURL(file).href);
      return mod.default ?? mod;
    }
  }
  return {};
}

const program = new Command();
program
  .name('code-engine')
  .description('Spec-driven code generator for socialLight (Nunjucks templates).')
  .version('0.1.0');

program
  .command('generate')
  .argument('<spec>', 'path to an entity spec JSON file')
  .option('-p, --preset <name>', 'template preset (defaults to spec.preset / spec.kind)')
  .option('-o, --out <dir>', 'output directory', '.')
  .option('--dry-run', 'list files that would be generated without writing', false)
  .option('-f, --force', 'overwrite existing files', false)
  .action(async (specPath, opts) => {
    const config = await loadConfig();
    const rawSpec = loadSpec(specPath);
    const moduleSpec = isModuleSpec(rawSpec);
    const typeMap = { ...DEFAULT_TYPE_MAP, ...(config.typeMap ?? {}) };
    const context = moduleSpec ? normalizeModuleSpec(rawSpec, { typeMap }) : normalizeSpec(rawSpec, { typeMap });
    const preset = opts.preset ?? (moduleSpec ? resolveModulePreset(rawSpec) : resolvePreset(rawSpec));

    const { outputs } = generate(context, {
      preset,
      outDir: path.resolve(opts.out),
      extraFilters: config.filters ?? {},
      dryRun: opts.dryRun,
      force: opts.force,
      platforms: config.platforms ?? ['web'],
    });

    const label = opts.dryRun ? 'Planned' : 'Generated';
    const subject = moduleSpec ? `module "${context.module}"` : `"${context.Entity}"`;
    console.log(`${label} ${outputs.length} file(s) for ${subject} using preset "${preset}":`);
    for (const o of outputs) {
      const mark = o.action === 'written' ? '+' : o.action === 'skipped' ? '=' : '·';
      console.log(`  ${mark} ${path.relative(process.cwd(), o.path)}${o.action === 'skipped' ? '  (exists, kept)' : ''}`);
    }
  });

program
  .command('generate-portal')
  .description('aggregate (fan-in) generation: render an admin portal from ALL module specs in a directory')
  .argument('<specsDir>', 'directory of *.module.json specs (e.g. src/app-specs)')
  .option('-p, --preset <name>', 'aggregate preset', 'admin-portal')
  .option('-o, --out <dir>', 'output directory', '.')
  .option('--dry-run', 'list files that would be generated without writing', false)
  .option('-f, --force', 'overwrite existing files', false)
  .option('--skip-missing', 'skip specs whose <out>/Modules/<Module>/<Module>.Client project does not exist yet', false)
  .action(async (specsDir, opts) => {
    const config = await loadConfig();
    const typeMap = { ...DEFAULT_TYPE_MAP, ...(config.typeMap ?? {}) };

    const dir = path.resolve(specsDir);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error(`generate-portal: "${specsDir}" is not a directory.`);
    }
    // Only module-level specs participate in the portal; named *.module.json by
    // convention (src/app-specs). Each is validated+normalized via the same path
    // as `generate`, so a malformed spec is rejected before any file renders.
    const specFiles = fs.readdirSync(dir)
      .filter((f) => f.endsWith('.module.json'))
      .sort()
      .map((f) => path.join(dir, f));
    if (specFiles.length === 0) {
      throw new Error(`generate-portal: no *.module.json specs found in "${specsDir}".`);
    }

    let contexts = specFiles.map((file) => {
      const raw = loadSpec(file);
      if (!isModuleSpec(raw)) {
        throw new Error(`generate-portal: "${path.basename(file)}" is not a module spec (no entities[]).`);
      }
      return normalizeModuleSpec(raw, { typeMap });
    });

    // Build-aware: the portal references each module's typed-client project. When a
    // spec's module hasn't been generated/built yet, --skip-missing drops it (and its
    // nav/grids) so the portal compiles against exactly the modules that exist. Re-run
    // after generating the module and it's wired in automatically.
    if (opts.skipMissing) {
      const outRoot = path.resolve(opts.out);
      const kept = [];
      const skipped = [];
      for (const ctx of contexts) {
        const clientProj = path.join(outRoot, 'Modules', ctx.module, `${ctx.module}.Client`, `${ctx.module}.Client.csproj`);
        (fs.existsSync(clientProj) ? kept : skipped).push(ctx);
      }
      if (skipped.length) {
        console.log(`Skipping ${skipped.length} module(s) with no built .Client project: ${skipped.map((c) => c.module).join(', ')}`);
      }
      contexts = kept;
      if (contexts.length === 0) {
        throw new Error('generate-portal: no module has a built .Client project under <out>/Modules. Generate the modules first.');
      }
    }

    const { outputs } = generateAggregate(contexts, {
      preset: opts.preset,
      outDir: path.resolve(opts.out),
      extraFilters: config.filters ?? {},
      dryRun: opts.dryRun,
      force: opts.force,
      platforms: config.platforms ?? ['web'],
    });

    const label = opts.dryRun ? 'Planned' : 'Generated';
    console.log(`${label} ${outputs.length} file(s) for ${contexts.length} module(s) using preset "${opts.preset}":`);
    for (const o of outputs) {
      const mark = o.action === 'written' ? '+' : o.action === 'skipped' ? '=' : '·';
      console.log(`  ${mark} ${path.relative(process.cwd(), o.path)}${o.action === 'skipped' ? '  (exists, kept)' : ''}`);
    }
  });

program
  .command('list-presets')
  .description('list available template presets')
  .action(() => {
    const presets = listPresets(TEMPLATES_ROOT);
    console.log(presets.length ? presets.map((p) => `  - ${p}`).join('\n') : '  (no presets found)');
  });

program
  .command('verify')
  .description('regen-idempotency check: regenerate example specs and diff against committed golden fixtures (__fixtures__/)')
  .option('-u, --update', 'rewrite the golden fixtures instead of checking them', false)
  .action(async (opts) => {
    const config = await loadConfig();

    if (opts.update) {
      const results = updateFixtures(config);
      const total = results.reduce((n, r) => n + r.fileCount, 0);
      console.log(`Updated ${results.length} fixture(s), ${total} file(s):`);
      for (const r of results) console.log(`  ~ __fixtures__/${r.name}  (${r.fileCount} files)`);
      return;
    }

    const results = verifyFixtures(config);
    if (results.length === 0) {
      console.error('verify: no example specs found under examples/. Nothing to check.');
      process.exit(1);
    }

    let failed = false;
    for (const r of results) {
      if (!r.goldenExists) {
        failed = true;
        console.log(`  [missing] ${r.name}: no golden fixture (run "verify --update" to create it)`);
        continue;
      }
      if (r.diffs.length === 0) {
        console.log(`  [ok]      ${r.name}  (${r.fileCount} files, idempotent)`);
        continue;
      }
      failed = true;
      console.log(`  [DIFF]    ${r.name}: ${r.diffs.length} difference(s)`);
      for (const d of r.diffs) console.log(`              (${d.kind}) ${d.rel}`);
    }

    if (failed) {
      console.error('\nverify FAILED: generated output drifted from the committed fixtures.');
      console.error('If the change was intentional, re-run with --update and commit __fixtures__/.');
      process.exit(1);
    }
    console.log('\nverify OK: generation is idempotent against the committed fixtures.');
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(`code-engine: ${err.message}`);
  process.exit(1);
});
