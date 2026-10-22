namespace SocialLight.Chat.API.Api;

/// <summary>Maps every entity endpoint group in the "Chat" module.</summary>
public static class ChatApi
{
    public static IEndpointRouteBuilder MapChatApi(this IEndpointRouteBuilder app)
    {
        app.MapChatEndpoints();
        app.MapChatParticipantEndpoints();
        app.MapMessageEndpoints();
        app.MapMessageReactionEndpoints();
        app.MapMessageReadReceiptEndpoints();
        app.MapMessageAttachmentEndpoints();
        app.MapChatBlockEndpoints();
        app.MapChatRequestEndpoints();
        app.MapChatMuteEndpoints();
        app.MapChatPinEndpoints();
        return app;
    }
}
