using System;

namespace SocialLight.MPEG.Service.Models;

public enum JobStatus
{
    Queued,
    Processing,
    Completed,
    Failed
}

public record JobResult(
    string JobId,
    JobStatus Status,
    byte[]? ResultBytes = null,
    string? ErrorMessage = null,
    DateTime? CompletedAt = null
);
