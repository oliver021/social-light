namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>ChatMute</c> (applied by the module DbContext).</summary>
public class ChatMuteConfiguration : IEntityTypeConfiguration<ChatMute>
{
    public void Configure(EntityTypeBuilder<ChatMute> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
