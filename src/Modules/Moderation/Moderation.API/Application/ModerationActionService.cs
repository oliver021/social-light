using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Application;

/// <summary>
/// Application service for <c>ModerationAction</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ModerationActionService(
    IModerationActionRepository repository,
    ILogger<ModerationActionService> logger)
{
    public Task<ModerationAction?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ModerationAction>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ModerationAction> CreateAsync(
        Guid moderationCaseId,
        Guid moderatorId,
        string actionType,
        DateTime createdAt,
        CancellationToken cancellationToken = default)
    {
        var moderationAction = new ModerationAction(
            moderationCaseId,
            moderatorId,
            actionType,
            createdAt
        );

        await repository.AddAsync(moderationAction, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ModerationAction), moderationAction.Id);
        return moderationAction;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
