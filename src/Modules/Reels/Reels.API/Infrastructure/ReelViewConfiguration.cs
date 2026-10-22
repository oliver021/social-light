namespace SocialLight.Reels.API.Infrastructure;

/// <summary>EF Core mapping for <c>ReelView</c> (applied by the module DbContext).</summary>
public class ReelViewConfiguration : IEntityTypeConfiguration<ReelView>
{
    public void Configure(EntityTypeBuilder<ReelView> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
