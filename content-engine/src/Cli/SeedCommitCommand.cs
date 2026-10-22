using System.Diagnostics;
using SocialLight.ContentEngine.Io;

namespace SocialLight.ContentEngine.Cli;

/// <summary>
/// Stage 3 (on request): publish a run's <b>publishable</b> assets — head +
/// content batches + traces — to a Hugging Face dataset repo. Secrets and local
/// state (tokens, manifest, the resume ledger) are never staged, so the big
/// corpus can live in a registry while the machine keeps what it must.
///
/// Default behaviour is a dry run (list what would be published). Pass
/// <c>--repo &lt;owner/name&gt;</c> to actually upload via the Hugging Face CLI.
/// </summary>
public static class SeedCommitCommand
{
    public static async Task<int> RunAsync(ArgMap args)
    {
        var runId = args.Positional(0, "run");
        var runsRoot = args.OptOr("runs", "./.runs");
        var repo = args.Opt("repo");
        var repoType = args.OptOr("repo-type", "dataset");
        var dryRun = args.Opt("dry-run") is not null || repo is null;

        var store = new RunStore(runsRoot, runId);
        if (!store.Exists)
            throw new CliException($"run '{runId}' not found under {runsRoot}");

        var head = await store.ReadHeadAsync();
        var assets = store.PublishableAssets(head);
        var total = assets.Sum(a => new FileInfo(a).Length);

        Console.Error.WriteLine($"run '{runId}': {assets.Count} publishable asset(s), {Human(total)} (tokens/manifest/ledger excluded)");
        foreach (var a in assets)
            Console.Error.WriteLine($"  {Human(new FileInfo(a).Length),8}  {Path.GetFileName(a)}");

        if (dryRun)
        {
            if (repo is null)
                Console.Error.WriteLine("dry run — pass --repo <owner/name> to publish to Hugging Face.");
            else
                Console.Error.WriteLine($"dry run — would upload to {repoType} '{repo}'.");
            return 0;
        }

        // Stage only the publishable assets into a clean folder, then upload it as
        // a unit. Staging (vs. --exclude flags) guarantees no secret can leak.
        var stage = Path.Combine(store.Dir, ".publish");
        if (Directory.Exists(stage)) Directory.Delete(stage, recursive: true);
        Directory.CreateDirectory(stage);
        foreach (var a in assets)
            File.Copy(a, Path.Combine(stage, Path.GetFileName(a)), overwrite: true);

        var message = args.OptOr("message", $"content-engine run {runId}");
        var cli = ResolveHfCli();
        var exit = await RunProcessAsync(cli,
            ["upload", repo!, stage, ".", "--repo-type", repoType, "--commit-message", message],
            CancellationToken.None);

        Directory.Delete(stage, recursive: true);
        if (exit != 0)
            throw new CliException($"{cli} exited with code {exit}");

        Console.WriteLine($"published run '{runId}' to {repoType} '{repo}'");
        return 0;
    }

    private static string ResolveHfCli()
    {
        // Prefer the modern `hf`, fall back to `huggingface-cli`.
        foreach (var candidate in new[] { "hf", "huggingface-cli" })
        {
            try
            {
                using var probe = Process.Start(new ProcessStartInfo(candidate, "--help")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                });
                probe?.WaitForExit(5000);
                return candidate;
            }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception)
            {
                // not on PATH — try the next candidate
            }
        }

        throw new CliException(
            "Hugging Face CLI not found. Install it (`pip install -U huggingface_hub`) and run "
            + "`hf auth login`, then retry.");
    }

    private static async Task<int> RunProcessAsync(string file, IReadOnlyList<string> arguments, CancellationToken ct)
    {
        var psi = new ProcessStartInfo(file)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (var a in arguments)
            psi.ArgumentList.Add(a);

        using var proc = Process.Start(psi) ?? throw new CliException($"failed to start {file}");
        proc.OutputDataReceived += (_, e) => { if (e.Data is not null) Console.Error.WriteLine(e.Data); };
        proc.ErrorDataReceived += (_, e) => { if (e.Data is not null) Console.Error.WriteLine(e.Data); };
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();
        await proc.WaitForExitAsync(ct);
        return proc.ExitCode;
    }

    private static string Human(long bytes) => bytes switch
    {
        >= 1L << 30 => $"{bytes / (double)(1L << 30):0.0} GB",
        >= 1L << 20 => $"{bytes / (double)(1L << 20):0.0} MB",
        >= 1L << 10 => $"{bytes / (double)(1L << 10):0.0} KB",
        _ => $"{bytes} B",
    };
}
