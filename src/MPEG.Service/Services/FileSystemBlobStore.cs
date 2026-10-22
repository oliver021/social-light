using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

/// <summary>
/// Stores blobs on the local filesystem under a content-addressed name
/// (<c>{sha256}{ext}</c>) and serves them at <see cref="RequestPath"/> (Program's
/// static-file middleware maps the same root to that request path). Writes are
/// skip-if-exists, so seeding the same media twice is a no-op. The root is
/// <c>Media:BlobRoot</c> or <c>{ContentRoot}/blobs</c> by default.
/// </summary>
public sealed class FileSystemBlobStore : IBlobStore
{
    /// <summary>Public request path the blobs are served under.</summary>
    public const string RequestPath = "/blobs";

    public string Root { get; }

    public FileSystemBlobStore(IConfiguration configuration, IHostEnvironment env)
    {
        var configured = configuration["Media:BlobRoot"];
        Root = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "blobs")
            : configured;
        Directory.CreateDirectory(Root);
    }

    public async Task<StoredBlob> SaveAsync(byte[] bytes, string contentType, CancellationToken ct = default)
    {
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes));
        var fileName = hash + ExtensionFor(contentType);
        var path = Path.Combine(Root, fileName);

        // Content-addressed: identical bytes => same name => never re-written.
        if (!File.Exists(path))
            await File.WriteAllBytesAsync(path, bytes, ct);

        return new StoredBlob(hash, fileName, $"{RequestPath}/{fileName}", contentType, bytes.LongLength);
    }

    /// <summary>Canonical file extension for a stored content type (raster, SVG, video).</summary>
    public static string ExtensionFor(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/webp" => ".webp",
        "image/jpeg" or "image/jpg" => ".jpg",
        "image/png" => ".png",
        "image/gif" => ".gif",
        "image/svg+xml" => ".svg",
        "video/mp4" => ".mp4",
        "video/webm" => ".webm",
        _ => ".bin",
    };
}
