using System;
using System.IO;
using Hangfire;
using Hangfire.InMemory;
using Microsoft.Extensions.Configuration;
using SocialLight.MPEG.Service.Services;
using FFMpegCore;

namespace SocialLight.MPEG.Service.Extensions;

public static class Extensions
{
    public static IHostApplicationBuilder AddApplicationServices(this IHostApplicationBuilder builder)
    {
        builder.Services.AddHangfire(config =>
        {
            config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                  .UseSimpleAssemblyNameTypeSerializer()
                  .UseRecommendedSerializerSettings()
                  .UseInMemoryStorage();
        });

        var workerCount = builder.Configuration.GetValue<int>("Hangfire:WorkerCount", 4);
        builder.Services.AddHangfireServer(options =>
        {
            options.WorkerCount = workerCount;
        });

        builder.Services.AddSingleton<IJobResultStore, JobResultStore>();
        builder.Services.AddSingleton<IBlobStore, FileSystemBlobStore>();
        builder.Services.AddTransient<IVideoProcessingService, VideoProcessingService>();
        builder.Services.AddTransient<IImageProcessingService, ImageProcessingService>();
        builder.Services.AddTransient<MediaJobExecutor>();

        var ffmpegFolder = builder.Configuration["FFmpeg:BinaryFolder"];
        var tempFolder = builder.Configuration["FFmpeg:TempFolder"];
        
        if (!string.IsNullOrWhiteSpace(ffmpegFolder) || !string.IsNullOrWhiteSpace(tempFolder))
        {
            GlobalFFOptions.Configure(new FFOptions
            {
                BinaryFolder = !string.IsNullOrWhiteSpace(ffmpegFolder) ? ffmpegFolder : null!,
                TemporaryFilesFolder = !string.IsNullOrWhiteSpace(tempFolder) ? tempFolder : Path.GetTempPath()
            });
        }

        return builder;
    }
}
