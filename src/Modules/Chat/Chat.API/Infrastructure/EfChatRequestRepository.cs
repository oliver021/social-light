using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IChatRequestRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfChatRequestRepository(
    ChatDbContext context,
    ILogger<EfChatRequestRepository> logger) : IChatRequestRepository
{
    public async Task<ChatRequest> AddAsync(ChatRequest chatRequest, CancellationToken cancellationToken = default)
    {
        context.ChatRequests.Add(chatRequest);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ChatRequest), chatRequest.Id);
        return chatRequest;
    }

    public Task<ChatRequest?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ChatRequests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ChatRequest>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ChatRequests.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var chatRequest = await context.ChatRequests.FindAsync([id], cancellationToken);
        if (chatRequest is null)
        {
            return false;
        }

        context.ChatRequests.Remove(chatRequest);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ChatRequest), id);
        return true;
    }
}
