namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>Achievement</c> (applied by the module DbContext).</summary>
public class AchievementConfiguration : IEntityTypeConfiguration<Achievement>
{
    public void Configure(EntityTypeBuilder<Achievement> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because UserAchievement is in this module.
        builder.HasMany(x => x.UserAchievements).WithOne();
    }
}
