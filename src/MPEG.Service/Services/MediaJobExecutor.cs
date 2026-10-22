using System;
using System.Threading.Tasks;
using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

public class MediaJobExecutor
{
    private readonly IVideoProcessingService _videoService;
    private readonly IImageProcessingService _imageService;
    private readonly IJobResultStore _resultStore;

    public MediaJobExecutor(
        IVideoProcessingService videoService,
        IImageProcessingService imageService,
        IJobResultStore resultStore)
    {
        _videoService = videoService;
        _imageService = imageService;
        _resultStore = resultStore;
    }

    public async Task ExecuteVideoConversion(string jobId, byte[] inputData, VideoConvertOptions options, string callbackAddress)
    {
        _resultStore.UpdateStatus(jobId, JobStatus.Processing);
        try
        {
            var result = await _videoService.ConvertAsync(inputData, options);
            _resultStore.CompleteJob(jobId, result);
            await NotifyCallbackAsync(callbackAddress, jobId, JobStatus.Completed, result, null);
        }
        catch (Exception ex)
        {
            _resultStore.UpdateStatus(jobId, JobStatus.Failed, ex.Message);
            await NotifyCallbackAsync(callbackAddress, jobId, JobStatus.Failed, null, ex.Message);
            throw;
        }
    }

    public async Task ExecuteImageResize(string jobId, byte[] inputData, ImageResizeOptions options, string callbackAddress)
    {
        _resultStore.UpdateStatus(jobId, JobStatus.Processing);
        try
        {
            var result = await _imageService.ResizeAsync(inputData, options);
            _resultStore.CompleteJob(jobId, result);
            await NotifyCallbackAsync(callbackAddress, jobId, JobStatus.Completed, result, null);
        }
        catch (Exception ex)
        {
            _resultStore.UpdateStatus(jobId, JobStatus.Failed, ex.Message);
            await NotifyCallbackAsync(callbackAddress, jobId, JobStatus.Failed, null, ex.Message);
            throw;
        }
    }

    private async Task NotifyCallbackAsync(string callbackAddress, string jobId, JobStatus status, byte[]? resultBytes, string? errorMessage)
    {
        if (string.IsNullOrWhiteSpace(callbackAddress)) return;

        try
        {
            using var channel = global::Grpc.Net.Client.GrpcChannel.ForAddress(callbackAddress);
            var client = new global::SocialLight.MPEG.Service.Grpc.MediaProcessingCallback.MediaProcessingCallbackClient(channel);

            var grpcStatus = status switch
            {
                JobStatus.Queued => Grpc.JobStatus.Queued,
                JobStatus.Processing => Grpc.JobStatus.Processing,
                JobStatus.Completed => Grpc.JobStatus.Completed,
                JobStatus.Failed => Grpc.JobStatus.Failed,
                _ => Grpc.JobStatus.Unspecified
            };

            var request = new Grpc.JobStatusResponse
            {
                JobId = jobId,
                Status = grpcStatus,
                ErrorMessage = errorMessage ?? string.Empty
            };

            if (resultBytes != null)
            {
                request.ResultData = Google.Protobuf.ByteString.CopyFrom(resultBytes);
            }

            await client.OnJobCompletedAsync(request);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send gRPC callback to {callbackAddress}: {ex.Message}");
        }
    }
}
