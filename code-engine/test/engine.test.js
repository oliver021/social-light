// Phase-0 tests: strict spec validation + regen-idempotency.
// Run with `npm test` (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSpec, normalizeSpec, validateModuleSpec, normalizeModuleSpec } from '../src/spec.js';
import { verifyFixtures, listFixtureSpecs } from '../src/fixtures.js';
import { generate, generateAggregate } from '../src/engine.js';
import config from '../code-engine.config.js';

const valid = {
  entity: 'Post',
  fields: [
    { name: 'Id', type: 'guid', key: true },
    { name: 'Content', type: 'string' },
  ],
  events: ['PostCreated'],
};

test('validateSpec accepts a well-formed spec', () => {
  assert.doesNotThrow(() => validateSpec(valid));
});

test('validateSpec rejects a non-object', () => {
  assert.throws(() => validateSpec(null), /must be a JSON object/);
  assert.throws(() => validateSpec([]), /must be a JSON object/);
});

test('validateSpec rejects a missing entity', () => {
  assert.throws(() => validateSpec({ fields: valid.fields }), /"entity" is required/);
});

test('validateSpec rejects empty / missing fields', () => {
  assert.throws(() => validateSpec({ entity: 'Post' }), /"fields" is required/);
  assert.throws(() => validateSpec({ entity: 'Post', fields: [] }), /"fields" is required/);
});

test('validateSpec rejects duplicate field names (same generated name)', () => {
  assert.throws(
    () => validateSpec({ entity: 'Post', fields: [{ name: 'authorId' }, { name: 'AuthorId' }] }),
    /collides/,
  );
});

test('validateSpec rejects more than one key field', () => {
  assert.throws(
    () => validateSpec({ entity: 'Post', fields: [{ name: 'A', key: true }, { name: 'B', key: true }] }),
    /Only one field may be marked "key"/,
  );
});

test('validateSpec rejects an unknown kind and malformed events', () => {
  assert.throws(() => validateSpec({ ...valid, kind: 'fancy' }), /"kind" must be one of/);
  assert.throws(() => validateSpec({ ...valid, events: [{ nope: 'x' }] }), /events\[0\]/);
});

test('validateSpec collects multiple problems in one throw', () => {
  assert.throws(
    () => validateSpec({ kind: 'bogus', fields: [{}] }),
    (err) => /"entity" is required/.test(err.message) && /"kind" must be one of/.test(err.message),
  );
});

test('normalizeSpec runs validation (invalid spec throws before rendering)', () => {
  assert.throws(() => normalizeSpec({ entity: 'Post' }), /"fields" is required/);
});

test('there is at least one example spec to guard', () => {
  assert.ok(listFixtureSpecs().length > 0, 'expected example specs under examples/');
});

test('generation is idempotent against committed golden fixtures', () => {
  const results = verifyFixtures(config);
  for (const r of results) {
    assert.ok(r.goldenExists, `missing golden fixture for "${r.name}" — run "npm run fixtures:update"`);
    assert.equal(
      r.diffs.length,
      0,
      `"${r.name}" drifted:\n${r.diffs.map((d) => `  (${d.kind}) ${d.rel}`).join('\n')}`,
    );
  }
});

// --- Phase 1: module spec model -------------------------------------------

const validModule = {
  module: 'Posts',
  entities: [
    { name: 'Post', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'Title', type: 'string' }], relations: [{ to: 'Comment' }] },
    { name: 'Comment', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'Text', type: 'string' }] },
  ],
  publishes: ['PostCreated'],
};

test('validateModuleSpec accepts a well-formed module spec', () => {
  assert.doesNotThrow(() => validateModuleSpec(validModule));
});

test('validateModuleSpec rejects a missing module name', () => {
  assert.throws(() => validateModuleSpec({ entities: validModule.entities }), /"module" is required/);
});

test('validateModuleSpec rejects empty/missing entities', () => {
  assert.throws(() => validateModuleSpec({ module: 'Posts' }), /"entities" is required/);
  assert.throws(() => validateModuleSpec({ module: 'Posts', entities: [] }), /"entities" is required/);
});

test('validateModuleSpec rejects duplicate entity names', () => {
  assert.throws(
    () => validateModuleSpec({
      module: 'Posts',
      entities: [
        { name: 'Post', fields: [{ name: 'Id', key: true }] },
        { name: 'post', fields: [{ name: 'Id', key: true }] },
      ],
    }),
    /collides with another entity/,
  );
});

test('validateModuleSpec enforces the decoupling invariant: relations must stay intra-module', () => {
  assert.throws(
    () => validateModuleSpec({
      module: 'Posts',
      entities: [{ name: 'Post', fields: [{ name: 'Id', key: true }], relations: [{ to: 'User' }] }],
    }),
    /points outside this module's entities/,
  );
});

test('validateModuleSpec rejects an unknown relation kind', () => {
  assert.throws(
    () => validateModuleSpec({
      module: 'Posts',
      entities: [
        { name: 'Post', fields: [{ name: 'Id', key: true }], relations: [{ to: 'Comment', kind: 'sideways' }] },
        { name: 'Comment', fields: [{ name: 'Id', key: true }] },
      ],
    }),
    /"kind" must be one of/,
  );
});

test('validateModuleSpec rejects malformed publishes/consumes', () => {
  assert.throws(() => validateModuleSpec({ ...validModule, publishes: [{ noName: true }] }), /publishes\[0\]/);
});

test('normalizeModuleSpec produces per-entity context and module-level defaults', () => {
  const ctx = normalizeModuleSpec(validModule);
  assert.equal(ctx.module, 'Posts');
  assert.equal(ctx.schema, 'posts');
  assert.equal(ctx.routePrefix, '/api/posts');
  assert.equal(ctx.entities.length, 2);
  assert.equal(ctx.entities[0].Entity, 'Post');
  assert.equal(ctx.entities[0].relations[0].To, 'Comment');
  assert.equal(ctx.publishes[0].Name, 'PostCreated');
});

test('normalizeModuleSpec keyword-escapes identifier tokens (e.g. an `Event` entity)', () => {
  const ctx = normalizeModuleSpec({
    module: 'Events',
    entities: [{
      name: 'Event',
      fields: [
        { name: 'Id', type: 'guid', key: true },
        { name: 'Lock', type: 'bool' },   // a keyword-named field too
        { name: 'Title', type: 'string' },
      ],
    }],
  });
  const event = ctx.entities[0];
  // `entity` is emitted as a C# identifier -> must be verbatim-escaped.
  assert.equal(event.entity, '@event');
  // prose keeps the raw form (no `@`).
  assert.equal(event.entityLabel, 'event');
  // a keyword-named field is escaped; a normal one is left alone.
  assert.equal(event.fields.find((f) => f.Name === 'Lock').camel, '@lock');
  assert.equal(event.fields.find((f) => f.Name === 'Title').camel, 'title');
});

test('normalizeModuleSpec global::-qualifies a type whose name collides with a namespace segment', () => {
  const ctx = normalizeModuleSpec({
    module: 'Chat',
    entities: [
      { name: 'Chat', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'Title', type: 'string' }],
        relations: [{ to: 'Message', kind: 'oneToMany' }] },
      { name: 'Message', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'ChatId', type: 'guid' }] },
    ],
  });
  const chat = ctx.entities.find((e) => e.Entity === 'Chat');
  const message = ctx.entities.find((e) => e.Entity === 'Message');
  // `Chat` collides with the `SocialLight.Chat` namespace -> must be qualified.
  assert.equal(chat.TypeRef, 'global::SocialLight.Chat.Domain.Chat');
  // a non-colliding entity stays bare.
  assert.equal(message.TypeRef, 'Message');
  // relation target uses the same qualification rule.
  assert.equal(chat.relations[0].ToRef, 'Message');
});

test('a module with no publishes omits the IntegrationEvents global using', () => {
  const ctx = normalizeModuleSpec({
    module: 'Notifications',
    entities: [{ name: 'Notification', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'Body', type: 'string' }] }],
    consumes: ['UserDeleted'],
  });
  const outDir = path.join(os.tmpdir(), `code-engine-nopub-test-${Date.now()}`);
  const result = generate(ctx, { preset: 'canonical-module', outDir, force: true });
  // Every GlobalUsings.cs (API and FunctionalTests) must avoid the import, since
  // the IntegrationEvents namespace is only generated when the module publishes.
  const usings = result.outputs.filter((o) => /GlobalUsings\.cs$/.test(o.path));
  assert.ok(usings.length >= 2, 'expected GlobalUsings in both the API and the FunctionalTests project');
  for (const u of usings) {
    assert.ok(!/\.Contracts\.IntegrationEvents;/.test(fs.readFileSync(u.path, 'utf8')),
      `no publishes -> ${u.path} must not import the (never-generated) IntegrationEvents namespace`);
  }
  fs.rmSync(outDir, { recursive: true, force: true });
});

// --- Phase 2: scope engine --------------------------------------------------

test('module scope renders once regardless of entity count', () => {
  const ctx = normalizeModuleSpec(validModule);
  const tmp = `${process.env.TMPDIR ?? os.tmpdir()}`;
  const { outputs } = generate(ctx, {
    preset: 'canonical-module',
    outDir: `${tmp}/code-engine-scope-test-module`,
    dryRun: true,
  });
  const moduleFiles = outputs.filter((o) => /ModuleExtensions/.test(o.path));
  assert.equal(moduleFiles.length, 1, 'AddXModule() should render exactly once per module');
});

test('entity scope fans out once per entity', () => {
  const ctx = normalizeModuleSpec(validModule);
  const { outputs } = generate(ctx, { preset: 'canonical-module', outDir: '/tmp/code-engine-scope-test-entity', dryRun: true });
  const domainFiles = outputs.filter((o) => /[\\/]Domain[\\/](Post|Comment)\.cs$/.test(o.path));
  assert.equal(domainFiles.length, 2, 'entity-scoped Domain/<Entity>.cs should render once per entity');
});

test('platform scope only fans out for entities with a ui block', () => {
  const ctx = normalizeModuleSpec(validModule); // neither entity has `ui`
  const { outputs } = generate(ctx, { preset: 'canonical-module', outDir: '/tmp/code-engine-scope-test-platform', dryRun: true });
  const pages = outputs.filter((o) => /ListPage\.razor$/.test(o.path));
  assert.equal(pages.length, 0, 'no entity declares ui, so no CRUD page should be planned');
});

test('a category-2 seed file is written once and then left alone even with --force', () => {
  const ctxWithUi = normalizeModuleSpec({
    ...validModule,
    entities: [{ ...validModule.entities[0], ui: { list: { primary: 'Title' } } }, validModule.entities[1]],
  });
  const outDir = `${os.tmpdir()}/code-engine-seed-test-${Date.now()}`;
  const first = generate(ctxWithUi, { preset: 'canonical-module', outDir, force: true });
  const seedPath = first.outputs.find((o) => /DetailPage\.Seed\.razor$/.test(o.path)).path;
  fs.writeFileSync(seedPath, '@* hand-edited *@');

  const second = generate(ctxWithUi, { preset: 'canonical-module', outDir, force: true });
  const seedOutput = second.outputs.find((o) => o.path === seedPath);
  assert.equal(seedOutput.action, 'skipped', 'seed files must survive regeneration, even with --force');
  assert.equal(fs.readFileSync(seedPath, 'utf8'), '@* hand-edited *@');

  fs.rmSync(outDir, { recursive: true, force: true });
});

test('a category-1 immutable file is always overwritten, even without --force', () => {
  const outDir = path.join(os.tmpdir(), `code-engine-immutable-test-${Date.now()}`);
  generate(normalizeModuleSpec(validModule), { preset: 'canonical-module', outDir, force: true });

  const domainPath = path.join(outDir, 'Posts.API', 'Domain', 'Post.cs');
  fs.writeFileSync(domainPath, '// hand-edited, should be clobbered');

  const second = generate(normalizeModuleSpec(validModule), { preset: 'canonical-module', outDir, force: false });
  const out = second.outputs.find((o) => o.path === domainPath);
  assert.equal(out.action, 'written', 'category-1 files regenerate even without --force');
  assert.notEqual(fs.readFileSync(domainPath, 'utf8'), '// hand-edited, should be clobbered');

  fs.rmSync(outDir, { recursive: true, force: true });
});

test('legacy (entity-level) presets are completely unaffected by scopes/categories', () => {
  const ctx = normalizeSpec(valid);
  const outDir = path.join(os.tmpdir(), `code-engine-legacy-test-${Date.now()}`);
  generate(ctx, { preset: 'simple-service', outDir, force: true });

  const modelPath = path.join(outDir, 'Model', 'Post.cs');
  fs.writeFileSync(modelPath, '// hand-edited');
  const second = generate(ctx, { preset: 'simple-service', outDir, force: false });
  const out = second.outputs.find((o) => o.path === modelPath);
  assert.equal(out.action, 'skipped', 'legacy presets keep skip-unless-force, unchanged by Phase 2');

  fs.rmSync(outDir, { recursive: true, force: true });
});

// --- Aggregate (fan-in) scope: the admin-portal preset -----------------------

const moduleA = normalizeModuleSpec({
  module: 'Posts',
  entities: [{ name: 'Post', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'Title', type: 'string' }] }],
  publishes: ['PostCreated'],
});
const moduleB = normalizeModuleSpec({
  module: 'Groups',
  entities: [
    { name: 'Group', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'Name', type: 'string' }] },
    { name: 'GroupMember', fields: [{ name: 'Id', type: 'guid', key: true }, { name: 'GroupId', type: 'guid' }] },
  ],
});

test('aggregate scope renders fan-in files once over ALL modules', () => {
  const outDir = path.join(os.tmpdir(), `code-engine-aggregate-test-${Date.now()}`);
  const { outputs } = generateAggregate([moduleA, moduleB], { preset: 'admin-portal', outDir, force: true });

  // The csproj/nav/subscriptions are aggregate (one render total), not per-module.
  const csproj = outputs.filter((o) => /AdminPortal\.UI\.Client\.csproj$/.test(o.path));
  assert.equal(csproj.length, 1, 'the client csproj is a single fan-in artifact');

  // It must reference EVERY module's typed client (fan-in).
  const csprojText = fs.readFileSync(csproj[0].path, 'utf8');
  assert.match(csprojText, /Posts\.Client\.csproj/);
  assert.match(csprojText, /Groups\.Client\.csproj/);

  // Entity scope still fans out per entity across all modules: 1 (Post) + 2 (Groups) = 3 grids.
  const grids = outputs.filter((o) => /List\.razor$/.test(o.path));
  assert.equal(grids.length, 3, 'one CRUD grid per entity across every module');

  fs.rmSync(outDir, { recursive: true, force: true });
});

test('__seed__ token marks category-2 and is stripped from the output name', () => {
  const outDir = path.join(os.tmpdir(), `code-engine-aggregate-shell-${Date.now()}`);
  const first = generateAggregate([moduleA], { preset: 'admin-portal', outDir, force: true });

  // The seed shell files keep a clean name (no ".Seed."/"__seed__" in the output).
  const mainLayout = first.outputs.find((o) => path.basename(o.path) === 'MainLayout.razor');
  assert.ok(mainLayout, 'MainLayout.razor is emitted with a clean (token-stripped) name');
  assert.doesNotMatch(path.basename(mainLayout.path), /seed/i, 'the __seed__ marker must not survive into the filename');

  // And it is a category-2 seed: a hand-edit survives regeneration.
  fs.writeFileSync(mainLayout.path, '@* mine *@');
  const second = generateAggregate([moduleA], { preset: 'admin-portal', outDir, force: true });
  const again = second.outputs.find((o) => o.path === mainLayout.path);
  assert.equal(again.action, 'skipped', 'seed shell survives regeneration');
  assert.equal(fs.readFileSync(mainLayout.path, 'utf8'), '@* mine *@');

  fs.rmSync(outDir, { recursive: true, force: true });
});

// --- readScope: the caller only sees rows that concern them -----------------------

const scopedModule = (readScope, extraField = {}) => ({
  module: 'Inbox',
  entities: [
    {
      name: 'Note',
      fields: [
        { name: 'id', type: 'guid', key: true },
        { name: 'recipientId', type: 'guid', ...extraField },
        { name: 'body', type: 'string' },
      ],
      readScope,
    },
  ],
});

function renderEndpoints(spec) {
  const ctx = normalizeModuleSpec(spec);
  const { outputs } = generate(ctx, {
    preset: 'canonical-module',
    outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'code-engine-readscope-')),
    dryRun: false,
  });
  return {
    endpoints: outputs.find((o) => /NoteEndpoints\.cs$/.test(o.path)),
    tests: outputs.find((o) => /NoteApiTests\.cs$/.test(o.path)),
  };
}

test('readScope rejects an unknown field and a non-Guid field', () => {
  assert.throws(() => normalizeModuleSpec(scopedModule({ field: 'nope' })), /unknown field "nope"/);
  const bad = scopedModule({ field: 'body' });
  assert.throws(() => normalizeModuleSpec(bad), /must be a Guid/);
});

test('readScope filters List/Get/Delete by the principal and 404s hidden rows', () => {
  const { endpoints } = renderEndpoints(scopedModule({ field: 'recipientId' }));
  const src = endpoints.content ?? fs.readFileSync(endpoints.path, 'utf8');
  assert.match(src, /e\.RecipientId == me/);
  assert.match(src, /items\.Where\(scope\)/);
  assert.match(src, /!scope\(item\)\s*\?\s*TypedResults\.NotFound\(\)/);
});

test('an entity without readScope renders the unscoped endpoints (no regression)', () => {
  const { endpoints } = renderEndpoints(scopedModule(undefined));
  const src = endpoints.content ?? fs.readFileSync(endpoints.path, 'utf8');
  assert.doesNotMatch(src, /ScopeAsync/);
});

test('readScope generates a denial test only when no scoped field is principal-bound', () => {
  const open = renderEndpoints(scopedModule({ field: 'recipientId' })).tests;
  const owned = renderEndpoints(scopedModule({ field: 'recipientId' }, { fromPrincipal: true })).tests;
  const read = (o) => o.content ?? fs.readFileSync(o.path, 'utf8');
  assert.match(read(open), /Rows_about_other_users_are_hidden/);
  assert.doesNotMatch(read(owned), /Rows_about_other_users_are_hidden/);
});
