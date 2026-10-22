namespace SocialLight.Profile.API.Infrastructure;

/// <summary>
/// DbContext for the Profile service — owns the "profile" schema only. No
/// cross-module foreign keys or joins (DESIGN-STRATEGY.md §4); a user is just an
/// opaque id here. Keyed by <see cref="UserProfile.UserId"/> (the Identity sub).
/// </summary>
public class ProfileDbContext(DbContextOptions<ProfileDbContext> options) : DbContext(options)
{
    public DbSet<UserProfile> Profiles => Set<UserProfile>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("profile");

        builder.Entity<UserProfile>(profile =>
        {
            profile.HasKey(p => p.UserId);
            profile.Property(p => p.UserId).ValueGeneratedNever();
            profile.Property(p => p.DisplayName).HasMaxLength(100).IsRequired();
            profile.Property(p => p.Handle).HasMaxLength(50);
            profile.HasIndex(p => p.Handle).IsUnique();
            profile.Property(p => p.Bio).HasMaxLength(500);
            profile.Property(p => p.AvatarUrl).HasMaxLength(2048);
            profile.Property(p => p.Location).HasMaxLength(100);
        });

        base.OnModelCreating(builder);
    }
}
