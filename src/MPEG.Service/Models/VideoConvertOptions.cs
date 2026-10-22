namespace SocialLight.MPEG.Service.Models;

public record VideoConvertOptions(
    VideoFormat TargetFormat,
    QualityPreset QualityPreset,
    int? MaxWidth = null,
    int? MaxHeight = null,
    int? Fps = null,
    int? AudioBitrate = null
);
