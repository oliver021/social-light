using SocialLight.EventBus.Abstractions;
using SocialLight.Identity.API.IntegrationEvents;

namespace SocialLight.Identity.API;

/// <summary>
/// Minimal JSON account-management endpoints so clients (web, native, acceptance
/// test) can register and delete accounts without the MVC Razor flow.
/// </summary>
public static class AccountApi
{
    public static IEndpointRouteBuilder MapAccountApi(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/account/register", Register)
            .AllowAnonymous()
            .WithName("Register")
            .WithTags("Account");

        app.MapPost("/api/account/delete", DeleteAccount)
            .AllowAnonymous()
            .WithName("DeleteAccount")
            .WithTags("Account");

        return app;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        IEventBus eventBus)
    {
        if (await userManager.FindByEmailAsync(request.Email) is not null)
        {
            return Results.Conflict(new { message = "A user with that email already exists." });
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            Name = request.DisplayName,
            // Vestigial eShop columns are still [Required]/NOT NULL on AspNetUsers
            // (inherited migration). Set empty defaults until ApplicationUser is
            // trimmed for social + a migration drops them (Phase 0 cleanup).
            LastName = string.Empty,
            CardNumber = string.Empty,
            SecurityNumber = string.Empty,
            Expiration = string.Empty,
            CardHolderName = string.Empty,
            Street = string.Empty,
            City = string.Empty,
            State = string.Empty,
            Country = string.Empty,
            ZipCode = string.Empty,
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(
                result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));
        }

        await eventBus.PublishAsync(new UserRegistered(user.Id, user.Email!, request.DisplayName));

        return Results.Created($"/api/account/{user.Id}", new { user.Id, user.Email });
    }

    private static async Task<IResult> DeleteAccount(
        DeleteAccountRequest request,
        UserManager<ApplicationUser> userManager,
        IEventBus eventBus)
    {
        var user = await userManager.FindByIdAsync(request.UserId);
        if (user is null)
        {
            return Results.NotFound(new { message = "User not found." });
        }

        if (!await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Results.Problem(statusCode: 401, detail: "Invalid credentials.");
        }

        var deleteResult = await userManager.DeleteAsync(user);
        if (!deleteResult.Succeeded)
        {
            return Results.ValidationProblem(
                deleteResult.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));
        }

        await eventBus.PublishAsync(new UserDeleted(user.Id, user.Email!));

        return Results.NoContent();
    }
}

public record RegisterRequest(string Email, string Password, string DisplayName);
public record DeleteAccountRequest(string UserId, string Password);
