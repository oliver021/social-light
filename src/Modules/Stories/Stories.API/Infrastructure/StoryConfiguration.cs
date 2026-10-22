namespace SocialLight.Stories.API.Infrastructure;

/// <summary>EF Core mapping for <c>Story</c> (applied by the module DbContext).</summary>
public class StoryConfiguration : IEntityTypeConfiguration<Story>
{
    public void Configure(EntityTypeBuilder<Story> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.MediaType).IsRequired();
        builder.Property(x => x.MediaUrl).IsRequired();
        builder.Property(x => x.Visibility).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because StoryView is in this module.
        builder.HasMany(x => x.StoryViews).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because StoryReply is in this module.
        builder.HasMany(x => x.StoryReplys).WithOne();
    }
}
