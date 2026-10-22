// Generates TypeScript types from each socialLight service's OpenAPI document.
// Deterministic, no inference — the same spirit as code-engine, but for the client
// edge: the OpenAPI doc each service already publishes (ServiceDefaults) is the
// single source the typed frontend SDK is derived from (DESIGN-STRATEGY.md §5/§7).
//
// Source resolution per service (first that exists wins):
//   1. env var SOCIALLIGHT_OPENAPI_<NAME> (UPPER, - -> _) — a URL or file path
//   2. ./specs/<name>.json — committed spec files captured from a running host by
//      the OpenApiSpecDump acceptance test (the default, no live host needed)
//   3. the url in services.json — a live service (Aspire dashboard port)
//
//   npm install && npm run generate   ->   ./generated/<name>.ts
import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const services = JSON.parse(readFileSync(new URL("./services.json", import.meta.url), "utf8"));
const outDir = new URL("./generated/", import.meta.url);
await mkdir(outDir, { recursive: true });

let failures = 0;
for (const { name, url } of services) {
  const envKey = `SOCIALLIGHT_OPENAPI_${name.replaceAll("-", "_").toUpperCase()}`;
  const specFile = new URL(`./specs/${name}.json`, import.meta.url);

  // Resolve the source: env override, then committed spec file, then live URL.
  let target;
  if (process.env[envKey]) {
    target = process.env[envKey];
  } else if (existsSync(fileURLToPath(specFile))) {
    target = specFile; // a file:// URL — openapi-typescript reads it directly
  } else {
    target = url;
  }

  try {
    const input = typeof target === "string" && /^https?:|^file:/.test(target) ? new URL(target)
      : target instanceof URL ? target
      : new URL(target); // bare path/url string
    const ast = await openapiTS(input);
    const ts = astToString(ast);
    const shown = target instanceof URL ? `specs/${name}.json` : target;
    await writeFile(new URL(`./${name}.ts`, outDir), `// AUTO-GENERATED from ${shown}. Do not edit.\n\n${ts}`);
    console.log(`✓ ${name} -> generated/${name}.ts (${shown})`);
  } catch (err) {
    failures++;
    console.error(`✗ ${name}: ${err.message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} service(s) failed — run the OpenApiSpecDump test to refresh ./specs, or point SOCIALLIGHT_OPENAPI_<NAME> at a running service.`);
  process.exit(1);
}
