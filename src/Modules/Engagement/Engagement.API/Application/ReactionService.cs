using Microsoft.Extensions.Logging;

namespace SocialLight.Engagement.API.Application;

/// <summary>
/// Application service for <c>Reaction</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ReactionService(
    IReactionRepository repository,
    ILogger<ReactionService> logger)
{
    public Task<Reaction?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Reaction>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Reaction> CreateAsync(
        Guid userId,
        string targetType,
        Guid targetId,
        string reactionType,
        CancellationToken cancellationToken = default)
    {
        var reaction = new Reaction(
            userId,
            targetType,
            targetId,
            reactionType
        );

        await repository.AddAsync(reaction, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Reaction), reaction.Id);
        return reaction;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
