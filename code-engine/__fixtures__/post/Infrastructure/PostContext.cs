using Microsoft.EntityFrameworkCore;
using socialLight.Posts.API.Model;

namespace socialLight.Posts.API.Infrastructure;

// EF Core DbContext (Npgsql / Postgres — see CLAUDE.md §2). Owns its own schema.
public class PostContext(DbContextOptions<PostContext> options) : DbContext(options)
{
    public DbSet<Post> Posts => Set<Post>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<Post>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Content).IsRequired();
        });

        base.OnModelCreating(builder);
    }
}
