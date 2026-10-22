namespace SocialLight.Posts.API.Infrastructure;

/// <summary>EF Core mapping for <c>Comment</c> (applied by the module DbContext).</summary>
public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Text).IsRequired();
    }
}
