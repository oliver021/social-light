namespace SocialLight.ContentEngine.Model;

// ── Scenario plan (input to `seed create`) ───────────────────────────────────
// A small, hand- or LLM-authorable description of who exists and what kind of
// activity to synthesize. The author expands this deterministically into a full
// operation graph; the LLM only fills the leaf text fields.

public sealed record ScenarioPlan(
    string Scenario,
    int RngSeed,
    IReadOnlyList<PlanPersona> Personas,
    PlanActivity Activity);

public sealed record PlanPersona(
    string Ref,
    string Handle,
    string DisplayName,
    string Archetype,
    IReadOnlyList<string> Interests,
    string Tone,
    string? Paradigm = null);

/// <summary>Ranges are <c>[min, max]</c> inclusive (a single value means fixed).</summary>
public sealed record PlanActivity(
    int[] PostsPerPersona,
    int[] CommentsPerPost,
    int[] ReactionsPerPost,
    IReadOnlyList<PlanConversation>? Conversations,
    double MediaPostRatio = 0.0);

public sealed record PlanConversation(
    IReadOnlyList<string> Between,
    int Turns,
    string Topic);

// ── Run artifacts (output of `create`, input of `push`/`commit`) ─────────────
// A *run* is the durable unit of local state, written under .runs/<runId>/. It
// is deliberately split into typed artifacts so generation can stop and resume
// across terminal sessions, and so only the publishable assets (head + content
// + traces) ever leave the machine — tokens/manifest/ledger stay local.
//
//   head.json        run manifest: personas (with LLM backstory) + batch index
//   content.NNN.json normalized operation graph, sharded into batches
//   traces.NNN.json  raw LLM transcripts (provenance/debug), aligned to a batch
//   progress.jsonl   append-only generation ledger (resume) — local only
//   tokens.json      ref -> bearer token sidecar (push) — local only, secret
//   manifest.json    ref -> backend id (push) — local only
//
// Operations are normalized to *API-intent*, using symbolic refs (@alice, @p1)
// instead of runtime ids; the pusher resolves them.

/// <summary>The committable run manifest: identity layer + an index of batches.</summary>
public sealed record RunHead(
    string RunId,
    string Scenario,
    DateTimeOffset CreatedAt,
    string Model,
    int RngSeed,
    int Version,
    IReadOnlyList<SeedActor> Actors,
    IReadOnlyList<BatchRef> Batches);

/// <summary>An entry in the head's batch index. Names are relative to the run dir.</summary>
public sealed record BatchRef(int Batch, string Content, string Traces, int Operations);

/// <summary>One shard of the operation graph.</summary>
public sealed record ContentBatch(
    string RunId,
    int Batch,
    IReadOnlyList<SeedOperation> Operations);

/// <summary>Raw LLM transcripts for one batch — 1:1 with each generated text slot.</summary>
public sealed record TraceFile(
    string RunId,
    int Batch,
    IReadOnlyList<Trace> Traces);

public sealed record Trace(string SlotId, string Kind, IReadOnlyList<TraceMessage> Messages);

public sealed record TraceMessage(string Role, string Content);

public sealed record SeedActor(
    string Ref,
    string Handle,
    string DisplayName,
    SeedCredential Credential,
    ActorProfile? Profile);

public sealed record SeedCredential(string Email, string Password);

public sealed record ActorProfile(
    string? Bio,
    IReadOnlyList<string>? Interests,
    string? Backstory = null,
    string? Paradigm = null,
    string? AvatarUrl = null);

/// <summary>
/// One API operation. <c>Kind</c> is <c>&lt;module&gt;.&lt;entity&gt;.&lt;verb&gt;</c>;
/// <c>As</c> is the acting actor ref (bound to the JWT principal on push, so
/// owner ids never appear in <c>Data</c>); <c>On</c>/<c>In</c>/<c>With</c> are
/// dependency refs the pusher resolves against its symbol table.
/// </summary>
public sealed record SeedOperation
{
    public string? Ref { get; init; }
    public required string Kind { get; init; }
    public required string As { get; init; }
    public string? On { get; init; }
    public string? In { get; init; }
    public IReadOnlyList<string>? With { get; init; }
    public string? AtOffset { get; init; }
    public required Dictionary<string, object?> Data { get; init; }
}

// ── Manifest (output of `push`) ──────────────────────────────────────────────
// Bridges symbolic refs to the real ids the backend assigned, so E2E tests can
// assert against handles/content and look up ids, and living mode (later) knows
// which entities are its own.

public sealed record Manifest(
    string Scenario,
    DateTimeOffset PushedAt,
    Dictionary<string, string> Refs,
    IReadOnlyList<string> Errors);

// ── Tokens (push-side sidecar) ───────────────────────────────────────────────
// Bearer tokens captured when actors are provisioned. Kept in a separate file so
// the head/content/traces remain free of secrets and safe to publish to a
// registry. Never committed; never leaves the machine.

public sealed record TokenSet(
    string RunId,
    DateTimeOffset IssuedAt,
    Dictionary<string, string> Tokens);
