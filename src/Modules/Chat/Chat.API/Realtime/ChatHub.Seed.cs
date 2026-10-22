using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SocialLight.Chat.API.Realtime;

/// <summary>
/// ChatHub — the realtime layer over the generated CRUD
/// (DESIGN-STRATEGY.md §6, category-3 "manual on generated rails"). This is the
/// genuinely novel part the engine lays down ONCE as a seed, then you own:
/// inference is reserved for behavior like this, never the boilerplate around it.
///
/// It reuses the generated <c>MessageService</c> port
/// for persistence and fans messages out to per-conversation connection groups.
/// The sender is bound from the JWT principal — never the client payload — exactly
/// like the owner-binding rule on the REST endpoints.
/// </summary>
[Authorize]
public class ChatHub(IServiceScopeFactory scopeFactory) : Hub
{
    private static string Group(Guid chatId) => $"chat-{ chatId }";

    /// <summary>Subscribe this connection to a conversation's live updates.</summary>
    public Task Join(Guid chatId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, Group(chatId));

    /// <summary>Unsubscribe this connection from a conversation.</summary>
    public Task Leave(Guid chatId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(chatId));

    /// <summary>
    /// Persist a message through the module's service, then broadcast it to everyone
    /// in the conversation group as "ReceiveMessage".
    /// </summary>
    public async Task Send(Guid chatId, string contentType, string content, DateTime? editedAt)
    {
        var senderId = Guid.Parse(Context.User?.GetUserId()
            ?? throw new HubException("Missing 'sub' claim"));

        // SignalR hubs are transient; resolve the scoped service in its own scope.
        await using var scope = scopeFactory.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<MessageService>();
        var message = await service.CreateAsync(chatId, senderId, contentType, content, editedAt, Context.ConnectionAborted);

        var dto = new MessageDto(message.Id, message.ChatId, message.SenderId, message.ContentType, message.Content, message.EditedAt);
        await Clients.Group(Group(chatId)).SendAsync("ReceiveMessage", dto, Context.ConnectionAborted);
    }
}
