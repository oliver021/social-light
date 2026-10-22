using System.Threading;
using System.Threading.Tasks;
using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

public interface IImageProcessingService
{
    Task<byte[]> ResizeAsync(byte[] inputData, ImageResizeOptions options, CancellationToken cancellationToken = default);
}
