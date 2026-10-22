using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

public interface IJobResultStore
{
    void Set(string jobId, JobResult result);
    bool TryGet(string jobId, out JobResult? result);
    void UpdateStatus(string jobId, JobStatus status, string? errorMessage = null);
    void CompleteJob(string jobId, byte[] resultBytes);
}
