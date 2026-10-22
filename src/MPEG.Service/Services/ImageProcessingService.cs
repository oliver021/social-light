using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

public class ImageProcessingService : IImageProcessingService
{
    public async Task<byte[]> ResizeAsync(byte[] inputData, ImageResizeOptions options, CancellationToken cancellationToken = default)
    {
        using var msInput = new MemoryStream(inputData);
        using var image = await Image.LoadAsync(msInput, cancellationToken);

        if (options.Width.HasValue || options.Height.HasValue)
        {
            var resizeOptions = new ResizeOptions
            {
                Size = new Size(options.Width ?? 0, options.Height ?? 0),
                Mode = options.ResizeMode switch
                {
                    Models.ResizeMode.Max => SixLabors.ImageSharp.Processing.ResizeMode.Max,
                    Models.ResizeMode.Pad => SixLabors.ImageSharp.Processing.ResizeMode.Pad,
                    Models.ResizeMode.Crop => SixLabors.ImageSharp.Processing.ResizeMode.Crop,
                    Models.ResizeMode.Stretch => SixLabors.ImageSharp.Processing.ResizeMode.Stretch,
                    _ => SixLabors.ImageSharp.Processing.ResizeMode.Max
                }
            };
            image.Mutate(x => x.Resize(resizeOptions));
        }

        using var msOutput = new MemoryStream();
        if (options.TargetFormat == ImageFormat.WebP)
        {
            await image.SaveAsWebpAsync(msOutput, new WebpEncoder { Quality = options.Quality }, cancellationToken);
        }
        else if (options.TargetFormat == ImageFormat.Jpeg)
        {
            await image.SaveAsJpegAsync(msOutput, new JpegEncoder { Quality = options.Quality }, cancellationToken);
        }
        else if (options.TargetFormat == ImageFormat.Png)
        {
            await image.SaveAsPngAsync(msOutput, new PngEncoder { CompressionLevel = PngCompressionLevel.BestCompression }, cancellationToken);
        }
        else
        {
            throw new NotSupportedException($"Target format {options.TargetFormat} is not supported.");
        }

        return msOutput.ToArray();
    }
}
