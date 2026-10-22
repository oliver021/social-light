namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>Chat</c> (applied by the module DbContext).</summary>
public class ChatConfiguration : IEntityTypeConfiguration<global::SocialLight.Chat.Domain.Chat>
{
    public void Configure(EntityTypeBuilder<global::SocialLight.Chat.Domain.Chat> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Type).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because ChatParticipant is in this module.
        builder.HasMany(x => x.ChatParticipants).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Message is in this module.
        builder.HasMany(x => x.Messages).WithOne();
    }
}
