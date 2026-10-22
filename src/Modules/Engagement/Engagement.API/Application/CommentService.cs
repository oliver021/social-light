using Microsoft.Extensions.Logging;

namespace SocialLight.Engagement.API.Application;

/// <summary>
/// Application service for <c>Comment</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class CommentService(
    ICommentRepository repository,
    ILogger<CommentService> logger)
{
    public Task<Comment?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Comment>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Comment> CreateAsync(
        Guid authorId,
        string targetType,
        Guid targetId,
        Guid? parentCommentId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var comment = new Comment(
            authorId,
            targetType,
            targetId,
            parentCommentId,
            body
        );

        await repository.AddAsync(comment, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Comment), comment.Id);
        return comment;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
