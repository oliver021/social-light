using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IChatRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfChatRepository(
    ChatDbContext context,
    ILogger<EfChatRepository> logger) : IChatRepository
{
    public async Task<global::SocialLight.Chat.Domain.Chat> AddAsync(global::SocialLight.Chat.Domain.Chat chat, CancellationToken cancellationToken = default)
    {
        context.Chats.Add(chat);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(global::SocialLight.Chat.Domain.Chat), chat.Id);
        return chat;
    }

    public Task<global::SocialLight.Chat.Domain.Chat?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Chats.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<global::SocialLight.Chat.Domain.Chat>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Chats.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var chat = await context.Chats.FindAsync([id], cancellationToken);
        if (chat is null)
        {
            return false;
        }

        context.Chats.Remove(chat);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(global::SocialLight.Chat.Domain.Chat), id);
        return true;
    }
}
