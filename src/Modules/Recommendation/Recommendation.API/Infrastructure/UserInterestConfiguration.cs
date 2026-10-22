namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>EF Core mapping for <c>UserInterest</c> (applied by the module DbContext).</summary>
public class UserInterestConfiguration : IEntityTypeConfiguration<UserInterest>
{
    public void Configure(EntityTypeBuilder<UserInterest> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
