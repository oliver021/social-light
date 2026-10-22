using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using FFMpegCore;
using FFMpegCore.Enums;
using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

public class VideoProcessingService : IVideoProcessingService
{
    public async Task<byte[]> ConvertAsync(byte[] inputData, VideoConvertOptions options, CancellationToken cancellationToken = default)
    {
        var inputTempFile = Path.GetTempFileName();
        var outputExtension = options.TargetFormat == VideoFormat.Mp4 ? ".mp4" : ".webm";
        var outputTempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + outputExtension);

        try
        {
            await File.WriteAllBytesAsync(inputTempFile, inputData, cancellationToken);

            await FFMpegArguments.FromFileInput(inputTempFile)
                .OutputToFile(outputTempFile, overwrite: true, opt =>
                {
                    if (options.TargetFormat == VideoFormat.Mp4)
                    {
                        opt.WithVideoCodec(VideoCodec.LibX264)
                           .WithAudioCodec(AudioCodec.Aac);
                    }
                    else
                    {
                        opt.WithVideoCodec("libvpx-vp9")
                           .WithAudioCodec("libopus");
                    }

                    int crf = options.QualityPreset switch
                    {
                        QualityPreset.Low => 28,
                        QualityPreset.Medium => 23,
                        QualityPreset.High => 18,
                        QualityPreset.Ultra => 15,
                        _ => 23
                    };
                    opt.WithConstantRateFactor(crf);

                    if (options.MaxWidth.HasValue || options.MaxHeight.HasValue)
                    {
                        int w = options.MaxWidth ?? -2;
                        int h = options.MaxHeight ?? -2;
                        opt.WithVideoFilters(filters => filters.Scale(w, h));
                    }

                    if (options.Fps.HasValue)
                    {
                        opt.WithFramerate(options.Fps.Value);
                    }

                    if (options.AudioBitrate.HasValue)
                    {
                        opt.WithAudioBitrate(options.AudioBitrate.Value);
                    }

                    if (options.TargetFormat == VideoFormat.Mp4)
                    {
                        opt.WithFastStart();
                    }
                })
                .ProcessAsynchronously();

            return await File.ReadAllBytesAsync(outputTempFile, cancellationToken);
        }
        finally
        {
            try { File.Delete(inputTempFile); } catch { }
            try { File.Delete(outputTempFile); } catch { }
        }
    }
}
