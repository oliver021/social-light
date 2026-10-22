namespace SocialLight.MPEG.Service.Models;

public record ImageResizeOptions(
    int? Width,
    int? Height,
    ImageFormat TargetFormat,
    int Quality = 80,
    ResizeMode ResizeMode = ResizeMode.Max
);
