namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// DbContext for the "Chat" module — owns the "chat" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class ChatDbContext(DbContextOptions<ChatDbContext> options) : DbContext(options)
{
    public DbSet<global::SocialLight.Chat.Domain.Chat> Chats => Set<global::SocialLight.Chat.Domain.Chat>();
    public DbSet<ChatParticipant> ChatParticipants => Set<ChatParticipant>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageReadReceipt> MessageReadReceipts => Set<MessageReadReceipt>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<ChatBlock> ChatBlocks => Set<ChatBlock>();
    public DbSet<ChatRequest> ChatRequests => Set<ChatRequest>();
    public DbSet<ChatMute> ChatMutes => Set<ChatMute>();
    public DbSet<ChatPin> ChatPins => Set<ChatPin>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("chat");
        builder.ApplyConfigurationsFromAssembly(typeof(ChatDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
