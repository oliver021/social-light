using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IChatMuteRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfChatMuteRepository(
    ChatDbContext context,
    ILogger<EfChatMuteRepository> logger) : IChatMuteRepository
{
    public async Task<ChatMute> AddAsync(ChatMute chatMute, CancellationToken cancellationToken = default)
    {
        context.ChatMutes.Add(chatMute);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ChatMute), chatMute.Id);
        return chatMute;
    }

    public Task<ChatMute?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ChatMutes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ChatMute>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ChatMutes.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var chatMute = await context.ChatMutes.FindAsync([id], cancellationToken);
        if (chatMute is null)
        {
            return false;
        }

        context.ChatMutes.Remove(chatMute);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ChatMute), id);
        return true;
    }
}
