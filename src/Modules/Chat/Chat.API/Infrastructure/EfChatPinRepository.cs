using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IChatPinRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfChatPinRepository(
    ChatDbContext context,
    ILogger<EfChatPinRepository> logger) : IChatPinRepository
{
    public async Task<ChatPin> AddAsync(ChatPin chatPin, CancellationToken cancellationToken = default)
    {
        context.ChatPins.Add(chatPin);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ChatPin), chatPin.Id);
        return chatPin;
    }

    public Task<ChatPin?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ChatPins.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ChatPin>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ChatPins.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var chatPin = await context.ChatPins.FindAsync([id], cancellationToken);
        if (chatPin is null)
        {
            return false;
        }

        context.ChatPins.Remove(chatPin);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ChatPin), id);
        return true;
    }
}
