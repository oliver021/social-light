using SocialLight.ClientApp.Models.User;

namespace SocialLight.ClientApp.Services.Identity;

public interface IIdentityService
{
    Task<bool> SignInAsync();

    Task<bool> SignOutAsync();

    Task<UserInfo> GetUserInfoAsync();

    Task<string> GetAuthTokenAsync();
}
