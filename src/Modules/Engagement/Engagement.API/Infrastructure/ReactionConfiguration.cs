namespace SocialLight.Engagement.API.Infrastructure;

/// <summary>EF Core mapping for <c>Reaction</c> (applied by the module DbContext).</summary>
public class ReactionConfiguration : IEntityTypeConfiguration<Reaction>
{
    public void Configure(EntityTypeBuilder<Reaction> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetType).IsRequired();
        builder.Property(x => x.ReactionType).IsRequired();
    }
}
