namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>MessageReadReceipt</c> (applied by the module DbContext).</summary>
public class MessageReadReceiptConfiguration : IEntityTypeConfiguration<MessageReadReceipt>
{
    public void Configure(EntityTypeBuilder<MessageReadReceipt> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
