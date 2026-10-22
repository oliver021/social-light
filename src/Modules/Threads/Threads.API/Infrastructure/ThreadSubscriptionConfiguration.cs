namespace SocialLight.Threads.API.Infrastructure;

/// <summary>EF Core mapping for <c>ThreadSubscription</c> (applied by the module DbContext).</summary>
public class ThreadSubscriptionConfiguration : IEntityTypeConfiguration<ThreadSubscription>
{
    public void Configure(EntityTypeBuilder<ThreadSubscription> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
