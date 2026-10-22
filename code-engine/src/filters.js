// Casing / naming helpers + Nunjucks filter registration.
// Keep these dependency-free so they can be reused from spec normalization.

/** Split any identifier (camel, Pascal, snake, kebab, spaced) into words. */
export function words(input) {
  return String(input ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')      // fooBar  -> foo Bar
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // HTTPServer -> HTTP Server
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

export function toPascal(s) {
  return words(s).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
}

export function toCamel(s) {
  const p = toPascal(s);
  return p ? p[0].toLowerCase() + p.slice(1) : p;
}

export function toSnake(s) {
  return words(s).map((w) => w.toLowerCase()).join('_');
}

export function toKebab(s) {
  return words(s).map((w) => w.toLowerCase()).join('-');
}

// C# reserved keywords. An identifier that collides with one must be escaped
// with a leading `@` (a verbatim identifier) or it is a syntax error — e.g. an
// entity named `Event` has the camel form `event`, which the compiler reads as
// an event accessor. See ECMA-334 / the C# language spec keyword tables.
const CSHARP_KEYWORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in',
  'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'new',
  'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
  'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
  'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
]);

/**
 * Make a token safe to emit as a C# identifier: verbatim-escape it with `@` when
 * it collides with a reserved keyword, otherwise return it unchanged. Use for any
 * generated identifier (local/param/variable names) derived from user-supplied
 * names; never for prose or string literals.
 */
export function csId(name) {
  return CSHARP_KEYWORDS.has(String(name ?? '')) ? `@${name}` : String(name ?? '');
}

/** Naive English pluralization — good enough for identifiers; override per-spec if needed. */
export function pluralize(word) {
  const w = String(word ?? '');
  if (/[^aeiou]y$/i.test(w)) return w.replace(/y$/i, 'ies');
  if (/(s|x|z|ch|sh)$/i.test(w)) return `${w}es`;
  return `${w}s`;
}

/**
 * Register the helper filters on a Nunjucks environment.
 * Extra filters (from code-engine.config.js) are merged on top, so a project
 * can add or override behavior without touching this file.
 */
export function registerFilters(env, extraFilters = {}) {
  env.addFilter('pascal', toPascal);
  env.addFilter('camel', toCamel);
  env.addFilter('snake', toSnake);
  env.addFilter('kebab', toKebab);
  env.addFilter('plural', pluralize);

  for (const [name, fn] of Object.entries(extraFilters)) {
    if (typeof fn === 'function') env.addFilter(name, fn);
  }
}
