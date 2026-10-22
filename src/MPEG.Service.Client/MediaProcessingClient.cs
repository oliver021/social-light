using System.Threading;
using System.Threading.Tasks;
using Google.Protobuf;
using SocialLight.MPEG.Service.Grpc;

namespace SocialLight.MPEG.Service.Client;

public class MediaProcessingClient : IMediaProcessingClient
{
    private readonly MediaProcessing.MediaProcessingClient _client;

    public MediaProcessingClient(MediaProcessing.MediaProcessingClient client)
    {
        _client = client;
    }

    public async Task<string> ConvertVideoAsync(
        byte[] fileData,
        VideoFormat targetFormat,
        VideoQualityPreset qualityPreset,
        int maxWidth = 0,
        int maxHeight = 0,
        int fps = 0,
        string callbackAddress = "",
        CancellationToken cancellationToken = default)
    {
        var request = new ConvertVideoRequest
        {
            FileData = ByteString.CopyFrom(fileData),
            TargetFormat = targetFormat,
            QualityPreset = qualityPreset,
            MaxWidth = maxWidth,
            MaxHeight = maxHeight,
            Fps = fps,
            CallbackAddress = callbackAddress
        };

        var response = await _client.ConvertVideoAsync(request, cancellationToken: cancellationToken);
        return response.JobId;
    }

    public async Task<string> ResizeImageAsync(
        byte[] fileData,
        int width,
        int height,
        ImageFormat targetFormat,
        int quality = 80,
        ImageResizeMode resizeMode = ImageResizeMode.Max,
        string callbackAddress = "",
        CancellationToken cancellationToken = default)
    {
        var request = new ResizeImageRequest
        {
            FileData = ByteString.CopyFrom(fileData),
            Width = width,
            Height = height,
            TargetFormat = targetFormat,
            Quality = quality,
            ResizeMode = resizeMode,
            CallbackAddress = callbackAddress
        };

        var response = await _client.ResizeImageAsync(request, cancellationToken: cancellationToken);
        return response.JobId;
    }

    public async Task<JobStatusResponse> GetJobStatusAsync(string jobId, CancellationToken cancellationToken = default)
    {
        var request = new GetJobStatusRequest { JobId = jobId };
        return await _client.GetJobStatusAsync(request, cancellationToken: cancellationToken);
    }
}
