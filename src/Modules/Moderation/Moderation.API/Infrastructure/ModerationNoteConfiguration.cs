namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>EF Core mapping for <c>ModerationNote</c> (applied by the module DbContext).</summary>
public class ModerationNoteConfiguration : IEntityTypeConfiguration<ModerationNote>
{
    public void Configure(EntityTypeBuilder<ModerationNote> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Note).IsRequired();
    }
}
