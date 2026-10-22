namespace SocialLight.Posts.API.Infrastructure;

/// <summary>EF Core mapping for <c>Post</c> (applied by the module DbContext).</summary>
public class PostConfiguration : IEntityTypeConfiguration<Post>
{
    public void Configure(EntityTypeBuilder<Post> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Comment is in this module.
        builder.HasMany(x => x.Comments).WithOne();
    }
}
