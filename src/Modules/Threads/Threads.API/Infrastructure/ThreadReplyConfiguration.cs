namespace SocialLight.Threads.API.Infrastructure;

/// <summary>EF Core mapping for <c>ThreadReply</c> (applied by the module DbContext).</summary>
public class ThreadReplyConfiguration : IEntityTypeConfiguration<ThreadReply>
{
    public void Configure(EntityTypeBuilder<ThreadReply> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Body).IsRequired();
    }
}
