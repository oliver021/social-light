namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>EF Core mapping for <c>ModerationCase</c> (applied by the module DbContext).</summary>
public class ModerationCaseConfiguration : IEntityTypeConfiguration<ModerationCase>
{
    public void Configure(EntityTypeBuilder<ModerationCase> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetType).IsRequired();
        builder.Property(x => x.Status).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because ModerationAction is in this module.
        builder.HasMany(x => x.ModerationActions).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because ModerationNote is in this module.
        builder.HasMany(x => x.ModerationNotes).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because Appeal is in this module.
        builder.HasMany(x => x.Appeals).WithOne();
    }
}
