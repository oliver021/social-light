namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>ChatParticipant</c> (applied by the module DbContext).</summary>
public class ChatParticipantConfiguration : IEntityTypeConfiguration<ChatParticipant>
{
    public void Configure(EntityTypeBuilder<ChatParticipant> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Role).IsRequired();
    }
}
