using System.Globalization;

namespace SocialLight.ContentEngine.Cli;

/// <summary>A user-facing CLI error: reported as a message, not a stack trace.</summary>
public sealed class CliException(string message) : Exception(message);

/// <summary>
/// Minimal <c>--key value</c> + positional argument parser. The content-engine
/// CLI surface is small and dev-only, so we avoid a parser dependency.
/// </summary>
public sealed class ArgMap
{
    private readonly Dictionary<string, string> _opts = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<string> _positionals = [];

    public ArgMap(string[] args)
    {
        for (var i = 0; i < args.Length; i++)
        {
            var a = args[i];
            if (a.StartsWith("--", StringComparison.Ordinal))
            {
                var key = a[2..];
                if (i + 1 < args.Length && !args[i + 1].StartsWith("--", StringComparison.Ordinal))
                    _opts[key] = args[++i];
                else
                    _opts[key] = "true";
            }
            else
            {
                _positionals.Add(a);
            }
        }
    }

    public string Positional(int index, string name) =>
        index < _positionals.Count ? _positionals[index] : throw new CliException($"missing argument <{name}>");

    public string? Opt(string key) => _opts.TryGetValue(key, out var v) ? v : null;

    public string OptOr(string key, string fallback) => Opt(key) ?? fallback;

    public string Required(string key) => Opt(key) ?? throw new CliException($"--{key} is required");

    public int OptInt(string key, int fallback) =>
        Opt(key) is { } v && int.TryParse(v, out var n) ? n : fallback;

    public double OptDouble(string key, double fallback) =>
        Opt(key) is { } v && double.TryParse(v, CultureInfo.InvariantCulture, out var n) ? n : fallback;
}

/// <summary>Top-level command dispatch: <c>seed create</c> / <c>seed push</c>.</summary>
public static class CommandRouter
{
    public static async Task<int> RunAsync(string[] args)
    {
        try
        {
            return (args switch
            {
                ["seed", "create", .. var rest] => await SeedCreateCommand.RunAsync(new ArgMap(rest)),
                ["seed", "push", .. var rest] => await SeedPushCommand.RunAsync(new ArgMap(rest)),
                ["seed", "commit", .. var rest] => await SeedCommitCommand.RunAsync(new ArgMap(rest)),
                _ => Usage(),
            });
        }
        catch (CliException ex)
        {
            await Console.Error.WriteLineAsync($"error: {ex.Message}");
            return 2;
        }
    }

    private static int Usage()
    {
        Console.WriteLine(
            """
            content-engine — synthetic-content host for socialLight (dev only)

            Usage:
              content-engine seed create <scenario.plan.json>
                  [--run <id>] [--runs ./.runs] [--fresh]
                  [--endpoint http://localhost:8080] [--model gemma-3-4b]
                  [--concurrency 4] [--temp 0.85] [--max-tokens 512] [--batch-size 5000]

              content-engine seed push <run> --api <baseUrl>
                  [--runs ./.runs] [--identity <baseUrl>]

              content-engine seed commit <run> [--repo <owner/name>]
                  [--runs ./.runs] [--repo-type dataset] [--dry-run] [--message <msg>]

            A *run* is the durable local scope under .runs/<run>/. create authors it
            via local inference and is fully resumable — stop it and re-run the same
            command to continue. push replays it against the social API (writing a
            local token sidecar + ref->id manifest). commit publishes only the
            head/content/traces assets to a Hugging Face dataset; secrets stay local.
            """);
        return 1;
    }
}
