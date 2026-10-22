using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SocialLight.MPEG.Service.Models;
using SocialLight.MPEG.Service.Services;

namespace SocialLight.MPEG.Service.Apis;

public static class ImageApi
{
    public static RouteGroupBuilder MapImageEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/v1/image");

        group.MapPost("/resize", async (
            [FromForm] IFormFile file,
            [FromQuery] int? width,
            [FromQuery] int? height,
            [FromQuery] ImageFormat? format,
            [FromQuery] int? quality,
            [FromQuery] ResizeMode? mode,
            IImageProcessingService imageService,
            CancellationToken ct) =>
        {
            if (file == null || file.Length == 0)
            {
                return Results.BadRequest("No file uploaded.");
            }

            var targetFormat = format ?? ImageFormat.WebP;
            var targetQuality = quality ?? 80;
            var targetMode = mode ?? ResizeMode.Max;

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            var inputBytes = ms.ToArray();

            var options = new ImageResizeOptions(width, height, targetFormat, targetQuality, targetMode);

            try
            {
                var resultBytes = await imageService.ResizeAsync(inputBytes, options, ct);
                var contentType = GetContentType(targetFormat);
                var ext = GetExtension(targetFormat);
                var outputFilename = Path.GetFileNameWithoutExtension(file.FileName) + ext;
                return Results.File(resultBytes, contentType, outputFilename);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message, statusCode: 500);
            }
        }).DisableAntiforgery();

        group.MapPost("/compress", async (
            [FromForm] IFormFile file,
            [FromQuery] ImageFormat? format,
            [FromQuery] int? quality,
            IImageProcessingService imageService,
            CancellationToken ct) =>
        {
            if (file == null || file.Length == 0)
            {
                return Results.BadRequest("No file uploaded.");
            }

            var targetFormat = format ?? ImageFormat.WebP;
            var targetQuality = quality ?? 80;

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            var inputBytes = ms.ToArray();

            var options = new ImageResizeOptions(null, null, targetFormat, targetQuality, ResizeMode.Max);

            try
            {
                var resultBytes = await imageService.ResizeAsync(inputBytes, options, ct);
                var contentType = GetContentType(targetFormat);
                var ext = GetExtension(targetFormat);
                var outputFilename = Path.GetFileNameWithoutExtension(file.FileName) + ext;
                return Results.File(resultBytes, contentType, outputFilename);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message, statusCode: 500);
            }
        }).DisableAntiforgery();

        return group;
    }

    private static string GetContentType(ImageFormat format) => format switch
    {
        ImageFormat.WebP => "image/webp",
        ImageFormat.Jpeg => "image/jpeg",
        ImageFormat.Png => "image/png",
        _ => "image/webp"
    };

    private static string GetExtension(ImageFormat format) => format switch
    {
        ImageFormat.WebP => ".webp",
        ImageFormat.Jpeg => ".jpg",
        ImageFormat.Png => ".png",
        _ => ".webp"
    };
}
