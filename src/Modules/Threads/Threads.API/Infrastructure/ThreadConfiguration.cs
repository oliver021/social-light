namespace SocialLight.Threads.API.Infrastructure;

/// <summary>EF Core mapping for <c>Thread</c> (applied by the module DbContext).</summary>
public class ThreadConfiguration : IEntityTypeConfiguration<global::SocialLight.Threads.Domain.Thread>
{
    public void Configure(EntityTypeBuilder<global::SocialLight.Threads.Domain.Thread> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).IsRequired();
        builder.Property(x => x.Body).IsRequired();
        builder.Property(x => x.Visibility).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because ThreadReply is in this module.
        builder.HasMany(x => x.ThreadReplys).WithOne();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because ThreadSubscription is in this module.
        builder.HasMany(x => x.ThreadSubscriptions).WithOne();
    }
}
