namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>ChatBlock</c> (applied by the module DbContext).</summary>
public class ChatBlockConfiguration : IEntityTypeConfiguration<ChatBlock>
{
    public void Configure(EntityTypeBuilder<ChatBlock> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
