namespace SocialLight.Posts.API.Infrastructure;

/// <summary>EF Core mapping for <c>PostFeed</c> (applied by the module DbContext).</summary>
public class PostFeedConfiguration : IEntityTypeConfiguration<PostFeed>
{
    public void Configure(EntityTypeBuilder<PostFeed> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.FeedType).IsRequired();
    }
}
