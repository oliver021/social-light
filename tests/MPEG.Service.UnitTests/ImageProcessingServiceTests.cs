using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SocialLight.MPEG.Service.Models;
using SocialLight.MPEG.Service.Services;

namespace SocialLight.MPEG.Service.UnitTests;

[TestClass]
public class ImageProcessingServiceTests
{
    public TestContext TestContext { get; set; } = null!;

    private byte[] GetValidImageBytes()
    {
        using var image = new Image<Rgba32>(10, 10);
        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }

    [TestMethod]
    public async Task ResizeAsync_CorrectlyFormatsAndResizes()
    {
        var service = new ImageProcessingService();
        var input = GetValidImageBytes();
        
        var options = new ImageResizeOptions(
            Width: 5,
            Height: 5,
            TargetFormat: ImageFormat.WebP,
            Quality: 80,
            ResizeMode: ResizeMode.Max
        );

        var output = await service.ResizeAsync(input, options, TestContext.CancellationToken);

        Assert.IsNotNull(output);
        Assert.IsNotEmpty(output);

        using var outputImage = Image.Load(output);
        Assert.AreEqual(5, outputImage.Width);
        Assert.AreEqual(5, outputImage.Height);
    }
}
