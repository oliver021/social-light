using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Application;

/// <summary>
/// Application service for <c>UserPreference</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class UserPreferenceService(
    IUserPreferenceRepository repository,
    ILogger<UserPreferenceService> logger)
{
    public Task<UserPreference?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<UserPreference>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<UserPreference> CreateAsync(
        Guid userId,
        string entityType,
        Guid entityId,
        string preferenceType,
        DateTime? expiresAt,
        CancellationToken cancellationToken = default)
    {
        var userPreference = new UserPreference(
            userId,
            entityType,
            entityId,
            preferenceType,
            expiresAt
        );

        await repository.AddAsync(userPreference, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(UserPreference), userPreference.Id);
        return userPreference;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
