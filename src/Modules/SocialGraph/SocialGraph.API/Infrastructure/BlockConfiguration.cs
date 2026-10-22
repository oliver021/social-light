namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>EF Core mapping for <c>Block</c> (applied by the module DbContext).</summary>
public class BlockConfiguration : IEntityTypeConfiguration<Block>
{
    public void Configure(EntityTypeBuilder<Block> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
