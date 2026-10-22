namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>Game</c> (applied by the module DbContext).</summary>
public class GameConfiguration : IEntityTypeConfiguration<Game>
{
    public void Configure(EntityTypeBuilder<Game> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Type).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Achievement is in this module.
        builder.HasMany(x => x.Achievements).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Tournament is in this module.
        builder.HasMany(x => x.Tournaments).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Team is in this module.
        builder.HasMany(x => x.Teams).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Match is in this module.
        builder.HasMany(x => x.Matchs).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Leaderboard is in this module.
        builder.HasMany(x => x.Leaderboards).WithOne();
    }
}
