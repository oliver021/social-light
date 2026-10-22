using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Application;

/// <summary>
/// Application service for <c>ModerationCase</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ModerationCaseService(
    IModerationCaseRepository repository,
    ILogger<ModerationCaseService> logger)
{
    public Task<ModerationCase?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ModerationCase>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ModerationCase> CreateAsync(
        string targetType,
        Guid targetId,
        string status,
        DateTime openedAt,
        CancellationToken cancellationToken = default)
    {
        var moderationCase = new ModerationCase(
            targetType,
            targetId,
            status,
            openedAt
        );

        await repository.AddAsync(moderationCase, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ModerationCase), moderationCase.Id);
        return moderationCase;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
