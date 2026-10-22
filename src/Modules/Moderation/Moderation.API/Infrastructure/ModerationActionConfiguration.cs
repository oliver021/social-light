namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>EF Core mapping for <c>ModerationAction</c> (applied by the module DbContext).</summary>
public class ModerationActionConfiguration : IEntityTypeConfiguration<ModerationAction>
{
    public void Configure(EntityTypeBuilder<ModerationAction> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ActionType).IsRequired();
    }
}
