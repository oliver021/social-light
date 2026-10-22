using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SocialLight.MPEG.Service.Models;
using SocialLight.MPEG.Service.Services;

namespace SocialLight.MPEG.Service.Apis;

/// <summary>
/// Store-and-serve media: the upload half of the media host. Accepts a file,
/// optionally normalizes raster images through <see cref="IImageProcessingService"/>
/// (resize/recompress) when a transform is requested, persists to the
/// content-addressed <see cref="IBlobStore"/>, and returns the stable relative URL
/// a social entity references. SVG (procedural avatars) and other non-raster types
/// are stored verbatim.
/// </summary>
public static class MediaApi
{
    private static readonly HashSet<string> Raster = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/webp", "image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp",
    };

    public static IEndpointRouteBuilder MapMediaEndpoints(this IEndpointRouteBuilder routes)
    {
        routes.MapPost("/api/v1/media", async (
            [FromForm] IFormFile file,
            [FromQuery] ImageFormat? format,
            [FromQuery] int? width,
            [FromQuery] int? height,
            [FromQuery] int? quality,
            IBlobStore blobs,
            IImageProcessingService imageService,
            CancellationToken ct) =>
        {
            if (file is null || file.Length == 0)
                return Results.BadRequest("No file uploaded.");

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            var bytes = ms.ToArray();
            var contentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? "application/octet-stream"
                : file.ContentType;

            // Normalize raster images only when a transform is requested; everything
            // else (SVG avatars, already-optimal bytes) is stored verbatim.
            var wantsTransform = format.HasValue || width.HasValue || height.HasValue || quality.HasValue;
            if (wantsTransform && Raster.Contains(contentType))
            {
                var targetFormat = format ?? ImageFormat.WebP;
                var options = new ImageResizeOptions(width, height, targetFormat, quality ?? 80, ResizeMode.Max);
                bytes = await imageService.ResizeAsync(bytes, options, ct);
                contentType = targetFormat switch
                {
                    ImageFormat.Jpeg => "image/jpeg",
                    ImageFormat.Png => "image/png",
                    _ => "image/webp",
                };
            }

            var stored = await blobs.SaveAsync(bytes, contentType, ct);
            return Results.Ok(stored);
        }).DisableAntiforgery();

        return routes;
    }
}
