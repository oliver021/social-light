using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Application;

/// <summary>
/// Application service for <c>UserInterest</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class UserInterestService(
    IUserInterestRepository repository,
    ILogger<UserInterestService> logger)
{
    public Task<UserInterest?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<UserInterest>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<UserInterest> CreateAsync(
        Guid userId,
        Guid topicId,
        double weight,
        CancellationToken cancellationToken = default)
    {
        var userInterest = new UserInterest(
            userId,
            topicId,
            weight
        );

        await repository.AddAsync(userInterest, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(UserInterest), userInterest.Id);
        return userInterest;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
