namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>EF Core mapping for <c>Follow</c> (applied by the module DbContext).</summary>
public class FollowConfiguration : IEntityTypeConfiguration<Follow>
{
    public void Configure(EntityTypeBuilder<Follow> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).IsRequired();
    }
}
