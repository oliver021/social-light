namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>UserAchievement</c> (applied by the module DbContext).</summary>
public class UserAchievementConfiguration : IEntityTypeConfiguration<UserAchievement>
{
    public void Configure(EntityTypeBuilder<UserAchievement> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
