namespace SocialLight.Stories.API.Infrastructure;

/// <summary>EF Core mapping for <c>StoryView</c> (applied by the module DbContext).</summary>
public class StoryViewConfiguration : IEntityTypeConfiguration<StoryView>
{
    public void Configure(EntityTypeBuilder<StoryView> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
