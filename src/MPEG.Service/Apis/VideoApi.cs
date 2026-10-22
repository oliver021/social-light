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

public static class VideoApi
{
    public static RouteGroupBuilder MapVideoEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/v1/video");

        group.MapPost("/convert", async (
            [FromForm] IFormFile file,
            [FromQuery] VideoFormat? format,
            [FromQuery] QualityPreset? quality,
            [FromQuery] int? maxWidth,
            [FromQuery] int? maxHeight,
            [FromQuery] int? fps,
            IVideoProcessingService videoService,
            CancellationToken ct) =>
        {
            if (file == null || file.Length == 0)
            {
                return Results.BadRequest("No file uploaded.");
            }

            var targetFormat = format ?? VideoFormat.Mp4;
            var qualityPreset = quality ?? QualityPreset.Medium;

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            var inputBytes = ms.ToArray();

            var options = new VideoConvertOptions(targetFormat, qualityPreset, maxWidth, maxHeight, fps);
            
            try
            {
                var resultBytes = await videoService.ConvertAsync(inputBytes, options, ct);
                var contentType = targetFormat == VideoFormat.Mp4 ? "video/mp4" : "video/webm";
                var outputFilename = Path.GetFileNameWithoutExtension(file.FileName) + (targetFormat == VideoFormat.Mp4 ? ".mp4" : ".webm");
                return Results.File(resultBytes, contentType, outputFilename);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message, statusCode: 500);
            }
        }).DisableAntiforgery();

        return group;
    }
}
