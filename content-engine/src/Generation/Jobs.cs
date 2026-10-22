using System.Collections.Concurrent;
using SocialLight.ContentEngine.Inference;
using SocialLight.ContentEngine.Io;
using SocialLight.ContentEngine.Model;

namespace SocialLight.ContentEngine.Generation;

/// <summary>
/// One generated text slot — the atomic unit of LLM work and the atomic unit of
/// resume. <c>SlotId</c> is stable across runs (derived from the deterministic
/// operation graph), so a completed slot can be replayed from the ledger instead
/// of regenerated. <c>User</c> receives the already-resolved texts of earlier
/// steps in the same unit, which is how a chat turn sees prior turns and a
/// comment sees the post it replies to.
/// </summary>
public sealed record GenStep(
    string SlotId,
    string Kind,
    string System,
    Func<IReadOnlyList<string>, string> User,
    Action<string> Apply)
{
    /// <summary>Per-slot token override (e.g. a backstory needs more room).</summary>
    public int? MaxTokens { get; init; }
}

/// <summary>
/// A group of slots. Independent units fan out concurrently; the steps *within* a
/// unit run in order so each can build on the last. We model a persona's
/// identity (backstory → bio), a post-thread (post body → its comments), and a
/// 1:1 conversation (turn → turn) as sequential units — this is also the
/// anti-hallucination discipline: a post and its comments are generated together
/// in one context, never as a detached cross pass.
/// </summary>
public sealed class GenUnit
{
    public required string Id { get; init; }
    public required IReadOnlyList<GenStep> Steps { get; init; }
}

/// <summary>The fully-resolved result of authoring a run, ready to shard + write.</summary>
public sealed record AuthoredRun(
    IReadOnlyList<SeedActor> Actors,
    IReadOnlyList<SeedOperation> Operations,
    IReadOnlyList<Trace> Traces,
    IReadOnlyDictionary<string, int> SlotOpIndex);

/// <summary>
/// Runs generation units with bounded concurrency, per-slot retry, and durable
/// resume. Slots already present in <paramref name="resume"/> are applied without
/// touching the model; freshly generated slots are appended to the ledger as they
/// complete, so a kill at any point loses at most one in-flight slot. A unit that
/// can't complete a step (e.g. a small model that keeps returning empty) is left
/// for the next run to finish — the run is idempotent and re-entrant.
/// </summary>
public sealed class GenRunner(int concurrency, int maxRetries)
{
    public async Task<IReadOnlyList<Trace>> RunAsync(
        IReadOnlyList<GenUnit> units,
        IInferenceClient llm,
        GenerationParams pars,
        GenLedger ledger,
        IReadOnlyDictionary<string, string> resume,
        CancellationToken ct)
    {
        var total = units.Sum(u => u.Steps.Count);
        var traces = new ConcurrentBag<Trace>();
        var done = 0;
        var reused = 0;
        var failed = 0;

        using var gate = new SemaphoreSlim(Math.Max(1, concurrency));
        var tasks = units.Select(async unit =>
        {
            await gate.WaitAsync(ct);
            try
            {
                var prior = new List<string>(unit.Steps.Count);
                foreach (var step in unit.Steps)
                {
                    var user = step.User(prior);
                    string text;

                    if (resume.TryGetValue(step.SlotId, out var cached))
                    {
                        text = cached;
                        Interlocked.Increment(ref reused);
                    }
                    else
                    {
                        text = await GenerateAsync(step, user, llm, pars, ct);
                        await ledger.AppendAsync(step.SlotId, text, ct);
                    }

                    step.Apply(text);
                    prior.Add(text);
                    traces.Add(new Trace(step.SlotId, step.Kind,
                    [
                        new TraceMessage("system", step.System),
                        new TraceMessage("user", user),
                        new TraceMessage("assistant", text),
                    ]));

                    var n = Interlocked.Increment(ref done);
                    await Console.Error.WriteLineAsync($"  [{n}/{total}] {step.SlotId}");
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                Interlocked.Increment(ref failed);
                await Console.Error.WriteLineAsync($"  ! {unit.Id}: {ex.Message} (will retry on resume)");
            }
            finally
            {
                gate.Release();
            }
        });

        await Task.WhenAll(tasks);
        if (reused > 0)
            await Console.Error.WriteLineAsync($"resumed {reused} slot(s) from ledger");
        if (failed > 0)
            await Console.Error.WriteLineAsync($"warning: {failed} unit(s) left incomplete — re-run to finish");
        return traces.ToList();
    }

    private async Task<string> GenerateAsync(
        GenStep step, string user, IInferenceClient llm, GenerationParams pars, CancellationToken ct)
    {
        var stepPars = step.MaxTokens is { } mt ? pars with { MaxTokens = mt } : pars;

        // Small models intermittently emit a degenerate empty completion
        // (finish_reason=length, no content); independent resampling clears it.
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                var text = await llm.CompleteAsync(step.System, user, stepPars, ct);
                if (!string.IsNullOrWhiteSpace(text))
                    return text;
                if (attempt >= maxRetries)
                    throw new InvalidOperationException($"{step.SlotId}: empty after {attempt + 1} attempts");
            }
            catch (Exception ex) when (attempt < maxRetries && ex is not OperationCanceledException and not InvalidOperationException)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(250 * (attempt + 1)), ct);
            }
        }
    }
}
