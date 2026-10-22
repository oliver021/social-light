using SocialLight.ContentEngine.Generation;
using SocialLight.ContentEngine.Inference;
using SocialLight.ContentEngine.Io;
using SocialLight.ContentEngine.Media;
using SocialLight.ContentEngine.Model;
using SocialLight.ContentEngine.Validation;

namespace SocialLight.ContentEngine.Cli;

/// <summary>
/// Stage 1: author a run from a scenario plan using local inference. The only
/// stage that needs the LLM. Writes a head + content/traces batches into a local
/// run directory, and is fully resumable: re-running the same run id replays the
/// generation ledger and only generates the slots that are still missing. Stop
/// it (Ctrl-C, closed terminal) and run the same command again to continue.
///
/// Flags:
///   --media             Enable avatar + photo generation (default: on; pass --no-media to skip)
///   --media-post-ratio  Fraction of posts to attach a photo (overrides plan; 0-1, default: plan value)
/// </summary>
public static class SeedCreateCommand
{
    public static async Task<int> RunAsync(ArgMap args)
    {
        var planPath = args.Positional(0, "scenario-plan");
        var runsRoot = args.OptOr("runs", "./.runs");
        var endpoint = args.OptOr("endpoint", "http://localhost:8080");
        var model = args.OptOr("model", "gemma-3-4b");
        var concurrency = args.OptInt("concurrency", 4);
        var batchSize = args.OptInt("batch-size", 5000);
        var pars = new GenerationParams(args.OptDouble("temp", 0.85), args.OptInt("max-tokens", 512));

        var plan = await SeedIo.ReadPlanAsync(planPath);
        var runId = args.OptOr("run", plan.Scenario);
        var store = new RunStore(runsRoot, runId);

        if (args.Opt("fresh") is not null)
            store.Delete();

        var resume = await GenLedger.LoadAsync(store.LedgerPath);
        if (resume.Count > 0)
            Console.Error.WriteLine($"resuming run '{runId}': {resume.Count} slot(s) already generated");

        // Media source: on by default; --no-media skips avatar + photo generation.
        var noMedia = args.Opt("no-media") is not null;
        IMediaSource? media = null;
        string? mediaDir = null;
        if (!noMedia)
        {
            var cacheHttp = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            media = new DefaultMediaSource(cacheHttp, store.MediaCacheDir);
            mediaDir = store.MediaDir;
        }

        using var http = new HttpClient { BaseAddress = new Uri(endpoint), Timeout = TimeSpan.FromMinutes(5) };
        IInferenceClient llm = new LlamaCppClient(http, model);

        Console.Error.WriteLine(
            $"authoring run '{runId}' ({plan.Scenario}): {plan.Personas.Count} personas via {model} @ {endpoint}"
            + (media is null ? "" : " [+media]"));

        AuthoredRun authored;
        using (var ledger = store.OpenLedger())
        {
            var author = new SeedAuthor(llm, pars, concurrency, media);
            authored = await author.BuildAsync(plan, ledger, resume, mediaDir, CancellationToken.None);
        }

        var errors = SeedValidator.Validate(authored.Actors, authored.Operations);
        if (errors.Count > 0)
        {
            await Console.Error.WriteLineAsync($"run incomplete — {errors.Count} slot(s) not yet generated:");
            foreach (var e in errors.Take(10))
                await Console.Error.WriteLineAsync($"  - {e}");
            await Console.Error.WriteLineAsync("re-run the same command to finish (already-generated slots are reused).");
            return 3;
        }

        var batches = await WriteBatchesAsync(store, runId, authored, batchSize);
        var head = new RunHead(
            runId, plan.Scenario, DateTimeOffset.UtcNow, model, plan.RngSeed, Version: 1, authored.Actors, batches);
        await store.WriteHeadAsync(head);

        var mediaCount = mediaDir is not null && Directory.Exists(mediaDir)
            ? Directory.GetFiles(mediaDir).Length : 0;
        Console.WriteLine(
            $"run '{runId}': {authored.Actors.Count} actors, {authored.Operations.Count} ops, "
            + $"{batches.Count} batch(es), {mediaCount} media file(s) -> {store.Dir}");
        return 0;
    }

    private static async Task<IReadOnlyList<BatchRef>> WriteBatchesAsync(
        RunStore store, string runId, AuthoredRun authored, int batchSize)
    {
        var ops = authored.Operations;
        var batches = new List<BatchRef>();
        var size = Math.Max(1, batchSize);

        for (int start = 0, batch = 0; start < Math.Max(1, ops.Count); start += size, batch++)
        {
            var slice = ops.Skip(start).Take(size).ToList();
            var end = start + slice.Count;

            var traces = authored.Traces
                .Where(tr =>
                {
                    var idx = authored.SlotOpIndex.GetValueOrDefault(tr.SlotId, -1);
                    return idx < 0 ? batch == 0 : idx >= start && idx < end;
                })
                .OrderBy(tr => authored.SlotOpIndex.GetValueOrDefault(tr.SlotId, int.MaxValue))
                .ThenBy(tr => tr.SlotId, StringComparer.Ordinal)
                .ToList();

            await store.WriteContentAsync(batch, new ContentBatch(runId, batch, slice));
            await store.WriteTracesAsync(batch, new TraceFile(runId, batch, traces));
            batches.Add(new BatchRef(batch, RunStore.ContentName(batch), RunStore.TracesName(batch), slice.Count));

            if (ops.Count == 0) break;
        }

        return batches;
    }
}
