using System.Text.Json;
using SocialLight.ContentEngine.Cli;
using SocialLight.ContentEngine.Infrastructure;
using SocialLight.ContentEngine.Model;

namespace SocialLight.ContentEngine.Io;

/// <summary>
/// Owns the on-disk layout of a single run under <c>&lt;root&gt;/&lt;runId&gt;/</c> and
/// the read/write of its typed artifacts. The run directory is the durable,
/// local scope: re-pointing <c>create</c>/<c>push</c>/<c>commit</c> at the same
/// run id picks up exactly where the last session left off.
/// </summary>
public sealed class RunStore
{
    public string Root { get; }
    public string RunId { get; }
    public string Dir { get; }

    public RunStore(string root, string runId)
    {
        if (string.IsNullOrWhiteSpace(runId))
            throw new CliException("run id must not be empty");
        Root = root;
        RunId = runId;
        Dir = Path.Combine(root, runId);
    }

    /// <summary>Directory for locally-generated media bytes (avatars, photos).</summary>
    public string MediaDir => Path.Combine(Dir, "media");

    /// <summary>Shared cache for downloaded stock photos (lives under root, not per-run).</summary>
    public string MediaCacheDir => Path.Combine(Root, ".media-cache");

    public string HeadPath => Path.Combine(Dir, "head.json");
    public string LedgerPath => Path.Combine(Dir, "progress.jsonl");
    public string TokensPath => Path.Combine(Dir, "tokens.json");
    public string ManifestPath => Path.Combine(Dir, "manifest.json");

    public static string ContentName(int batch) => $"content.{batch:D3}.json";
    public static string TracesName(int batch) => $"traces.{batch:D3}.json";
    public string ContentPath(int batch) => Path.Combine(Dir, ContentName(batch));
    public string TracesPath(int batch) => Path.Combine(Dir, TracesName(batch));

    /// <summary>A run exists once it has a head or an in-progress ledger.</summary>
    public bool Exists => File.Exists(HeadPath) || File.Exists(LedgerPath);

    public void EnsureDir() => Directory.CreateDirectory(Dir);

    public void Delete()
    {
        if (Directory.Exists(Dir))
            Directory.Delete(Dir, recursive: true);
    }

    public GenLedger OpenLedger()
    {
        EnsureDir();
        return GenLedger.Open(LedgerPath);
    }

    public Task<RunHead> ReadHeadAsync() => JsonFile.ReadAsync<RunHead>(HeadPath);
    public Task WriteHeadAsync(RunHead head) => JsonFile.WriteAsync(HeadPath, head);

    public Task WriteContentAsync(int batch, ContentBatch content) =>
        JsonFile.WriteAsync(ContentPath(batch), content);

    public Task WriteTracesAsync(int batch, TraceFile traces) =>
        JsonFile.WriteAsync(TracesPath(batch), traces);

    public Task WriteTokensAsync(TokenSet tokens) => JsonFile.WriteAsync(TokensPath, tokens);
    public Task WriteManifestAsync(Manifest manifest) => JsonFile.WriteAsync(ManifestPath, manifest);

    /// <summary>Concatenates every batch's operations in batch order.</summary>
    public async Task<IReadOnlyList<SeedOperation>> LoadOperationsAsync(RunHead head)
    {
        var ops = new List<SeedOperation>();
        foreach (var b in head.Batches.OrderBy(b => b.Batch))
        {
            var content = await JsonFile.ReadAsync<ContentBatch>(Path.Combine(Dir, b.Content));
            ops.AddRange(content.Operations);
        }
        return ops;
    }

    /// <summary>The assets safe to publish to a registry (everything but secrets/local state).</summary>
    public IReadOnlyList<string> PublishableAssets(RunHead head)
    {
        var assets = new List<string> { HeadPath };
        foreach (var b in head.Batches.OrderBy(b => b.Batch))
        {
            assets.Add(Path.Combine(Dir, b.Content));
            assets.Add(Path.Combine(Dir, b.Traces));
        }
        return assets.Where(File.Exists).ToList();
    }
}

/// <summary>
/// Append-only generation ledger (one JSON object per line) that makes
/// generation resumable. Each completed slot is flushed immediately, so a kill
/// loses at most the in-flight slot; a truncated final line is skipped on load.
/// </summary>
public sealed class GenLedger : IDisposable
{
    private readonly StreamWriter _writer;
    private readonly SemaphoreSlim _mutex = new(1, 1);

    private GenLedger(StreamWriter writer) => _writer = writer;

    public static GenLedger Open(string path)
    {
        var dir = Path.GetDirectoryName(Path.GetFullPath(path));
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);
        var stream = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.Read);
        return new GenLedger(new StreamWriter(stream) { AutoFlush = true });
    }

    public static async Task<IReadOnlyDictionary<string, string>> LoadAsync(string path)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        if (!File.Exists(path))
            return map;

        foreach (var line in await File.ReadAllLinesAsync(path))
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;
            try
            {
                var entry = JsonSerializer.Deserialize<LedgerLine>(line, Json.Compact);
                if (entry is { Id: not null, Text: not null })
                    map[entry.Id] = entry.Text; // last write wins
            }
            catch (JsonException)
            {
                // A torn final line from a hard kill — safe to ignore.
            }
        }
        return map;
    }

    public async Task AppendAsync(string id, string text, CancellationToken ct)
    {
        await _mutex.WaitAsync(ct);
        try
        {
            await _writer.WriteLineAsync(JsonSerializer.Serialize(new LedgerLine(id, text), Json.Compact));
        }
        finally
        {
            _mutex.Release();
        }
    }

    public void Dispose()
    {
        _writer.Dispose();
        _mutex.Dispose();
    }

    private sealed record LedgerLine(string? Id, string? Text);
}
