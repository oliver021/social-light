using SocialLight.MPEG.Service.Models;
using SocialLight.MPEG.Service.Services;

namespace SocialLight.MPEG.Service.UnitTests;

[TestClass]
public class VideoProcessingServiceTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    public async Task ConvertAsync_ThrowsExceptionWhenBinariesMissingOrInputEmpty()
    {
        var service = new VideoProcessingService();
        var dummyInput = new byte[] { 1, 2, 3 };
        var options = new VideoConvertOptions(VideoFormat.Mp4, QualityPreset.Medium);

        await Assert.ThrowsAsync<Exception>(async () =>
        {
            await service.ConvertAsync(dummyInput, options, TestContext.CancellationToken);
        });
    }
}
