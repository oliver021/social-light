using Microsoft.Extensions.Logging;

namespace SocialLight.Engagement.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="ICommentRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfCommentRepository(
    EngagementDbContext context,
    ILogger<EfCommentRepository> logger) : ICommentRepository
{
    public async Task<Comment> AddAsync(Comment comment, CancellationToken cancellationToken = default)
    {
        context.Comments.Add(comment);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Comment), comment.Id);
        return comment;
    }

    public Task<Comment?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Comments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Comment>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Comments.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var comment = await context.Comments.FindAsync([id], cancellationToken);
        if (comment is null)
        {
            return false;
        }

        context.Comments.Remove(comment);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Comment), id);
        return true;
    }
}
