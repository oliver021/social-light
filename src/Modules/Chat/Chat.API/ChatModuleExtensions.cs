namespace SocialLight.Chat.API;

/// <summary>
/// The single line the host needs to adopt this module (DESIGN-STRATEGY.md §4):
/// it registers the module's PORTS (repositories), application services, and
/// schema initializer. It deliberately does NOT bind the database or the broker —
/// those are the host's job — so the module never sees a connection string.
/// </summary>
public static class ChatModuleExtensions
{
    public static IServiceCollection AddChatModule(this IServiceCollection services)
    {
        // Ports → adapters (dependency inversion; the adapter is swappable).
        services.AddScoped<IChatRepository, EfChatRepository>();
        services.AddScoped<IChatParticipantRepository, EfChatParticipantRepository>();
        services.AddScoped<IMessageRepository, EfMessageRepository>();
        services.AddScoped<IMessageReactionRepository, EfMessageReactionRepository>();
        services.AddScoped<IMessageReadReceiptRepository, EfMessageReadReceiptRepository>();
        services.AddScoped<IMessageAttachmentRepository, EfMessageAttachmentRepository>();
        services.AddScoped<IChatBlockRepository, EfChatBlockRepository>();
        services.AddScoped<IChatRequestRepository, EfChatRequestRepository>();
        services.AddScoped<IChatMuteRepository, EfChatMuteRepository>();
        services.AddScoped<IChatPinRepository, EfChatPinRepository>();

        // Application services.
        services.AddScoped<ChatService>();
        services.AddScoped<ChatParticipantService>();
        services.AddScoped<MessageService>();
        services.AddScoped<MessageReactionService>();
        services.AddScoped<MessageReadReceiptService>();
        services.AddScoped<MessageAttachmentService>();
        services.AddScoped<ChatBlockService>();
        services.AddScoped<ChatRequestService>();
        services.AddScoped<ChatMuteService>();
        services.AddScoped<ChatPinService>();

        // Schema initialization (EnsureCreated; per-module EF migrations are the
        // intended successor — DESIGN-STRATEGY.md §10).
        services.AddHostedService<ChatDbInitializer>();

        return services;
    }
}
