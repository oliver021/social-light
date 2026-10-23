// Loading, validation and normalization of an entity spec into a render context.
import fs from 'node:fs';
import { toPascal, toCamel, toSnake, toKebab, pluralize, csId } from './filters.js';

// Default friendly-name -> C# type map. Extend/override via code-engine.config.js.
export const DEFAULT_TYPE_MAP = {
  string: 'string', text: 'string',
  int: 'int', integer: 'int', long: 'long', short: 'short',
  guid: 'Guid', uuid: 'Guid',
  bool: 'bool', boolean: 'bool',
  datetime: 'DateTime', date: 'DateTime', timestamp: 'DateTime', datetimeoffset: 'DateTimeOffset',
  decimal: 'decimal', money: 'decimal', double: 'double', float: 'float',
  byte: 'byte', bytes: 'byte[]',
};

export function loadSpec(specPath) {
  const raw = fs.readFileSync(specPath, 'utf8');
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Spec is not valid JSON (${specPath}): ${err.message}`);
  }
  return spec;
}

function resolveCsType(type, typeMap) {
  if (!type) return 'string';
  const key = String(type).toLowerCase();
  // Fall back to the raw type so custom/domain types (e.g. "MediaRef") pass through.
  return typeMap[key] ?? type;
}

/**
 * A deterministic C# literal usable as sample/test data for a field of the
 * given C# type. Drives the generated functional tests (request bodies) so the
 * test engine needs no inference. Falls back to `default!` for unknown types.
 */
function csSampleFor(csType, Name) {
  switch (csType) {
    case 'string': return `"sample ${Name}"`;
    case 'Guid': return 'Guid.NewGuid()';
    case 'int': case 'integer': case 'long': case 'short': return '1';
    case 'decimal': return '1m';
    case 'double': return '1d';
    case 'float': return '1f';
    case 'bool': return 'true';
    case 'DateTime': return 'DateTime.UtcNow';
    case 'DateTimeOffset': return 'DateTimeOffset.UtcNow';
    default: return 'default!';
  }
}

/** Route constraint for a key field's C# type, e.g. Guid -> ":guid". */
function keyConstraintFor(csType) {
  switch (csType) {
    case 'Guid': return ':guid';
    case 'int': return ':int';
    case 'long': return ':long';
    default: return '';
  }
}

/** A C# literal for a key value that is guaranteed not to exist (drives the 404 test). */
function missingKeyFor(csType) {
  switch (csType) {
    case 'Guid': return 'Guid.NewGuid()';
    case 'int': return 'int.MaxValue';
    case 'long': return 'long.MaxValue';
    case 'short': return 'short.MaxValue';
    case 'string': return '"does-not-exist"';
    default: return 'default!';
  }
}

function normalizeField(field, typeMap) {
  const name = field.name ?? field;
  const type = field.type ?? 'string';
  const csType = resolveCsType(type, typeMap);
  const nullable = Boolean(field.nullable);
  // A field is "required" when it's a non-nullable reference type we should init.
  const required = field.required ?? (!nullable && !field.key);
  // A field marked fromPrincipal is the caller's identity (owner): it is bound
  // server-side from the JWT `sub` claim, never accepted from the request body.
  const fromPrincipal = Boolean(field.fromPrincipal);
  const csTypeName = resolveCsType(type, typeMap);
  return {
    name,
    Name: toPascal(name),
    // Used as a C# identifier (param/local), so keyword-escape it (e.g. `@event`).
    camel: csId(toCamel(name)),
    type,
    csType,
    key: Boolean(field.key),
    nullable,
    required,
    fromPrincipal,
    // How to read this owner field off the authenticated principal (sub claim).
    principalBind: csTypeName === 'Guid'
      ? 'Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing \'sub\' claim"))'
      : 'user.GetUserId() ?? throw new InvalidOperationException("Missing \'sub\' claim")',
    csSample: csSampleFor(csType, toPascal(name)),
  };
}

function normalizeEvent(event) {
  const name = typeof event === 'string' ? event : event.name;
  return { name, Name: toPascal(name) };
}

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KNOWN_KINDS = new Set(['simple', 'rich', 'domain']);
const STRING_KEYS = ['module', 'service', 'namespace', 'domainNamespace', 'context', 'preset'];

/** Resolve the preset for a raw spec (preset wins, then kind, else simple-service). */
export function resolvePreset(spec) {
  if (spec.preset) return spec.preset;
  if (spec.kind === 'rich' || spec.kind === 'domain') return 'rich-domain';
  return 'simple-service';
}

/**
 * Strict, fail-loud validation of a raw spec. Collects every problem and throws
 * once, so a malformed spec is rejected before any file is rendered (the §11.1
 * "bad state is unrepresentable" gate, at the spec level). Does not mutate.
 */
export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error('Spec must be a JSON object.');
  }

  const errors = [];

  if (typeof spec.entity !== 'string' || !spec.entity.trim()) {
    errors.push('"entity" is required and must be a non-empty string.');
  }
  if (spec.kind != null && !KNOWN_KINDS.has(String(spec.kind))) {
    errors.push(`"kind" must be one of simple | rich | domain (got ${JSON.stringify(spec.kind)}).`);
  }
  for (const key of STRING_KEYS) {
    if (spec[key] != null && typeof spec[key] !== 'string') {
      errors.push(`"${key}" must be a string when present.`);
    }
  }

  if (!Array.isArray(spec.fields) || spec.fields.length === 0) {
    errors.push('"fields" is required and must be a non-empty array.');
  } else {
    const seen = new Map();
    let keyCount = 0;
    spec.fields.forEach((field, i) => {
      const at = `fields[${i}]`;
      const name = typeof field === 'string' ? field : field && field.name;
      if (typeof name !== 'string' || !name.trim()) {
        errors.push(`${at}: each field needs a non-empty "name".`);
        return;
      }
      if (!IDENTIFIER_RE.test(name)) {
        errors.push(`${at}: "${name}" is not a valid C# identifier.`);
      }
      const pascal = toPascal(name);
      if (seen.has(pascal)) {
        errors.push(`${at}: field "${name}" collides with "${seen.get(pascal)}" (same generated name "${pascal}").`);
      } else {
        seen.set(pascal, name);
      }
      if (typeof field === 'object' && field.type != null && typeof field.type !== 'string') {
        errors.push(`${at}: "type" must be a string when present.`);
      }
      if (typeof field === 'object' && field.key) keyCount += 1;
    });
    if (keyCount > 1) {
      errors.push(`Only one field may be marked "key" (found ${keyCount}); composite keys aren't supported yet.`);
    }
  }

  if (spec.events != null) {
    if (!Array.isArray(spec.events)) {
      errors.push('"events" must be an array when present.');
    } else {
      spec.events.forEach((event, i) => {
        const name = typeof event === 'string' ? event : event && event.name;
        if (typeof name !== 'string' || !name.trim()) {
          errors.push(`events[${i}]: must be a string or an object with a non-empty "name".`);
        }
      });
    }
  }

  if (errors.length) {
    throw new Error(`Invalid spec:\n  - ${errors.join('\n  - ')}`);
  }
}

const RELATION_KINDS = new Set(['oneToMany', 'manyToOne', 'oneToOne', 'manyToMany']);

/** True when a raw spec is module-level (Phase 1: `entities[]`) rather than the legacy single-entity shape. */
export function isModuleSpec(spec) {
  return Boolean(spec && typeof spec === 'object' && Array.isArray(spec.entities));
}

/** Resolve the preset for a module spec. */
export function resolveModulePreset(spec) {
  return spec.preset ?? 'canonical-module';
}

function validateEventList(list, key, errors) {
  if (list == null) return;
  if (!Array.isArray(list)) {
    errors.push(`"${key}" must be an array when present.`);
    return;
  }
  list.forEach((event, i) => {
    const name = typeof event === 'string' ? event : event && event.name;
    if (typeof name !== 'string' || !name.trim()) {
      errors.push(`${key}[${i}]: must be a string or an object with a non-empty "name".`);
    }
  });
}

function validateFieldsArray(fields, at, errors) {
  if (!Array.isArray(fields) || fields.length === 0) {
    errors.push(`${at}: "fields" is required and must be a non-empty array.`);
    return;
  }
  const seen = new Map();
  let keyCount = 0;
  fields.forEach((field, i) => {
    const fieldAt = `${at}.fields[${i}]`;
    const name = typeof field === 'string' ? field : field && field.name;
    if (typeof name !== 'string' || !name.trim()) {
      errors.push(`${fieldAt}: each field needs a non-empty "name".`);
      return;
    }
    if (!IDENTIFIER_RE.test(name)) {
      errors.push(`${fieldAt}: "${name}" is not a valid C# identifier.`);
    }
    const pascal = toPascal(name);
    if (seen.has(pascal)) {
      errors.push(`${fieldAt}: field "${name}" collides with "${seen.get(pascal)}" (same generated name "${pascal}").`);
    } else {
      seen.set(pascal, name);
    }
    if (typeof field === 'object' && field.type != null && typeof field.type !== 'string') {
      errors.push(`${fieldAt}: "type" must be a string when present.`);
    }
    if (typeof field === 'object' && field.key) keyCount += 1;
  });
  if (keyCount > 1) {
    errors.push(`${at}: only one field may be marked "key" (found ${keyCount}); composite keys aren't supported yet.`);
  }
}

/**
 * Strict validation of a module-level spec (Phase 1). Mirrors validateSpec's
 * "collect every problem, throw once" shape. Enforces the DESIGN-STRATEGY.md §3
 * decoupling invariant: a relation may only point at an entity declared in the
 * SAME module spec — there is no way to express a cross-module FK.
 */
export function validateModuleSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error('Spec must be a JSON object.');
  }

  const errors = [];

  if (typeof spec.module !== 'string' || !spec.module.trim()) {
    errors.push('"module" is required and must be a non-empty string.');
  }
  for (const key of ['schema', 'routePrefix', 'service', 'namespace', 'domainNamespace', 'context', 'preset']) {
    if (spec[key] != null && typeof spec[key] !== 'string') {
      errors.push(`"${key}" must be a string when present.`);
    }
  }

  const entityNames = new Set();
  if (!Array.isArray(spec.entities) || spec.entities.length === 0) {
    errors.push('"entities" is required and must be a non-empty array.');
  } else {
    spec.entities.forEach((entity, i) => {
      const at = `entities[${i}]`;
      if (!entity || typeof entity !== 'object') {
        errors.push(`${at}: each entity must be an object.`);
        return;
      }
      if (typeof entity.name !== 'string' || !entity.name.trim()) {
        errors.push(`${at}: "name" is required and must be a non-empty string.`);
      } else {
        const pascal = toPascal(entity.name);
        if (entityNames.has(pascal)) {
          errors.push(`${at}: entity name "${entity.name}" collides with another entity (same generated name "${pascal}").`);
        } else {
          entityNames.add(pascal);
        }
      }
      validateFieldsArray(entity.fields, at, errors);
      if (entity.events != null) validateEventList(entity.events, `${at}.events`, errors);
    });

    // Decoupling invariant: relations are validated in a second pass so every
    // entity name is known first, regardless of declaration order.
    spec.entities.forEach((entity, i) => {
      const at = `entities[${i}].relations`;
      if (!entity || entity.relations == null) return;
      if (!Array.isArray(entity.relations)) {
        errors.push(`${at}: must be an array when present.`);
        return;
      }
      entity.relations.forEach((rel, j) => {
        const relAt = `${at}[${j}]`;
        if (!rel || typeof rel.to !== 'string' || !rel.to.trim()) {
          errors.push(`${relAt}: "to" is required and must be a non-empty string.`);
          return;
        }
        if (!entityNames.has(toPascal(rel.to))) {
          errors.push(
            `${relAt}: relation "to": "${rel.to}" points outside this module's entities. ` +
            'Cross-module relations are not allowed by the format (DESIGN-STRATEGY.md §3) — ' +
            'use "publishes"/"consumes" instead.',
          );
        }
        if (rel.kind != null && !RELATION_KINDS.has(rel.kind)) {
          errors.push(`${relAt}: "kind" must be one of ${[...RELATION_KINDS].join(' | ')} (got ${JSON.stringify(rel.kind)}).`);
        }
      });
    });
  }

  validateEventList(spec.publishes, 'publishes', errors);
  validateEventList(spec.consumes, 'consumes', errors);

  if (errors.length) {
    throw new Error(`Invalid module spec:\n  - ${errors.join('\n  - ')}`);
  }
}

function normalizeReadScope(entity, fields) {
  const rs = entity.readScope;
  if (!rs) return null;
  const names = rs.fields ?? (rs.field ? [rs.field] : []);
  const where = `entity "${entity.name}" readScope`;
  if (!names.length) throw new Error(`Invalid module spec:\n  - ${where}: "field" or "fields" is required.`);
  const scoped = names.map((n) => {
    const f = fields.find((x) => x.name === n);
    if (!f) throw new Error(`Invalid module spec:\n  - ${where}: unknown field "${n}".`);
    if (f.csType !== 'Guid') throw new Error(`Invalid module spec:\n  - ${where}: field "${n}" must be a Guid.`);
    return { Name: f.Name };
  });
  let via = null;
  if (rs.via) {
    if (names.length !== 1) throw new Error(`Invalid module spec:\n  - ${where}: "via" takes exactly one field.`);
    via = { Entity: toPascal(rs.via.entity), Key: toPascal(rs.via.key), User: toPascal(rs.via.user) };
  }
  return { fields: scoped, via, direct: !via };
}

function normalizeEntityInModule(entity, typeMap) {
  const Entity = toPascal(entity.name);
  const fields = entity.fields.map((f) => normalizeField(f, typeMap));
  const nonKeyFields = fields.filter((f) => !f.key);
  // Owner fields come from the JWT principal, not the request body. They are
  // dropped from the Create DTO/sample (`createFields`) and bound in the endpoint;
  // `createCallArgs` keeps the service call in nonKeyFields order, substituting
  // the bound local (its camel name) for each principal field.
  const principalFields = nonKeyFields.filter((f) => f.fromPrincipal);
  const createFields = nonKeyFields.filter((f) => !f.fromPrincipal);
  const createCallArgs = nonKeyFields.map((f) => (f.fromPrincipal ? f.camel : `request.${f.Name}`));
  const requiredStringFields = fields.filter((f) => f.required && f.csType === 'string');
  const keyField = fields.find((f) => f.key) ?? { Name: 'Id', camel: 'id', csType: 'int', key: true };
  // Optional read scope: the caller may only see/delete rows that concern them
  // (owner fields equal to the JWT `sub`, or membership of a same-module entity).
  const readScope = normalizeReadScope(entity, fields);
  if (readScope?.direct) {
    // The generated tests authenticate as TestAuthHandler.UserId, so rows must be
    // "about" that user to be visible to it. A denial test (a row about someone
    // else stays hidden) is only meaningful when no scoped field is principal-bound.
    for (const sf of readScope.fields) {
      const f = fields.find((x) => x.Name === sf.Name);
      f.csSample = 'TestAuthHandler.UserId';
    }
    readScope.denyTestable = readScope.fields.every((sf) => !fields.find((x) => x.Name === sf.Name).fromPrincipal);
    readScope.denyField = readScope.fields[0].Name;
  }
  const events = (entity.events ?? []).map(normalizeEvent);
  const relations = (entity.relations ?? []).map((r) => ({
    to: r.to,
    To: toPascal(r.to),
    kind: r.kind ?? 'oneToMany',
  }));
  const pluralPascal = toPascal(pluralize(Entity));

  return {
    ...entity,
    // `entity` is emitted as a C# local/param identifier, so keyword-escape it
    // (an entity named `Event` -> `@event`). `entityLabel` is the raw camel form
    // for prose (OpenAPI summaries) where the `@` must NOT appear.
    entity: csId(toCamel(entity.name)),
    entityLabel: toCamel(entity.name),
    Entity,
    entitySnake: toSnake(Entity),
    entityKebab: toKebab(Entity),
    EntityPlural: pluralPascal,
    entityPlural: toCamel(pluralPascal),
    entityPluralKebab: toKebab(pluralPascal),
    entityPluralSnake: toSnake(pluralPascal),
    fields,
    nonKeyFields,
    principalFields,
    readScope,
    createFields,
    createCallArgs,
    requiredStringFields,
    keyField,
    keyType: keyField.csType,
    keyConstraint: keyConstraintFor(keyField.csType),
    missingKey: missingKeyFor(keyField.csType),
    events,
    relations,
    ui: entity.ui ?? null,
  };
}

/**
 * Normalize a module-level spec (Phase 1) into the context passed to
 * module/entity/platform-scoped templates. See DESIGN-STRATEGY.md §3, §8.
 */
export function normalizeModuleSpec(spec, { typeMap = DEFAULT_TYPE_MAP } = {}) {
  validateModuleSpec(spec);

  const mergedTypeMap = { ...DEFAULT_TYPE_MAP, ...typeMap };
  const module = toPascal(spec.module);
  const service = spec.service ?? `${module}.API`;
  // Generated modules sit beside the rebranded eShop base, so default to the
  // repo's `SocialLight.*` namespace root (override per-spec if needed).
  const namespace = spec.namespace ?? `SocialLight.${service}`;
  const domainNamespace = spec.domainNamespace ?? `SocialLight.${module}.Domain`;
  // The two decoupling artifacts (DESIGN-STRATEGY.md §3, §5) live in their own
  // assemblies so a consumer can take the contract/client without the backend.
  const contractsNamespace = spec.contractsNamespace ?? `SocialLight.${module}.Contracts`;
  const clientNamespace = spec.clientNamespace ?? `SocialLight.${module}.Client`;
  const contextName = spec.context ?? `${module}DbContext`;
  const schema = spec.schema ?? toSnake(module);
  // Module names are conventionally already plural (Posts, Social, ...) — don't pluralize again.
  const routePrefix = spec.routePrefix ?? `/api/${toKebab(module)}`;
  // Relative path from a generated project (src/Modules/<Module>/<Module>.X/) to
  // the repo's src/ — used by csproj ProjectReferences to the shared base.
  const srcRef = spec.srcRef ?? '..\\..\\..';

  const entities = spec.entities.map((e) => normalizeEntityInModule(e, mergedTypeMap));
  const publishes = (spec.publishes ?? []).map(normalizeEvent);
  const consumes = (spec.consumes ?? []).map(normalizeEvent);

  // --- Realtime (opt-in) ------------------------------------------------------
  // A module may declare a `realtime` block to get a SignalR hub layered over its
  // generated CRUD (DESIGN-STRATEGY.md §6 category-3 "manual on rails"): the hub
  // reuses the module's services for persistence and fans out over connection
  // groups. The hub body is generated once as a seed, then owned. Absent the
  // block, nothing realtime is emitted and the module is byte-identical as before.
  let realtime = null;
  if (spec.realtime && typeof spec.realtime === 'object') {
    const hub = spec.realtime.hub ?? `${module}Hub`;
    const route = spec.realtime.route ?? `/hubs/${toKebab(module)}`;
    const messageEntityName = toPascal(spec.realtime.messageEntity ?? 'Message');
    const messageEntity = entities.find((e) => e.Entity === messageEntityName) ?? null;
    if (!messageEntity) {
      throw new Error(
        `Invalid module spec: realtime.messageEntity "${spec.realtime.messageEntity}" ` +
        'is not one of this module\'s entities.',
      );
    }
    // The hub group is keyed by the message's "conversation" FK; the sender is bound
    // from the JWT principal (never the client), mirroring the owner-binding rule.
    const groupField = messageEntity.fields.find((f) => f.Name === toPascal(spec.realtime.groupField ?? 'ChatId'));
    const senderField = messageEntity.fields.find((f) => f.Name === toPascal(spec.realtime.senderField ?? 'SenderId'));
    if (!groupField || !senderField) {
      throw new Error('Invalid module spec: realtime.groupField/senderField must name fields on the message entity.');
    }
    // The hub Send(...) takes every non-key field except the sender (bound from JWT);
    // CreateAsync is called in the service's nonKey order, substituting the bound
    // sender local. The broadcast DTO is built from all fields in order. All derived
    // from the spec — no inference in the generated hub.
    const sendParams = messageEntity.nonKeyFields.filter((f) => f.Name !== senderField.Name);
    const createArgs = messageEntity.nonKeyFields.map((f) => (f.Name === senderField.Name ? 'senderId' : f.camel));
    const dtoArgs = messageEntity.fields.map((f) => `message.${f.Name}`);
    const groupPrefix = toKebab(groupField.Name.replace(/Id$/, '')) || 'group';
    realtime = { hub, route, messageEntity, groupField, senderField, sendParams, createArgs, dtoArgs, groupPrefix };
  }

  // Map module-level publish events onto the entity they belong to by the
  // `{Entity}Created` / `{Entity}Deleted` naming convention, so an entity's
  // service publishes exactly the events the spec declared — no inference.
  const publishByName = new Map(publishes.map((e) => [e.Name, e]));
  for (const e of entities) {
    e.createdEvent = publishByName.get(`${e.Entity}Created`) ?? null;
    e.deletedEvent = publishByName.get(`${e.Entity}Deleted`) ?? null;
    e.hasEvents = Boolean(e.createdEvent || e.deletedEvent);
  }

  // --- Intra-module foreign keys (for valid functional-test seeding) ----------
  // A child entity carries a FK field named `<Parent>Id` (the repo's naming
  // convention, app-specs/README §3) for each parent that declares a
  // oneToMany/oneToOne relation to it. The generated functional tests must
  // create the parent row before inserting the child, or the Postgres FK
  // constraint rejects the write. We mark those fields and compute, per entity,
  // an ordered seed plan (deepest parent first) plus the Create-request args
  // where each FK arg references the seeded parent's id instead of a fresh Guid.
  const byPascal = new Map(entities.map((e) => [e.Entity, e]));
  for (const e of entities) {
    for (const f of e.fields) { f.isFk = false; f.fkParent = null; }
  }
  for (const parent of entities) {
    for (const rel of parent.relations) {
      if (rel.kind !== 'oneToMany' && rel.kind !== 'oneToOne') continue;
      const child = byPascal.get(rel.To);
      if (!child) continue;
      const field = child.fields.find((f) => !f.key && f.Name === `${parent.Entity}Id`);
      if (field) { field.isFk = true; field.fkParent = parent.Entity; }
    }
  }
  // --- Type-reference disambiguation (namespace/type collision) --------------
  // When an entity name equals a namespace segment in scope (most commonly the
  // module name itself — e.g. a `Chat` entity in the `Chat` module, whose type
  // is shadowed by the `SocialLight.Chat` namespace), a bare `Chat` is a CS0118
  // error. The same hazard exists for an entity named after a BCL type that the
  // implicit global usings bring into scope — e.g. a `Thread` entity collides
  // with `System.Threading.Thread` (CS0104). `TypeRef`/`ToRef` give a
  // fully-qualified `global::` form for those type positions; non-colliding names
  // stay bare (so other modules are unchanged). Identifier-name positions (class
  // decls, `XxxService`, DTOs) keep the simple `Entity`/`To` token — only TYPE
  // references use the qualified form.
  const NS_SEGMENTS = new Set([
    module, 'SocialLight', 'API', 'Api', 'Domain', 'Contracts', 'Client',
    'Infrastructure', 'Application', 'Dtos', 'IntegrationEvents', 'FunctionalTests',
  ]);
  // Common types reachable through the default/implicit global usings of a web
  // project, against which an entity name would be ambiguous.
  const BCL_TYPE_NAMES = new Set([
    'Thread', 'Task', 'Timer', 'Type', 'Activity', 'Index', 'Range', 'Random',
    'Environment', 'Console', 'Math', 'Convert', 'Buffer', 'Path', 'File',
    'Directory', 'Stream', 'Encoding', 'Process', 'Action', 'Comparer', 'Tuple',
  ]);
  const typeRef = (name) =>
    (NS_SEGMENTS.has(name) || BCL_TYPE_NAMES.has(name) ? `global::${domainNamespace}.${name}` : name);
  for (const e of entities) {
    e.TypeRef = typeRef(e.Entity);
    for (const r of e.relations) r.ToRef = typeRef(r.To);
  }

  for (const e of entities) {
    const steps = [];
    const seeded = new Map(); // parent Entity -> var name (dedup + cycle guard)
    function seedParent(parent) {
      const existing = seeded.get(parent.Entity);
      if (existing) return existing;
      const varName = `seed${parent.Entity}`;
      seeded.set(parent.Entity, varName); // set before recursing (cycle guard)
      const args = argsFor(parent); // pushes any grandparents first
      steps.push({ varName, Entity: parent.Entity, route: `${routePrefix}/${parent.entityPluralKebab}`, keyName: parent.keyField.Name, args });
      return varName;
    }
    function argsFor(ent) {
      return ent.createFields.map((f) => {
        if (f.isFk) {
          const parent = byPascal.get(f.fkParent);
          if (parent) return `${seedParent(parent)}.${parent.keyField.Name}`;
        }
        return f.csSample;
      });
    }
    e.sampleArgs = argsFor(e);
    e.seedSteps = steps;
    e.sampleExpr = steps.length
      ? 'await SampleRequestAsync(client, TestContext.Current.CancellationToken)'
      : 'SampleRequest()';
  }

  return {
    ...spec,
    module,
    moduleKebab: toKebab(module),
    moduleCamel: toCamel(module),
    service,
    namespace,
    domainNamespace,
    contractsNamespace,
    clientNamespace,
    contextName,
    schema,
    routePrefix,
    srcRef,
    entities,
    publishes,
    consumes,
    realtime,
    // `hub` is the filename token for the realtime hub (__hub__.Seed.cs); null when
    // the module opts out, so the realtime templates are skipped by the engine.
    hub: realtime ? realtime.hub : null,
  };
}

/**
 * Turn a raw spec into the context object passed to every template.
 * Unknown top-level keys on the spec are preserved, so templates can read
 * project-specific extras without changes here.
 */
export function normalizeSpec(spec, { typeMap = DEFAULT_TYPE_MAP } = {}) {
  validateSpec(spec);

  const mergedTypeMap = { ...DEFAULT_TYPE_MAP, ...typeMap };
  const Entity = toPascal(spec.entity);
  const module = spec.module ? toPascal(spec.module) : Entity;
  const service = spec.service ?? `${module}.API`;
  const namespace = spec.namespace ?? `socialLight.${service}`;
  const domainNamespace = spec.domainNamespace ?? `socialLight.${module}.Domain`;
  const contextName = spec.context ?? `${module}Context`;

  const fields = spec.fields.map((f) => normalizeField(f, mergedTypeMap));
  // Nunjucks has no Jinja-style `for x in xs if cond`, so pre-filter here.
  const nonKeyFields = fields.filter((f) => !f.key);
  const requiredStringFields = fields.filter((f) => f.required && f.csType === 'string');
  const events = (spec.events ?? []).map(normalizeEvent);
  const keyField = fields.find((f) => f.key) ?? { Name: 'Id', camel: 'id', csType: 'int', key: true };
  const createdEvent = events.find((e) => /created$/i.test(e.Name)) ?? events[0] ?? null;

  const pluralPascal = toPascal(pluralize(Entity));

  return {
    ...spec,                       // preserve any extra spec keys for templates
    entity: toCamel(spec.entity),
    Entity,
    entitySnake: toSnake(Entity),
    entityKebab: toKebab(Entity),
    EntityPlural: pluralPascal,
    entityPlural: toCamel(pluralPascal),
    entityPluralKebab: toKebab(pluralPascal),
    entityPluralSnake: toSnake(pluralPascal),
    module,
    service,
    namespace,
    domainNamespace,
    contextName,
    fields,
    nonKeyFields,
    requiredStringFields,
    events,
    keyField,
    keyType: keyField.csType,
    createdEvent,
  };
}
