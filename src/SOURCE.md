# SOURCE ORGANIZATION SCHEMA (validated)

How `src/` is organized so it can absorb the large generated social codebase
(see [APP.md](APP.md)) without disturbing the eShop base. This is the agreed
schema; it has **not** been executed yet (no files moved, `.slnx` not yet
regrouped). It is **step 1** of:

1. **Organize** `src/` to receive the massive codebase (this doc).
2. **Baseline build** with *nothing generated*, to prove the reorg broke nothing.

---

## Mechanism: hybrid (logical now, physical only for new modules)

- The buckets below are expressed as **virtual `.slnx` solution folders** for the
  **existing** projects — **no files are physically moved**, so every
  `csproj` path and `ProjectReference` stays valid and the baseline build is
  trivially green.
- Only **new generated modules** are written into **real physical subfolders**
  under `src/Modules/` (they have no incoming references yet, so this is safe).
- Moving namespaces is **not** part of this — folders do not drive C#
  namespaces, and the legacy projects keep theirs (see Legacy policy).

---

## Buckets

| Bucket            | Holds                                                                 |
|-------------------|-----------------------------------------------------------------------|
| **APIs/**         | every `*.API` microservice project (HTTP surface)                     |
| **Foundational/** | a hand-built rich domain split across `*.API` + `*.Domain` + `*.Infrastructure`, grouped under one folder named for the domain |
| **Modules/**      | **generated** social modules (the APP.md codebase) — one folder per module. **Physical.** Distinct from Foundational so the generated corpus is visually separable from the hand-built base (the thesis) |
| **Services/**     | portable, reusable domain functionality that is *not* a full module (shared domain libs). Empty today |
| **Infrastructure/** | adapters to external infra (DB, broker, cache, I/O, outbox)         |
| **Hosts/**        | deployable hosts that are **not** `*.API` (orchestrator, workers)     |
| **Clients/**      | artifacts that connect to and consume hosts                           |
| **Legacy/**       | hand-built eShop UI kept as a reference contrast (see policy below)   |
| *(independent)*   | irregular cross-cutting projects left ungrouped at `src/` root, to not fight the repo logic |

### Precedence rule

A project that is a **layer of a grouped Foundational domain wins** over the
flat rules: it stays with its domain and is **not** also placed in APIs or
Infrastructure. (So `Ordering.API` lives under `Foundational/Ordering/`, not
under `APIs/`.)

### Legacy policy

`WebApp` (legacy host) and `WebAppComponents` (legacy UI) go in **Legacy/**, are
**excluded from regeneration and rebranding**, and **keep their existing
namespaces**. They are deliberately preserved as the hand-built "before" so the
generated-vs-handwritten contrast stays legible — this strengthens the thesis,
it is not legacy to remove.

---

## Current projects mapped

| Bucket            | Projects |
|-------------------|----------|
| **APIs/**         | `Basket.API`, `Catalog.API`, `Identity.API`, `Webhooks.API` |
| **Foundational/** | `Ordering/` = `Ordering.API` + `Ordering.Domain` + `Ordering.Infrastructure` |
| **Modules/**      | *(none yet — generated here)* |
| **Services/**     | *(none yet)* |
| **Infrastructure/** | `EventBusRabbitMQ`, `IntegrationEventLogEF` |
| **Hosts/**        | `SocialLight.AppHost`, `OrderProcessor` |
| **Clients/**      | `ClientApp`, `HybridApp`, `WebhookClient` |
| **Legacy/**       | `WebApp`, `WebAppComponents` |
| *(independent)*   | `Shared`, `SocialLight.ServiceDefaults`, `PaymentProcessor`, `EventBus` |

### Minor calls applied (flag to change)

These were resolved with sensible defaults, not yet explicitly confirmed:

- **`EventBus`** (the abstraction/port) is kept **independent**, split from its
  RabbitMQ adapter (`EventBusRabbitMQ`, in Infrastructure) — matches the
  ports/adapters split in DESIGN-STRATEGY.md §4.
- **`SocialLight.ServiceDefaults`** is **independent** (cross-cutting, like `Shared`).
- **`SocialLight.AppHost`** → **Hosts/** (it is the Aspire composition host).
- **`Identity.API`** stays in **APIs/** even though it is also an auth host
  (rule: `*.API` → APIs, regardless of also being runnable).
- **`WebhookClient`** → **Clients/** (it consumes a host; "Client" by name/role).

---

## Naming

Normalized to consistent plural nouns: `APIs`, `Modules`, `Services`, `Hosts`,
`Clients`, plus `Foundational`, `Infrastructure`, `Legacy`. (Original draft had
`FUNDATIONAL` / mixed singular-plural.)
