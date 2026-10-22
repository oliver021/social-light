using System.Threading;
using System.Threading.Tasks;
using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

public interface IVideoProcessingService
{
    Task<byte[]> ConvertAsync(byte[] inputData, VideoConvertOptions options, CancellationToken cancellationToken = default);
}
