# Vector Service — architecture

## Project Overview

This repository contains the Vector Intelligence Service used by the Social Platform ecosystem.

The service provides:

* Text vectorization
* Semantic search
* Similarity search
* Recommendation primitives
* User profile embeddings
* Log semantic analysis
* Banner relevance matching
* Future AI retrieval capabilities

The service is internal and communicates with other microservices through RabbitMQ and internal APIs.

---

# Architecture Principles

## Event Driven

The service never owns business entities.

Source services remain the source of truth.

Examples:

* Post Service owns posts
* Quest Service owns quests
* Banner Service owns banners
* Identity Service owns users

The Vector Service stores only:

* Embeddings
* Metadata references
* Search indexes

---

## Generic Entity Model

Avoid entity-specific implementations.

Never create:

* PostEmbedding
* BannerEmbedding
* QuestEmbedding

Prefer:

```csharp
VectorDocument
```

with:

```csharp
EntityType
EntityId
Embedding
Metadata
```

All new domains must reuse the same infrastructure.

---

## Provider Abstraction

Embedding generation must always be abstracted.

Use:

```csharp
IEmbeddingProvider
```

Implementations may include:

* OpenAI
* Azure OpenAI
* Ollama
* Local models

Business logic must not depend on a vendor.

---

## Search Strategy

Prefer hybrid search:

* Full text search
* Semantic similarity

Combined ranking is preferred over pure vector similarity.

---

## Event Naming

Use domain events.

Examples:

```text
PostCreated
PostUpdated
PostDeleted

QuestCreated
QuestUpdated

BannerCreated
BannerUpdated
```

Avoid embedding-specific event names.

The Vector Service reacts to domain events.

---

## Data Ownership

Never duplicate business data.

Store only:

```text
EntityId
EntityType
Embedding
Metadata
```

Fetch business objects from owning services.

---

## Development Guidelines

When adding a new searchable entity:

1. Create event consumer
2. Define content extraction strategy
3. Generate embedding
4. Store VectorDocument
5. Register searchable metadata
6. Add integration tests

No custom pipelines unless strictly necessary.

---

## Future Extensions

The architecture should support:

* RAG
* Recommendation engines
* Similar users
* Similar content
* Semantic moderation
* AI assistants
* Analytics

Design decisions must favor reusability over feature-specific optimizations.
