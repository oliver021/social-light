using System;
using System.Threading.Tasks;
using Grpc.Core;
using Hangfire;
using SocialLight.MPEG.Service.Grpc;
using SocialLight.MPEG.Service.Models;
using SocialLight.MPEG.Service.Services;
using GrpcVideoFormat = SocialLight.MPEG.Service.Grpc.VideoFormat;
using GrpcImageFormat = SocialLight.MPEG.Service.Grpc.ImageFormat;
using GrpcJobStatus = SocialLight.MPEG.Service.Grpc.JobStatus;
using GrpcImageResizeMode = SocialLight.MPEG.Service.Grpc.ImageResizeMode;

namespace SocialLight.MPEG.Service.GrpcImpl;

public class MediaProcessingService : MediaProcessing.MediaProcessingBase
{
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IJobResultStore _resultStore;

    public MediaProcessingService(IBackgroundJobClient backgroundJobClient, IJobResultStore resultStore)
    {
        _backgroundJobClient = backgroundJobClient;
        _resultStore = resultStore;
    }

    public override Task<MediaJobResponse> ConvertVideo(ConvertVideoRequest request, ServerCallContext context)
    {
        var jobId = Guid.NewGuid().ToString();

        var format = request.TargetFormat switch
        {
            GrpcVideoFormat.Mp4 => Models.VideoFormat.Mp4,
            GrpcVideoFormat.Webm => Models.VideoFormat.WebM,
            _ => Models.VideoFormat.Mp4
        };

        var preset = request.QualityPreset switch
        {
            VideoQualityPreset.VideoQualityLow => QualityPreset.Low,
            VideoQualityPreset.VideoQualityMedium => QualityPreset.Medium,
            VideoQualityPreset.VideoQualityHigh => QualityPreset.High,
            VideoQualityPreset.VideoQualityUltra => QualityPreset.Ultra,
            _ => QualityPreset.Medium
        };

        var options = new VideoConvertOptions(
            format,
            preset,
            request.MaxWidth > 0 ? request.MaxWidth : null,
            request.MaxHeight > 0 ? request.MaxHeight : null,
            request.Fps > 0 ? request.Fps : null
        );

        _resultStore.Set(jobId, new JobResult(jobId, Models.JobStatus.Queued));
        
        _backgroundJobClient.Enqueue<MediaJobExecutor>(x => x.ExecuteVideoConversion(jobId, request.FileData.ToByteArray(), options, request.CallbackAddress));

        return Task.FromResult(new MediaJobResponse { JobId = jobId });
    }

    public override Task<MediaJobResponse> ResizeImage(ResizeImageRequest request, ServerCallContext context)
    {
        var jobId = Guid.NewGuid().ToString();

        var format = request.TargetFormat switch
        {
            GrpcImageFormat.Webp => Models.ImageFormat.WebP,
            GrpcImageFormat.Jpeg => Models.ImageFormat.Jpeg,
            GrpcImageFormat.Png => Models.ImageFormat.Png,
            _ => Models.ImageFormat.WebP
        };

        var mode = request.ResizeMode switch
        {
            GrpcImageResizeMode.Max => Models.ResizeMode.Max,
            GrpcImageResizeMode.Pad => Models.ResizeMode.Pad,
            GrpcImageResizeMode.Crop => Models.ResizeMode.Crop,
            GrpcImageResizeMode.Stretch => Models.ResizeMode.Stretch,
            _ => Models.ResizeMode.Max
        };

        var options = new ImageResizeOptions(
            request.Width > 0 ? request.Width : null,
            request.Height > 0 ? request.Height : null,
            format,
            request.Quality > 0 ? request.Quality : 80,
            mode
        );

        _resultStore.Set(jobId, new JobResult(jobId, Models.JobStatus.Queued));

        _backgroundJobClient.Enqueue<MediaJobExecutor>(x => x.ExecuteImageResize(jobId, request.FileData.ToByteArray(), options, request.CallbackAddress));

        return Task.FromResult(new MediaJobResponse { JobId = jobId });
    }

    public override Task<JobStatusResponse> GetJobStatus(GetJobStatusRequest request, ServerCallContext context)
    {
        if (_resultStore.TryGet(request.JobId, out var result) && result != null)
        {
            var status = result.Status switch
            {
                Models.JobStatus.Queued => GrpcJobStatus.Queued,
                Models.JobStatus.Processing => GrpcJobStatus.Processing,
                Models.JobStatus.Completed => GrpcJobStatus.Completed,
                Models.JobStatus.Failed => GrpcJobStatus.Failed,
                _ => GrpcJobStatus.Unspecified
            };

            var response = new JobStatusResponse
            {
                JobId = result.JobId,
                Status = status,
                ErrorMessage = result.ErrorMessage ?? string.Empty
            };

            if (result.ResultBytes != null)
            {
                response.ResultData = Google.Protobuf.ByteString.CopyFrom(result.ResultBytes);
            }

            return Task.FromResult(response);
        }

        return Task.FromResult(new JobStatusResponse
        {
            JobId = request.JobId,
            Status = GrpcJobStatus.Unspecified,
            ErrorMessage = "Job not found."
        });
    }
}
