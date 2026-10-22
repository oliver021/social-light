using SocialLight.ContentEngine.Io;
using SocialLight.ContentEngine.Push;
using SocialLight.ContentEngine.Validation;

namespace SocialLight.ContentEngine.Cli;

/// <summary>
/// Stage 2: replay a run against the social API, then write the token sidecar and
/// the ref -> id manifest back into the run directory. No inference. Decoupled
/// from <c>create</c> by the on-disk run, so the same run can drive E2E fixtures
/// or a louder benchmark/stress pass.
/// </summary>
public static class SeedPushCommand
{
    public static async Task<int> RunAsync(ArgMap args)
    {
        var runId = args.Positional(0, "run");
        var runsRoot = args.OptOr("runs", "./.runs");
        var api = new Uri(args.Required("api"));
        var identity = new Uri(args.OptOr("identity", api.ToString()));

        var store = new RunStore(runsRoot, runId);
        if (!store.Exists)
            throw new CliException($"run '{runId}' not found under {runsRoot}");

        var head = await store.ReadHeadAsync();
        var operations = await store.LoadOperationsAsync(head);

        var errors = SeedValidator.Validate(head.Actors, operations);
        if (errors.Count > 0)
        {
            await Console.Error.WriteLineAsync($"run failed validation ({errors.Count}); refusing to push:");
            foreach (var e in errors)
                await Console.Error.WriteLineAsync($"  - {e}");
            return 3;
        }

        var mediaDir = Directory.Exists(store.MediaDir) ? store.MediaDir : null;
        Console.Error.WriteLine(
            $"pushing run '{runId}': {head.Actors.Count} actors, {operations.Count} ops -> {api}"
            + (mediaDir is not null ? $" [+media: {Directory.GetFiles(mediaDir).Length} file(s)]" : ""));
        var (manifest, tokens) = await new SeedPusher(api, identity)
            .PushAsync(runId, head.Scenario, head.Actors, operations, mediaDir, CancellationToken.None);

        await store.WriteTokensAsync(tokens);
        await store.WriteManifestAsync(manifest);
        Console.Error.WriteLine($"tokens -> {store.TokensPath}");
        Console.Error.WriteLine($"manifest -> {store.ManifestPath}");

        Console.WriteLine($"resolved {manifest.Refs.Count} refs, {manifest.Errors.Count} error(s)");
        foreach (var e in manifest.Errors)
            await Console.Error.WriteLineAsync($"  ! {e}");

        return manifest.Errors.Count > 0 ? 4 : 0;
    }
}
