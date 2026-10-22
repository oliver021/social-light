# SDK tests

`sdk.e2e.test.ts` proves the generated SDK is usable end-to-end: it runs the locked
acceptance journey (signup → login → profile → post → comment) **through the typed
`openapi-fetch` clients**, so every path / body / response is type-checked against the
committed OpenAPI specs in [`../specs`](../specs).

## Run

```bash
cd clients/typescript
npm install

# Type-level proof (no host needed) — fails if the SDK no longer matches the API:
npm run typecheck

# Runtime proof — needs the backend up; point at the social-bff gateway URL
# (copy from the Aspire dashboard after `dotnet run --project src/SocialLight.AppHost`,
# or use the AppHost's opt-in fixed port: run with `GatewayHttpPort=8088`).
SOCIALLIGHT_GATEWAY_URL=http://localhost:8088 npm test
```

Without `SOCIALLIGHT_GATEWAY_URL` the runtime test is **skipped**, so `npm test`
stays green in CI and on a host-less dev box. Refresh the specs with the
`Dump_openapi_specs` test in `tests/SocialLight.AcceptanceTests`, then `npm run generate`.
