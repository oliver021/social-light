namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>ChatPin</c> (applied by the module DbContext).</summary>
public class ChatPinConfiguration : IEntityTypeConfiguration<ChatPin>
{
    public void Configure(EntityTypeBuilder<ChatPin> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
