namespace SocialLight.Reels.API.Infrastructure;

/// <summary>EF Core mapping for <c>Reel</c> (applied by the module DbContext).</summary>
public class ReelConfiguration : IEntityTypeConfiguration<Reel>
{
    public void Configure(EntityTypeBuilder<Reel> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.VideoUrl).IsRequired();
        builder.Property(x => x.Visibility).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because ReelView is in this module.
        builder.HasMany(x => x.ReelViews).WithOne();
    }
}
