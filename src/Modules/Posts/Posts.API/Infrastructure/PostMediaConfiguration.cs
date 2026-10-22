namespace SocialLight.Posts.API.Infrastructure;

/// <summary>EF Core mapping for <c>PostMedia</c> (applied by the module DbContext).</summary>
public class PostMediaConfiguration : IEntityTypeConfiguration<PostMedia>
{
    public void Configure(EntityTypeBuilder<PostMedia> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.FileUrl).IsRequired();
        builder.Property(x => x.MediaType).IsRequired();
    }
}
