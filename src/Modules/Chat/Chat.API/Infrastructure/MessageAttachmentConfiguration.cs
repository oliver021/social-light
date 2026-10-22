namespace SocialLight.Chat.API.Infrastructure;

/// <summary>EF Core mapping for <c>MessageAttachment</c> (applied by the module DbContext).</summary>
public class MessageAttachmentConfiguration : IEntityTypeConfiguration<MessageAttachment>
{
    public void Configure(EntityTypeBuilder<MessageAttachment> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.FileUrl).IsRequired();
        builder.Property(x => x.MediaType).IsRequired();
    }
}
