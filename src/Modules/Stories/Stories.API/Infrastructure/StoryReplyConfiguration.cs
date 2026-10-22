namespace SocialLight.Stories.API.Infrastructure;

/// <summary>EF Core mapping for <c>StoryReply</c> (applied by the module DbContext).</summary>
public class StoryReplyConfiguration : IEntityTypeConfiguration<StoryReply>
{
    public void Configure(EntityTypeBuilder<StoryReply> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Body).IsRequired();
    }
}
