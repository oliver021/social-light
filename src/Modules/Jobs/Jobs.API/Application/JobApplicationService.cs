using Microsoft.Extensions.Logging;

namespace SocialLight.Jobs.API.Application;

/// <summary>
/// Application service for <c>JobApplication</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class JobApplicationService(
    IJobApplicationRepository repository,
    ILogger<JobApplicationService> logger)
{
    public Task<JobApplication?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<JobApplication>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<JobApplication> CreateAsync(
        Guid applicantId,
        Guid jobPositionId,
        Guid? resumeId,
        string? coverLetter,
        string status,
        CancellationToken cancellationToken = default)
    {
        var jobApplication = new JobApplication(
            applicantId,
            jobPositionId,
            resumeId,
            coverLetter,
            status
        );

        await repository.AddAsync(jobApplication, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(JobApplication), jobApplication.Id);
        return jobApplication;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
