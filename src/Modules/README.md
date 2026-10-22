# Modules — generated social slices

This is the **physical** landing zone for generated social modules — one folder
per module, `src/Modules/<Module>/` — produced by the
[`code-engine`](../../code-engine) `canonical-module` preset from the entity
specs in [APP.md](../APP.md).

It is the one bucket in the [source schema](../SOURCE.md) that holds real files
on disk; the other buckets (APIs, Foundational, Infrastructure, Hosts, Clients,
Legacy) are **virtual `.slnx` solution folders** over the existing eShop base,
so reorganizing them moved no files and kept every project reference intact.

Generated modules are added to the solution under the `/src/Modules/` solution
folder as they are produced.
