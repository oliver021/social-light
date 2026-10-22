using Duende.IdentityServer.Models;
using Duende.IdentityServer.Validation;

namespace SocialLight.Identity.API;

/// <summary>
/// Validates the OAuth resource-owner-password (ROPC) grant against ASP.NET Core
/// Identity. Duende doesn't ship one for AspNetIdentity, so we provide it — used by
/// the automated acceptance test (project-acceptance-gate) to log in headlessly.
/// Interactive apps use Authorization Code + PKCE instead.
/// </summary>
public sealed class ResourceOwnerPasswordValidator(
    UserManager<ApplicationUser> userManager) : IResourceOwnerPasswordValidator
{
    public async Task ValidateAsync(ResourceOwnerPasswordValidationContext context)
    {
        var user = await userManager.FindByNameAsync(context.UserName)
            ?? await userManager.FindByEmailAsync(context.UserName);

        if (user is not null && await userManager.CheckPasswordAsync(user, context.Password))
        {
            // The subject becomes the JWT `sub` — the same id every module binds as
            // the owner of writes (ServiceDefaults GetUserId()).
            context.Result = new GrantValidationResult(
                subject: user.Id,
                authenticationMethod: "pwd");
            return;
        }

        context.Result = new GrantValidationResult(
            TokenRequestErrors.InvalidGrant, "Invalid username or password.");
    }
}
