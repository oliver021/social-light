namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>EF Core mapping for <c>Hashtag</c> (applied by the module DbContext).</summary>
public class HashtagConfiguration : IEntityTypeConfiguration<Hashtag>
{
    public void Configure(EntityTypeBuilder<Hashtag> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Tag).IsRequired();
    }
}
