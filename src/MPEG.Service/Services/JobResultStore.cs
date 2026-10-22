using System;
using System.Collections.Concurrent;
using System.Linq;
using SocialLight.MPEG.Service.Models;

namespace SocialLight.MPEG.Service.Services;

public class JobResultStore : IJobResultStore
{
    private readonly ConcurrentDictionary<string, JobResult> _store = new();
    private readonly TimeSpan _ttl = TimeSpan.FromMinutes(30);

    public void Set(string jobId, JobResult result)
    {
        CleanupExpired();
        _store[jobId] = result;
    }

    public bool TryGet(string jobId, out JobResult? result)
    {
        CleanupExpired();
        if (_store.TryGetValue(jobId, out var val))
        {
            result = val;
            return true;
        }
        result = null;
        return false;
    }

    public void UpdateStatus(string jobId, JobStatus status, string? errorMessage = null)
    {
        CleanupExpired();
        _store.AddOrUpdate(
            jobId,
            id => new JobResult(id, status, ErrorMessage: errorMessage, CompletedAt: status == JobStatus.Failed ? DateTime.UtcNow : null),
            (id, old) => old with 
            { 
                Status = status, 
                ErrorMessage = errorMessage ?? old.ErrorMessage, 
                CompletedAt = status == JobStatus.Failed ? DateTime.UtcNow : old.CompletedAt 
            }
        );
    }

    public void CompleteJob(string jobId, byte[] resultBytes)
    {
        CleanupExpired();
        _store.AddOrUpdate(
            jobId,
            id => new JobResult(id, JobStatus.Completed, ResultBytes: resultBytes, CompletedAt: DateTime.UtcNow),
            (id, old) => old with 
            { 
                Status = JobStatus.Completed, 
                ResultBytes = resultBytes, 
                CompletedAt = DateTime.UtcNow 
            }
        );
    }

    private void CleanupExpired()
    {
        var now = DateTime.UtcNow;
        var expiredKeys = _store
            .Where(kvp => kvp.Value.CompletedAt.HasValue && now - kvp.Value.CompletedAt.Value > _ttl)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            _store.TryRemove(key, out _);
        }
    }
}
