using System.Security.Cryptography;
using System.Text;

namespace SocialLight.ContentEngine.Media;

public sealed record MediaBytes(byte[] Bytes, string ContentType, string FileName);

/// <summary>
/// Port over pixel sources, mirroring <c>IInferenceClient</c>. Lets the transport
/// (identicon, Picsum, local CC0 pool, diffusion later) swap without touching the
/// author or pusher.
/// </summary>
public interface IMediaSource
{
    Task<MediaBytes> GetAvatarAsync(string handle, int seed, CancellationToken ct = default);
    Task<MediaBytes> GetPhotoAsync(string topic, int seed, CancellationToken ct = default);
}

/// <summary>
/// Default media source: deterministic SVG identicon for avatars (pure local, no
/// service) and Picsum-by-seed JPEG for photos (fetched once, cached in
/// <paramref name="cacheDir"/> so re-runs skip the network).
/// </summary>
public sealed class DefaultMediaSource(HttpClient http, string cacheDir) : IMediaSource
{
    public string CacheDir => cacheDir;

    public Task<MediaBytes> GetAvatarAsync(string handle, int seed, CancellationToken ct = default)
    {
        var svg = Identicon(handle, seed);
        return Task.FromResult(new MediaBytes(
            Encoding.UTF8.GetBytes(svg), "image/svg+xml", $"avatar-{Sanitize(handle)}.svg"));
    }

    public async Task<MediaBytes> GetPhotoAsync(string topic, int seed, CancellationToken ct = default)
    {
        // Deterministic per (topic, seed): same inputs → same Picsum image cached locally.
        var hash = (uint)HashCode.Combine(topic.ToLowerInvariant().Trim(), seed);
        var fileName = $"photo-{hash}.jpg";
        var cached = Path.Combine(cacheDir, fileName);
        if (!File.Exists(cached))
        {
            Directory.CreateDirectory(cacheDir);
            var bytes = await http.GetByteArrayAsync(
                new Uri($"https://picsum.photos/seed/{hash}/800/600"), ct);
            await File.WriteAllBytesAsync(cached, bytes, ct);
        }
        return new MediaBytes(await File.ReadAllBytesAsync(cached, ct), "image/jpeg", fileName);
    }

    // ─── SVG identicon ───────────────────────────────────────────────────────
    // 5×5 symmetric grid (left-right mirror), monochrome fill on a light ground.
    // Deterministic: SHA-256(handle:seed) → colour + cell bits.

    private static string Identicon(string handle, int seed)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{handle}:{seed}"));

        var hue = (int)(hash[0] / 255.0 * 360);
        var fg = HslHex(hue, 0.60, 0.48);

        const int cells = 5;
        const int cell = 20;
        const int pad = 5;
        const int total = cells * cell + 2 * pad;

        var sb = new StringBuilder(512);
        sb.Append($"""<svg xmlns="http://www.w3.org/2000/svg" width="{total}" height="{total}" viewBox="0 0 {total} {total}">""");
        sb.Append($"""<rect width="{total}" height="{total}" fill="#eef0f2"/>""");

        for (var row = 0; row < cells; row++)
        for (var col = 0; col <= cells / 2; col++)
        {
            if (hash[(3 + row * 3 + col) % hash.Length] % 2 == 0) continue;
            var x1 = pad + col * cell;
            var x2 = pad + (cells - 1 - col) * cell;
            var y = pad + row * cell;
            sb.Append($"""<rect x="{x1}" y="{y}" width="{cell}" height="{cell}" fill="{fg}"/>""");
            if (x1 != x2)
                sb.Append($"""<rect x="{x2}" y="{y}" width="{cell}" height="{cell}" fill="{fg}"/>""");
        }

        sb.Append("</svg>");
        return sb.ToString();
    }

    private static string HslHex(int h, double s, double l)
    {
        var c = (1 - Math.Abs(2 * l - 1)) * s;
        var x = c * (1 - Math.Abs(h / 60.0 % 2 - 1));
        var m = l - c / 2;
        double r, g, b;
        if      (h < 60)  { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else              { r = c; g = 0; b = x; }
        return $"#{(int)((r + m) * 255):x2}{(int)((g + m) * 255):x2}{(int)((b + m) * 255):x2}";
    }

    private static string Sanitize(string s) =>
        string.Concat(s.Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '-'));
}
