using System.Threading;
using System.Threading.Tasks;
using SocialLight.MPEG.Service.Grpc;

namespace SocialLight.MPEG.Service.Client;

public interface IMediaProcessingClient
{
    Task<string> ConvertVideoAsync(
        byte[] fileData,
        VideoFormat targetFormat,
        VideoQualityPreset qualityPreset,
        int maxWidth = 0,
        int maxHeight = 0,
        int fps = 0,
        string callbackAddress = "",
        CancellationToken cancellationToken = default);

    Task<string> ResizeImageAsync(
        byte[] fileData,
        int width,
        int height,
        ImageFormat targetFormat,
        int quality = 80,
        ImageResizeMode resizeMode = ImageResizeMode.Max,
        string callbackAddress = "",
        CancellationToken cancellationToken = default);

    Task<JobStatusResponse> GetJobStatusAsync(string jobId, CancellationToken cancellationToken = default);
}
