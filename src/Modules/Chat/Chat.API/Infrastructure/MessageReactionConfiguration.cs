namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>MessageReaction</c> (applied by the module DbContext).</summary>
public class MessageReactionConfiguration : IEntityTypeConfiguration<MessageReaction>
{
    public void Configure(EntityTypeBuilder<MessageReaction> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ReactionType).IsRequired();
    }
}
