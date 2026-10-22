namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>Message</c> (applied by the module DbContext).</summary>
public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ContentType).IsRequired();
        builder.Property(x => x.Content).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because MessageReaction is in this module.
        builder.HasMany(x => x.MessageReactions).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because MessageReadReceipt is in this module.
        builder.HasMany(x => x.MessageReadReceipts).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because MessageAttachment is in this module.
        builder.HasMany(x => x.MessageAttachments).WithOne();
    }
}
