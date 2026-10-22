namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>ChatRequest</c> (applied by the module DbContext).</summary>
public class ChatRequestConfiguration : IEntityTypeConfiguration<ChatRequest>
{
    public void Configure(EntityTypeBuilder<ChatRequest> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).IsRequired();
    }
}
