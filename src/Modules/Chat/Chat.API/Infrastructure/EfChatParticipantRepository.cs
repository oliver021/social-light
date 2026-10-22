using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IChatParticipantRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfChatParticipantRepository(
    ChatDbContext context,
    ILogger<EfChatParticipantRepository> logger) : IChatParticipantRepository
{
    public async Task<ChatParticipant> AddAsync(ChatParticipant chatParticipant, CancellationToken cancellationToken = default)
    {
        context.ChatParticipants.Add(chatParticipant);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ChatParticipant), chatParticipant.Id);
        return chatParticipant;
    }

    public Task<ChatParticipant?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ChatParticipants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ChatParticipant>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ChatParticipants.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var chatParticipant = await context.ChatParticipants.FindAsync([id], cancellationToken);
        if (chatParticipant is null)
        {
            return false;
        }

        context.ChatParticipants.Remove(chatParticipant);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ChatParticipant), id);
        return true;
    }
}
