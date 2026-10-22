namespace SocialLight.MPEG.Service.Models;

/// <summary>
/// The result of persisting bytes to the content-addressed blob store: the stable
/// relative <see cref="Url"/> is what social entities reference (Profile.AvatarUrl,
/// PostMedia.fileUrl).
/// </summary>
public record StoredBlob(string Hash, string FileName, string Url, string ContentType, long SizeBytes);
