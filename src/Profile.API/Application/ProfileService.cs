using Microsoft.Extensions.Logging;

namespace SocialLight.Profile.API.Application;

/// <summary>
/// Application service for profiles. Hand-written product logic: a profile is
/// created on the user's first edit (upsert), so no dependency on a UserRegistered
/// event is required for a user to have a profile.
/// </summary>
public sealed class ProfileService(ProfileDbContext context, ILogger<ProfileService> logger)
{
    public async Task<ProfileDto?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var profile = await context.Profiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        return profile is null ? null : ToDto(profile);
    }

    /// <summary>
    /// Discovery: the most recently created profiles, optionally excluding one user
    /// (the caller). Backs the "people to follow" surface — the social graph has no
    /// directory of its own, so Profile owns who-exists. Capped to keep it cheap.
    /// </summary>
    public async Task<IReadOnlyList<ProfileDto>> ListAsync(Guid? excludeUserId, int take, CancellationToken cancellationToken = default)
    {
        var query = context.Profiles.AsNoTracking();
        if (excludeUserId is { } id) query = query.Where(p => p.UserId != id);
        var profiles = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .ToListAsync(cancellationToken);
        return profiles.Select(ToDto).ToList();
    }

    /// <summary>Create-or-update the caller's profile and return the current state.</summary>
    public async Task<ProfileDto> EditAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var profile = await context.Profiles.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        if (profile is null)
        {
            profile = new UserProfile(userId, request.DisplayName);
            await context.Profiles.AddAsync(profile, cancellationToken);
            logger.LogInformation("Created profile for {UserId}", userId);
        }

        profile.Edit(request.DisplayName, request.Bio, request.AvatarUrl, request.Location, request.Handle);
        await context.SaveChangesAsync(cancellationToken);
        return ToDto(profile);
    }

    private static ProfileDto ToDto(UserProfile p) => new(
        p.UserId, p.DisplayName, p.Handle, p.Bio, p.AvatarUrl, p.Location, p.CreatedAt, p.UpdatedAt);
}
