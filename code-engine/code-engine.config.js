// Optional project configuration for code-engine.
// Everything here is merged on top of the built-in defaults, so you can adapt
// the generator to socialLight conventions without editing src/.
//
// - typeMap : friendly field type -> C# type. Overrides/extends DEFAULT_TYPE_MAP.
// - filters : extra Nunjucks filters available in every template.
export default {
  typeMap: {
    // Domain-specific shortcuts used across socialLight specs.
    userid: 'Guid',
    url: 'string',
    media: 'string',
  },

  filters: {
    // Example custom filter — usable in templates as `{{ name | comment }}`.
    comment: (value) => `// ${value}`,
  },
};
