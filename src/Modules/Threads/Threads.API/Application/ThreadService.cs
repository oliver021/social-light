using Microsoft.Extensions.Logging;

namespace SocialLight.Threads.API.Application;

/// <summary>
/// Application service for <c>Thread</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class ThreadService(
    IThreadRepository repository,
    IEventBus eventBus,
    ILogger<ThreadService> logger)
{
    public Task<global::SocialLight.Threads.Domain.Thread?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<global::SocialLight.Threads.Domain.Thread>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<global::SocialLight.Threads.Domain.Thread> CreateAsync(
        Guid authorId,
        string title,
        string body,
        string visibility,
        CancellationToken cancellationToken = default)
    {
        var thread = new global::SocialLight.Threads.Domain.Thread(
            authorId,
            title,
            body,
            visibility
        );

        await repository.AddAsync(thread, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(global::SocialLight.Threads.Domain.Thread), thread.Id);
        await eventBus.PublishAsync(new ThreadCreated());
        return thread;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
