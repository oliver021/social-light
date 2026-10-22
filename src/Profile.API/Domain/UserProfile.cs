namespace SocialLight.Profile.API.Domain;

/// <summary>
/// A user's social profile, keyed by their Identity <c>sub</c> (<see cref="UserId"/>).
/// This is hand-written domain logic, not generated boilerplate — profiles carry
/// product rules (e.g. a profile is created on first edit) that the engine doesn't
/// template. Other modules reference a user only by that opaque id.
/// </summary>
public class UserProfile
{
    public Guid UserId { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string? Handle { get; private set; }
    public string? Bio { get; private set; }
    public string? AvatarUrl { get; private set; }
    public string? Location { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private UserProfile() { } // EF

    public UserProfile(Guid userId, string displayName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(displayName);
        UserId = userId;
        DisplayName = displayName;
        CreatedAt = UpdatedAt = DateTime.UtcNow;
    }

    public void Edit(string displayName, string? bio, string? avatarUrl, string? location, string? handle)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(displayName);
        DisplayName = displayName;
        Bio = bio;
        AvatarUrl = avatarUrl;
        Location = location;
        Handle = handle;
        UpdatedAt = DateTime.UtcNow;
    }
}
