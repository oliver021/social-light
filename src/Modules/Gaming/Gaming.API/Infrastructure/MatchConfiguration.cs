namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>Match</c> (applied by the module DbContext).</summary>
public class MatchConfiguration : IEntityTypeConfiguration<Match>
{
    public void Configure(EntityTypeBuilder<Match> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).IsRequired();
    }
}
