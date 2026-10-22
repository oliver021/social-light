namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>EF Core mapping for <c>Appeal</c> (applied by the module DbContext).</summary>
public class AppealConfiguration : IEntityTypeConfiguration<Appeal>
{
    public void Configure(EntityTypeBuilder<Appeal> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Reason).IsRequired();
        builder.Property(x => x.Status).IsRequired();
    }
}
