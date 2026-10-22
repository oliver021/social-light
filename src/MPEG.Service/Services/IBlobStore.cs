using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

/// <summary>
/// Content-addressed blob storage — the "host" half of the media strategy. Callers
/// (the content-engine seed push, or any upload) hand it bytes; it persists them
/// under a hash-derived name and returns a stable relative URL the social entities
/// reference (Profile.AvatarUrl, PostMedia.fileUrl). Content addressing makes
/// re-runs idempotent: identical bytes resolve to the same URL and are never
/// re-written, mirroring the deterministic, replayable spirit of the seed pipeline.
/// </summary>
public interface IBlobStore
{
    /// <summary>The absolute directory blobs are written to and served from.</summary>
    string Root { get; }

    /// <summary>Persist <paramref name="bytes"/> and return its addressable URL.</summary>
    Task<StoredBlob> SaveAsync(byte[] bytes, string contentType, CancellationToken ct = default);
}
