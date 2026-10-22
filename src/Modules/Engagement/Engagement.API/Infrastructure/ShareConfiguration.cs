namespace SocialLight.Engagement.API.Infrastructure;

/// <summary>EF Core mapping for <c>Share</c> (applied by the module DbContext).</summary>
public class ShareConfiguration : IEntityTypeConfiguration<Share>
{
    public void Configure(EntityTypeBuilder<Share> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetType).IsRequired();
    }
}
