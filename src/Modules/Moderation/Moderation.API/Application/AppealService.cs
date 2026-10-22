using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Application;

/// <summary>
/// Application service for <c>Appeal</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class AppealService(
    IAppealRepository repository,
    ILogger<AppealService> logger)
{
    public Task<Appeal?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Appeal>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Appeal> CreateAsync(
        Guid moderationCaseId,
        Guid appellantId,
        string reason,
        string status,
        CancellationToken cancellationToken = default)
    {
        var appeal = new Appeal(
            moderationCaseId,
            appellantId,
            reason,
            status
        );

        await repository.AddAsync(appeal, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Appeal), appeal.Id);
        return appeal;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
