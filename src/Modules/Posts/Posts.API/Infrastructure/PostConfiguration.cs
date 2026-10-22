namespace SocialLight.Posts.API.Infrastructure;

/// <summary>EF Core mapping for <c>Post</c> (applied by the module DbContext).</summary>
public class PostConfiguration : IEntityTypeConfiguration<Post>
{
    public void Configure(EntityTypeBuilder<Post> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ContentType).IsRequired();
        builder.Property(x => x.Visibility).IsRequired();
        builder.Property(x => x.Status).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because PostMedia is in this module.
        builder.HasMany(x => x.PostMedias).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because PostFeed is in this module.
        builder.HasMany(x => x.PostFeeds).WithOne();
    }
}
