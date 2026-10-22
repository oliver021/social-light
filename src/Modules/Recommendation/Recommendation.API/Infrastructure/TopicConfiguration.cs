namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>EF Core mapping for <c>Topic</c> (applied by the module DbContext).</summary>
public class TopicConfiguration : IEntityTypeConfiguration<Topic>
{
    public void Configure(EntityTypeBuilder<Topic> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired();
    }
}
