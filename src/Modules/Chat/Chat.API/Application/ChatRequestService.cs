using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>ChatRequest</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ChatRequestService(
    IChatRequestRepository repository,
    ILogger<ChatRequestService> logger)
{
    public Task<ChatRequest?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ChatRequest>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ChatRequest> CreateAsync(
        Guid requesterId,
        Guid recipientId,
        string status,
        CancellationToken cancellationToken = default)
    {
        var chatRequest = new ChatRequest(
            requesterId,
            recipientId,
            status
        );

        await repository.AddAsync(chatRequest, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ChatRequest), chatRequest.Id);
        return chatRequest;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
